use super::VideoToolEngine;
use crate::model::video_tool_state::*;
use anyhow::{anyhow, Result};
use std::time::Instant;

impl VideoToolEngine {
    pub fn images_to_video<P, L>(
        params: &ImagesToVideoParams,
        mut progress_cb: P,
        mut log_cb: L,
    ) -> Result<ImagesToVideoResult>
    where
        P: FnMut(VideoToolProgress),
        L: FnMut(VideoToolLog),
    {
        ffmpeg_next::init().map_err(|e| anyhow!("FFmpeg 初始化失败: {}", e))?;

        let task_id = uuid::Uuid::new_v4().to_string();
        let start = Instant::now();
        let now_ms = || {
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis() as u64
        };

        if params.image_paths.is_empty() {
            return Err(anyhow!("至少需要一张图片"));
        }

        let total_images = params.image_paths.len();
        log_cb(VideoToolLog {
            task_id: task_id.clone(),
            level: "info".to_string(),
            message: format!("开始将 {} 张图片转为视频", total_images),
            timestamp: now_ms(),
        });

        let (width, height) = if let Some((w, h)) = params.resolution {
            (w, h)
        } else {
            let first_img = image::open(&params.image_paths[0])
                .map_err(|e| anyhow!("打开第一张图片失败: {}", e))?;
            let mut w = first_img.width();
            let mut h = first_img.height();
            w = w / 2 * 2;
            h = h / 2 * 2;
            (w, h)
        };

        log_cb(VideoToolLog {
            task_id: task_id.clone(),
            level: "info".to_string(),
            message: format!("输出分辨率: {}x{}, FPS: {}", width, height, params.fps),
            timestamp: now_ms(),
        });

        let codec_name = match params.output_format.as_str() {
            "gif" => "gif",
            "flv" => {
                let candidates = ["libx264", "libx264rgb", "flv", "mpeg4"];
                candidates
                    .iter()
                    .find(|&&name| ffmpeg_next::codec::encoder::find_by_name(name).is_some())
                    .copied()
                    .ok_or_else(|| anyhow!("未找到可用的视频编码器"))?
            }
            "webm" => {
                let candidates = ["libvpx", "libvpx-vp9", "libx264"];
                candidates
                    .iter()
                    .find(|&&name| ffmpeg_next::codec::encoder::find_by_name(name).is_some())
                    .copied()
                    .ok_or_else(|| anyhow!("未找到可用的视频编码器"))?
            }
            _ => {
                let candidates = ["libx264", "libx264rgb", "libx265", "mpeg4"];
                candidates
                    .iter()
                    .find(|&&name| ffmpeg_next::codec::encoder::find_by_name(name).is_some())
                    .copied()
                    .ok_or_else(|| anyhow!(
                        "未找到可用的视频编码器。请确保已安装包含 libx264 或 libx265 的 FFmpeg。\
                        可以从 https://ffmpeg.org/download.html 下载完整版 FFmpeg。"
                    ))?
            }
        };

        let mut output = ffmpeg_next::format::output_as(
            &params.output_path,
            Self::normalize_format_name(&params.output_format),
        )
        .map_err(|e| anyhow!("创建输出失败: {}", e))?;

        let codec = ffmpeg_next::codec::encoder::find_by_name(codec_name)
            .ok_or_else(|| anyhow!("未找到编码器: {}", codec_name))?;
        let mut out_video = output
            .add_stream(codec)
            .map_err(|e| anyhow!("添加视频流失败: {}", e))?;
        let mut encoder_ctx =
            ffmpeg_next::codec::context::Context::from_parameters(out_video.parameters())
                .map_err(|e| anyhow!("创建编码上下文失败: {}", e))?
                .encoder()
                .video()
                .map_err(|e| anyhow!("创建视频编码器失败: {}", e))?;
        encoder_ctx.set_width(width);
        encoder_ctx.set_height(height);
        encoder_ctx.set_time_base(ffmpeg_next::Rational::new(1, params.fps as i32));
        encoder_ctx.set_format(ffmpeg_next::format::Pixel::YUV420P);
        if codec_name != "gif" {
            encoder_ctx.set_bit_rate(4_000_000);
        }
        out_video.set_time_base(ffmpeg_next::Rational::new(1, params.fps as i32));

        let mut encoder = encoder_ctx
            .open_as(codec)
            .map_err(|e| anyhow!("打开编码器失败: {}", e))?;
        out_video.set_parameters(&encoder);

        let mut audio_input = None;
        let mut audio_stream_idx = None;
        if let Some(audio_path) = &params.audio_path {
            let ainput = ffmpeg_next::format::input(audio_path)
                .map_err(|e| anyhow!("打开音频文件失败: {}", e))?;
            let astream = ainput
                .streams()
                .best(ffmpeg_next::media::Type::Audio)
                .ok_or_else(|| anyhow!("音频文件中未找到音频流"))?;
            let aparams = astream.parameters();
            let atb = astream.time_base();
            audio_stream_idx = Some(astream.index());

            let mut out_audio = output
                .add_stream(None)
                .map_err(|e| anyhow!("添加音频流失败: {}", e))?;
            out_audio.set_parameters(aparams);
            unsafe {
                let avstream = out_audio.as_mut_ptr();
                (*(*avstream).codecpar).codec_tag = 0;
            }
            out_audio.set_time_base(atb);

            audio_input = Some(ainput);
        }

        output
            .write_header()
            .map_err(|e| anyhow!("写入输出头失败: {}", e))?;

        let time_base = ffmpeg_next::Rational::new(1, params.fps as i32);

        let mut sws_ctx = ffmpeg_next::software::scaling::Context::get(
            ffmpeg_next::format::Pixel::RGB24,
            width,
            height,
            ffmpeg_next::format::Pixel::YUV420P,
            width,
            height,
            ffmpeg_next::software::scaling::Flags::BILINEAR,
        )
        .map_err(|e| anyhow!("创建颜色转换上下文失败: {}", e))?;

        for (i, img_path) in params.image_paths.iter().enumerate() {
            let img = image::open(img_path)
                .map_err(|e| anyhow!("打开图片 {} 失败: {}", img_path.display(), e))?;

            let resized = img.resize_exact(width, height, image::imageops::FilterType::Lanczos3);
            let rgb = resized.to_rgb8();

            let mut rgb_frame = ffmpeg_next::util::frame::video::Video::new(
                ffmpeg_next::format::Pixel::RGB24,
                width,
                height,
            );
            let rgb_data = rgb.as_raw();
            let rgb_stride = (width * 3) as usize;
            for y in 0..height as usize {
                let src_offset = y * rgb_stride;
                let dst_offset = y * rgb_frame.stride(0);
                rgb_frame.data_mut(0)[dst_offset..dst_offset + rgb_stride]
                    .copy_from_slice(&rgb_data[src_offset..src_offset + rgb_stride]);
            }

            let mut yuv_frame = ffmpeg_next::util::frame::video::Video::new(
                ffmpeg_next::format::Pixel::YUV420P,
                width,
                height,
            );
            sws_ctx
                .run(&rgb_frame, &mut yuv_frame)
                .map_err(|e| anyhow!("颜色空间转换失败: {}", e))?;
            yuv_frame.set_pts(Some(i as i64));

            encoder
                .send_frame(&yuv_frame)
                .map_err(|e| anyhow!("发送帧到编码器失败: {}", e))?;

            let mut encoded_packet = ffmpeg_next::Packet::empty();
            while encoder.receive_packet(&mut encoded_packet).is_ok() {
                encoded_packet.set_stream(0);
                encoded_packet.rescale_ts(time_base, output.stream(0).unwrap().time_base());
                encoded_packet
                    .write_interleaved(&mut output)
                    .map_err(|e| anyhow!("写入视频 packet 失败: {}", e))?;
            }

            let progress = (i + 1) as f32 / total_images as f32;
            progress_cb(VideoToolProgress {
                task_id: task_id.clone(),
                progress: progress * 0.9,
                current_step: "encoding".to_string(),
                elapsed_ms: start.elapsed().as_millis() as u64,
                ..Default::default()
            });

            log_cb(VideoToolLog {
                task_id: task_id.clone(),
                level: "info".to_string(),
                message: format!("已编码 {}/{} 帧", i + 1, total_images),
                timestamp: now_ms(),
            });
        }

        encoder.send_eof().ok();
        let mut encoded_packet = ffmpeg_next::Packet::empty();
        while encoder.receive_packet(&mut encoded_packet).is_ok() {
            encoded_packet.set_stream(0);
            encoded_packet.rescale_ts(time_base, output.stream(0).unwrap().time_base());
            encoded_packet
                .write_interleaved(&mut output)
                .map_err(|e| anyhow!("写入视频 packet 失败: {}", e))?;
        }

        if let Some(mut ainput) = audio_input {
            let audio_idx = audio_stream_idx.unwrap();
            log_cb(VideoToolLog {
                task_id: task_id.clone(),
                level: "info".to_string(),
                message: "开始混合音频".to_string(),
                timestamp: now_ms(),
            });

            for (stream, mut packet) in ainput.packets() {
                if stream.index() != audio_idx {
                    continue;
                }
                packet.set_stream(1);
                let in_tb = stream.time_base();
                let out_tb = output.stream(1).unwrap().time_base();
                packet.rescale_ts(in_tb, out_tb);
                packet.set_position(-1);
                packet
                    .write_interleaved(&mut output)
                    .map_err(|e| anyhow!("写入音频 packet 失败: {}", e))?;
            }
        }

        output
            .write_trailer()
            .map_err(|e| anyhow!("写入文件尾失败: {}", e))?;

        let file_size = std::fs::metadata(&params.output_path)
            .map(|m| m.len())
            .unwrap_or(0);
        let duration = total_images as f64 / params.fps;

        progress_cb(VideoToolProgress {
            task_id: task_id.clone(),
            progress: 1.0,
            current_step: "done".to_string(),
            elapsed_ms: start.elapsed().as_millis() as u64,
            ..Default::default()
        });

        log_cb(VideoToolLog {
            task_id: task_id.clone(),
            level: "info".to_string(),
            message: format!(
                "完成，共 {} 帧，时长 {:.1} 秒，耗时 {:.1} 秒",
                total_images,
                duration,
                start.elapsed().as_secs_f64()
            ),
            timestamp: now_ms(),
        });

        Ok(ImagesToVideoResult {
            output_path: params.output_path.to_string_lossy().to_string(),
            duration_secs: duration,
            frame_count: total_images as u32,
            file_size_bytes: file_size,
        })
    }
}
