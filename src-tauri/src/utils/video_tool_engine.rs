use crate::model::video_tool_state::*;
use anyhow::{anyhow, Result};
use std::time::Instant;

pub struct VideoToolEngine;

impl VideoToolEngine {
    pub fn merge_videos<P, L>(
        params: &MergeVideosParams,
        progress_cb: P,
        mut log_cb: L,
    ) -> Result<MergeVideosResult>
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

        if params.input_paths.len() < 2 {
            return Err(anyhow!("至少需要两个视频文件才能合并"));
        }

        log_cb(VideoToolLog {
            task_id: task_id.clone(),
            level: "info".to_string(),
            message: format!("开始合并 {} 个视频文件", params.input_paths.len()),
            timestamp: now_ms(),
        });

        if params.reencode {
            Self::merge_reencode(params, &task_id, start, progress_cb, log_cb)
        } else {
            Self::merge_concat(params, &task_id, start, progress_cb, log_cb)
        }
    }

    fn merge_concat<P, L>(
        params: &MergeVideosParams,
        task_id: &str,
        start: Instant,
        mut progress_cb: P,
        mut log_cb: L,
    ) -> Result<MergeVideosResult>
    where
        P: FnMut(VideoToolProgress),
        L: FnMut(VideoToolLog),
    {
        let now_ms = || {
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis() as u64
        };

        // Write concat list file
        let concat_file = std::env::temp_dir().join("druid_concat_list.txt");
        let mut list_content = String::new();
        for path in &params.input_paths {
            let escaped = path
                .to_string_lossy()
                .replace('\'', "'\\''");
            list_content.push_str(&format!("file '{}'\n", escaped));
        }
        std::fs::write(&concat_file, &list_content)
            .map_err(|e| anyhow!("写入 concat 列表失败: {}", e))?;

        log_cb(VideoToolLog {
            task_id: task_id.to_string(),
            level: "info".to_string(),
            message: "使用 concat demuxer 快速合并模式".to_string(),
            timestamp: now_ms(),
        });

        let mut input = ffmpeg_next::format::input(&concat_file)
            .map_err(|e| anyhow!("打开 concat 输入失败: {}", e))?;

        let mut output = ffmpeg_next::format::output_as(
            &params.output_path,
            &params.output_format,
        )
        .map_err(|e| anyhow!("创建输出失败: {}", e))?;

        // Build stream mapping
        let mut stream_mapping: Vec<Option<usize>> = vec![None; input.nb_streams() as usize];
        let mut out_stream_count: usize = 0;

        for stream in input.streams() {
            let media_type = stream.parameters().medium();
            if media_type == ffmpeg_next::media::Type::Video
                || media_type == ffmpeg_next::media::Type::Audio
            {
                stream_mapping[stream.index()] = Some(out_stream_count);
                out_stream_count += 1;

                let mut out_stream = output
                    .add_stream(None)
                    .map_err(|e| anyhow!("添加输出流失败: {}", e))?;
                out_stream.set_parameters(stream.parameters());
                out_stream.set_time_base(stream.time_base());
            }
        }

        output
            .write_header()
            .map_err(|e| anyhow!("写入输出头失败: {}", e))?;

        let total_inputs = params.input_paths.len();

        for (stream, mut packet) in input.packets() {
            let in_idx = stream.index();
            let out_idx = match stream_mapping.get(in_idx).and_then(|m| *m) {
                Some(idx) => idx,
                None => continue,
            };

            let out_st = output
                .stream(out_idx)
                .ok_or_else(|| anyhow!("输出流索引越界"))?;
            let in_tb = stream.time_base();
            let out_tb = out_st.time_base();
            packet.rescale_ts(in_tb, out_tb);
            packet.set_stream(out_idx);
            packet.set_position(-1);

            packet
                .write_interleaved(&mut output)
                .map_err(|e| anyhow!("写入 packet 失败: {}", e))?;

            // Estimate progress based on timestamp
            let ts = stream.time_base();
            let pts = packet.pts().unwrap_or(0) as f64 * ts.0 as f64 / ts.1 as f64;
            let estimated_progress = (pts / (total_inputs as f64 * 10.0)).min(0.95);

            progress_cb(VideoToolProgress {
                task_id: task_id.to_string(),
                progress: estimated_progress as f32,
                current_step: "merging".to_string(),
                elapsed_ms: start.elapsed().as_millis() as u64,
            });
        }

        output
            .write_trailer()
            .map_err(|e| anyhow!("写入文件尾失败: {}", e))?;

        // Clean up temp file
        let _ = std::fs::remove_file(&concat_file);

        let file_size = std::fs::metadata(&params.output_path)
            .map(|m| m.len())
            .unwrap_or(0);

        progress_cb(VideoToolProgress {
            task_id: task_id.to_string(),
            progress: 1.0,
            current_step: "done".to_string(),
            elapsed_ms: start.elapsed().as_millis() as u64,
        });

        log_cb(VideoToolLog {
            task_id: task_id.to_string(),
            level: "info".to_string(),
            message: format!("合并完成，耗时 {:.1} 秒", start.elapsed().as_secs_f64()),
            timestamp: now_ms(),
        });

        Ok(MergeVideosResult {
            output_path: params.output_path.to_string_lossy().to_string(),
            duration_secs: 0.0,
            file_size_bytes: file_size,
        })
    }

    fn merge_reencode<P, L>(
        params: &MergeVideosParams,
        task_id: &str,
        start: Instant,
        mut progress_cb: P,
        mut log_cb: L,
    ) -> Result<MergeVideosResult>
    where
        P: FnMut(VideoToolProgress),
        L: FnMut(VideoToolLog),
    {
        let now_ms = || {
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis() as u64
        };

        log_cb(VideoToolLog {
            task_id: task_id.to_string(),
            level: "info".to_string(),
            message: "使用重编码合并模式".to_string(),
            timestamp: now_ms(),
        });

        // Open first input to get codec info
        let first_input = ffmpeg_next::format::input(&params.input_paths[0])
            .map_err(|e| anyhow!("打开第一个视频失败: {}", e))?;

        let first_video = first_input
            .streams()
            .best(ffmpeg_next::media::Type::Video)
            .ok_or_else(|| anyhow!("第一个视频未找到视频流"))?;
        let first_audio = first_input
            .streams()
            .best(ffmpeg_next::media::Type::Audio);

        let video_params = first_video.parameters();
        let video_tb = first_video.time_base();

        // Create output
        let mut output = ffmpeg_next::format::output_as(
            &params.output_path,
            &params.output_format,
        )
        .map_err(|e| anyhow!("创建输出失败: {}", e))?;

        let mut out_video = output
            .add_stream(None)
            .map_err(|e| anyhow!("添加视频流失败: {}", e))?;
        out_video.set_parameters(video_params.clone());
        out_video.set_time_base(video_tb);

        let mut has_audio = false;
        if let Some(audio_stream) = first_audio {
            let audio_params = audio_stream.parameters();
            let audio_tb = audio_stream.time_base();
            let mut out_audio = output
                .add_stream(None)
                .map_err(|e| anyhow!("添加音频流失败: {}", e))?;
            out_audio.set_parameters(audio_params);
            out_audio.set_time_base(audio_tb);
            has_audio = true;
        }

        output
            .write_header()
            .map_err(|e| anyhow!("写入输出头失败: {}", e))?;

        let total = params.input_paths.len();

        for (i, input_path) in params.input_paths.iter().enumerate() {
            log_cb(VideoToolLog {
                task_id: task_id.to_string(),
                level: "info".to_string(),
                message: format!("处理第 {}/{} 个文件", i + 1, total),
                timestamp: now_ms(),
            });

            let mut input = ffmpeg_next::format::input(input_path)
                .map_err(|e| anyhow!("打开视频 {} 失败: {}", input_path.display(), e))?;

            for (stream, mut packet) in input.packets() {
                let media_type = stream.parameters().medium();
                let out_stream_idx = if media_type == ffmpeg_next::media::Type::Video {
                    0
                } else if media_type == ffmpeg_next::media::Type::Audio && has_audio {
                    1
                } else {
                    continue;
                };

                let out_st = output
                    .stream(out_stream_idx)
                    .ok_or_else(|| anyhow!("输出流索引越界"))?;
                let in_tb = stream.time_base();
                let out_tb = out_st.time_base();
                packet.rescale_ts(in_tb, out_tb);
                packet.set_stream(out_stream_idx);
                packet.set_position(-1);

                packet
                    .write_interleaved(&mut output)
                    .map_err(|e| anyhow!("写入 packet 失败: {}", e))?;
            }

            let progress = (i + 1) as f32 / total as f32;
            progress_cb(VideoToolProgress {
                task_id: task_id.to_string(),
                progress,
                current_step: "merging".to_string(),
                elapsed_ms: start.elapsed().as_millis() as u64,
            });
        }

        output
            .write_trailer()
            .map_err(|e| anyhow!("写入文件尾失败: {}", e))?;

        let file_size = std::fs::metadata(&params.output_path)
            .map(|m| m.len())
            .unwrap_or(0);

        progress_cb(VideoToolProgress {
            task_id: task_id.to_string(),
            progress: 1.0,
            current_step: "done".to_string(),
            elapsed_ms: start.elapsed().as_millis() as u64,
        });

        log_cb(VideoToolLog {
            task_id: task_id.to_string(),
            level: "info".to_string(),
            message: format!("合并完成，耗时 {:.1} 秒", start.elapsed().as_secs_f64()),
            timestamp: now_ms(),
        });

        Ok(MergeVideosResult {
            output_path: params.output_path.to_string_lossy().to_string(),
            duration_secs: 0.0,
            file_size_bytes: file_size,
        })
    }

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

        // Determine resolution from first image or user-specified
        let (width, height) = if let Some((w, h)) = params.resolution {
            (w, h)
        } else {
            let first_img = image::open(&params.image_paths[0])
                .map_err(|e| anyhow!("打开第一张图片失败: {}", e))?;
            let mut w = first_img.width();
            let mut h = first_img.height();
            // Ensure even dimensions for video encoding
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

        // Determine video codec based on format
        let codec_name = match params.output_format.as_str() {
            "gif" => "gif",
            _ => {
                // Try to find a suitable H.264 encoder
                if ffmpeg_next::codec::encoder::find_by_name("libx264").is_some() {
                    "libx264"
                } else if ffmpeg_next::codec::encoder::find_by_name("libx264rgb").is_some() {
                    "libx264rgb"
                } else if ffmpeg_next::codec::encoder::find_by_name("libx265").is_some() {
                    "libx265"
                } else if ffmpeg_next::codec::encoder::find_by_name("mpeg4").is_some() {
                    "mpeg4"
                } else {
                    return Err(anyhow!(
                        "未找到可用的视频编码器。请确保已安装包含 libx264 或 libx265 的 FFmpeg。\
                        可以从 https://ffmpeg.org/download.html 下载完整版 FFmpeg。"
                    ));
                }
            }
        };

        // Create output
        let mut output = ffmpeg_next::format::output_as(
            &params.output_path,
            &params.output_format,
        )
        .map_err(|e| anyhow!("创建输出失败: {}", e))?;

        // Add video stream
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

        // Add audio stream if provided
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
            out_audio.set_time_base(atb);

            audio_input = Some(ainput);
        }

        output
            .write_header()
            .map_err(|e| anyhow!("写入输出头失败: {}", e))?;

        // Encode each image as a video frame
        let time_base = ffmpeg_next::Rational::new(1, params.fps as i32);

        // Create SwsContext for RGB24 -> YUV420P conversion
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

            // Create RGB24 frame from image data
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

            // Convert to YUV420P using SwsContext
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
            });

            log_cb(VideoToolLog {
                task_id: task_id.clone(),
                level: "info".to_string(),
                message: format!("已编码 {}/{} 帧", i + 1, total_images),
                timestamp: now_ms(),
            });
        }

        // Flush encoder
        encoder.send_eof().ok();
        let mut encoded_packet = ffmpeg_next::Packet::empty();
        while encoder.receive_packet(&mut encoded_packet).is_ok() {
            encoded_packet.set_stream(0);
            encoded_packet.rescale_ts(time_base, output.stream(0).unwrap().time_base());
            encoded_packet
                .write_interleaved(&mut output)
                .map_err(|e| anyhow!("写入视频 packet 失败: {}", e))?;
        }

        // Mux audio if provided
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

    pub fn convert_format<P, L>(
        params: &ConvertFormatParams,
        mut progress_cb: P,
        mut log_cb: L,
    ) -> Result<ConvertFormatResult>
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

        log_cb(VideoToolLog {
            task_id: task_id.clone(),
            level: "info".to_string(),
            message: format!("开始格式转换: {}", params.input_path.display()),
            timestamp: now_ms(),
        });

        let mut input = ffmpeg_next::format::input(&params.input_path)
            .map_err(|e| anyhow!("打开输入文件失败: {}", e))?;

        let is_audio_only = matches!(params.target, ConversionTarget::AudioFormat(_));

        let format_str = match &params.target {
            ConversionTarget::VideoFormat(f) => f.clone(),
            ConversionTarget::AudioFormat(f) => f.clone(),
        };

        let mut output = ffmpeg_next::format::output_as(&params.output_path, &format_str)
            .map_err(|e| anyhow!("创建输出失败: {}", e))?;

        // Build stream mapping
        let mut stream_mapping: Vec<Option<usize>> = vec![None; input.nb_streams() as usize];
        let mut out_stream_count: usize = 0;

        for stream in input.streams() {
            let media_type = stream.parameters().medium();

            if is_audio_only {
                // Only map audio streams
                if media_type == ffmpeg_next::media::Type::Audio {
                    stream_mapping[stream.index()] = Some(out_stream_count);
                    out_stream_count += 1;

                    let mut out_stream = output
                        .add_stream(None)
                        .map_err(|e| anyhow!("添加音频流失败: {}", e))?;
                    out_stream.set_parameters(stream.parameters());
                    out_stream.set_time_base(stream.time_base());
                }
            } else {
                // Map video and audio streams
                if media_type == ffmpeg_next::media::Type::Video
                    || media_type == ffmpeg_next::media::Type::Audio
                {
                    stream_mapping[stream.index()] = Some(out_stream_count);
                    out_stream_count += 1;

                    let mut out_stream = output
                        .add_stream(None)
                        .map_err(|e| anyhow!("添加流失败: {}", e))?;
                    out_stream.set_parameters(stream.parameters());
                    out_stream.set_time_base(stream.time_base());
                }
            }
        }

        if out_stream_count == 0 {
            return Err(anyhow!(
                if is_audio_only {
                    "输入文件中未找到音频流"
                } else {
                    "输入文件中未找到视频或音频流"
                }
            ));
        }

        output
            .write_header()
            .map_err(|e| anyhow!("写入输出头失败: {}", e))?;

        let input_duration = input.duration() as f64 / 1_000_000.0;

        for (stream, mut packet) in input.packets() {
            let in_idx = stream.index();
            let out_idx = match stream_mapping.get(in_idx).and_then(|m| *m) {
                Some(idx) => idx,
                None => continue,
            };

            let out_st = output
                .stream(out_idx)
                .ok_or_else(|| anyhow!("输出流索引越界"))?;
            let in_tb = stream.time_base();
            let out_tb = out_st.time_base();
            packet.rescale_ts(in_tb, out_tb);
            packet.set_stream(out_idx);
            packet.set_position(-1);

            packet
                .write_interleaved(&mut output)
                .map_err(|e| anyhow!("写入 packet 失败: {}", e))?;

            // Progress based on timestamp
            if input_duration > 0.0 {
                let ts = stream.time_base();
                let pts = packet.pts().unwrap_or(0) as f64 * ts.0 as f64 / ts.1 as f64;
                let progress = (pts / input_duration).min(0.95) as f32;

                progress_cb(VideoToolProgress {
                    task_id: task_id.clone(),
                    progress,
                    current_step: "converting".to_string(),
                    elapsed_ms: start.elapsed().as_millis() as u64,
                });
            }
        }

        output
            .write_trailer()
            .map_err(|e| anyhow!("写入文件尾失败: {}", e))?;

        let file_size = std::fs::metadata(&params.output_path)
            .map(|m| m.len())
            .unwrap_or(0);

        progress_cb(VideoToolProgress {
            task_id: task_id.clone(),
            progress: 1.0,
            current_step: "done".to_string(),
            elapsed_ms: start.elapsed().as_millis() as u64,
        });

        log_cb(VideoToolLog {
            task_id: task_id.clone(),
            level: "info".to_string(),
            message: format!(
                "转换完成，文件大小 {}，耗时 {:.1} 秒",
                Self::format_size(file_size),
                start.elapsed().as_secs_f64()
            ),
            timestamp: now_ms(),
        });

        Ok(ConvertFormatResult {
            output_path: params.output_path.to_string_lossy().to_string(),
            file_size_bytes: file_size,
        })
    }

    pub fn check_encoder_availability() -> Vec<(&'static str, bool)> {
        let encoders = ["libx264", "libx264rgb", "libx265", "mpeg4", "gif"];
        encoders
            .iter()
            .map(|&name| {
                let available = ffmpeg_next::codec::encoder::find_by_name(name).is_some();
                (name, available)
            })
            .collect()
    }

    fn format_size(bytes: u64) -> String {
        if bytes < 1024 {
            format!("{} B", bytes)
        } else if bytes < 1024 * 1024 {
            format!("{:.1} KB", bytes as f64 / 1024.0)
        } else if bytes < 1024 * 1024 * 1024 {
            format!("{:.1} MB", bytes as f64 / (1024.0 * 1024.0))
        } else {
            format!("{:.2} GB", bytes as f64 / (1024.0 * 1024.0 * 1024.0))
        }
    }
}
