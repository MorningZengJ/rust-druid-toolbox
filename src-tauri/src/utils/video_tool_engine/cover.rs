use super::common::reset_codec_tag;
use super::VideoToolEngine;
use anyhow::{anyhow, Result};

impl VideoToolEngine {
    /// 从视频中解码一帧并编码为 JPEG，返回 (jpeg_bytes, width, height)
    pub(super) fn generate_jpeg_cover_from_video(
        video_path: &std::path::Path,
    ) -> Result<(Vec<u8>, u32, u32)> {
        let mut input = ffmpeg_next::format::input(video_path)
            .map_err(|e| anyhow!("打开视频文件失败: {}", e))?;

        let stream = input
            .streams()
            .best(ffmpeg_next::media::Type::Video)
            .ok_or_else(|| anyhow!("视频中未找到视频流"))?;

        let stream_index = stream.index();
        let params_ref = stream.parameters();
        let context = ffmpeg_next::codec::context::Context::from_parameters(params_ref)
            .map_err(|e| anyhow!("创建解码上下文失败: {}", e))?;
        let mut decoder = context
            .decoder()
            .video()
            .map_err(|e| anyhow!("创建视频解码器失败: {}", e))?;

        let width = decoder.width();
        let height = decoder.height();

        let duration_ts = stream.duration();
        let time_base = stream.time_base();
        let duration = if duration_ts > 0 {
            duration_ts as f64 * time_base.0 as f64 / time_base.1 as f64
        } else {
            input.duration() as f64 / 1_000_000.0
        };

        if duration >= 2.0 {
            let seek_ts = (1.0 * time_base.1 as f64 / time_base.0 as f64) as i64;
            input.seek(seek_ts, ..i64::MAX).ok();
        }

        let mut scaler = ffmpeg_next::software::scaling::Context::get(
            decoder.format(),
            width,
            height,
            ffmpeg_next::format::Pixel::RGB24,
            width,
            height,
            ffmpeg_next::software::scaling::Flags::BILINEAR,
        )
        .map_err(|e| anyhow!("创建颜色转换上下文失败: {}", e))?;

        let mut decoded_frame = ffmpeg_next::util::frame::video::Video::empty();
        let mut rgb_frame = ffmpeg_next::util::frame::video::Video::empty();

        for (stream, packet) in input.packets() {
            if stream.index() != stream_index {
                continue;
            }
            if decoder.send_packet(&packet).is_err() {
                continue;
            }
            while decoder.receive_frame(&mut decoded_frame).is_ok() {
                if scaler.run(&decoded_frame, &mut rgb_frame).is_err() {
                    continue;
                }

                let data = rgb_frame.data(0);
                let stride = rgb_frame.stride(0);
                let bpp = 3usize;
                let mut pixels = Vec::with_capacity((width * height * 3) as usize);
                for y in 0..height as usize {
                    let row_start = y * stride;
                    let row_end = row_start + width as usize * bpp;
                    if row_end <= data.len() {
                        pixels.extend_from_slice(&data[row_start..row_end]);
                    }
                }

                let img = image::RgbImage::from_raw(width, height, pixels)
                    .ok_or_else(|| anyhow!("创建图片失败"))?;
                let dynamic_img = image::DynamicImage::ImageRgb8(img);
                let mut buf = std::io::Cursor::new(Vec::new());
                dynamic_img
                    .write_to(&mut buf, image::ImageFormat::Jpeg)
                    .map_err(|e| anyhow!("JPEG 编码失败: {}", e))?;

                return Ok((buf.into_inner(), width, height));
            }
        }

        Err(anyhow!("未能从视频中解码任何帧"))
    }

    /// 将 JPEG 封面图以 ATTACHED_PIC 流嵌入视频容器
    pub(super) fn embed_cover_art(
        video_path: &std::path::Path,
        jpeg_data: &[u8],
        cover_width: u32,
        cover_height: u32,
        output_format: &str,
    ) -> Result<()> {
        if matches!(output_format, "flv" | "webm") {
            return Ok(());
        }

        let temp_path = video_path.with_extension("tmp_cover");

        let mut input =
            ffmpeg_next::format::input(video_path).map_err(|e| anyhow!("打开原视频失败: {}", e))?;

        let mut output =
            ffmpeg_next::format::output_as(&temp_path, Self::normalize_format_name(output_format))
                .map_err(|e| anyhow!("创建临时输出失败: {}", e))?;

        let mut stream_mapping: Vec<Option<usize>> = vec![None; input.nb_streams() as usize];
        for stream in input.streams() {
            let idx = stream.index();
            let mut out_stream = output
                .add_stream(None)
                .map_err(|e| anyhow!("添加输出流失败: {}", e))?;
            out_stream.set_parameters(stream.parameters());
            reset_codec_tag(&mut out_stream);
            out_stream.set_time_base(stream.time_base());
            stream_mapping[idx] = Some(output.nb_streams() as usize - 1);
        }

        let mut cover_params = ffmpeg_next::codec::Parameters::new();
        unsafe {
            let ptr = cover_params.as_mut_ptr();
            (*ptr).codec_id = ffmpeg_next::codec::Id::MJPEG.into();
            (*ptr).codec_type = ffmpeg_next::media::Type::Video.into();
            (*ptr).width = cover_width as i32;
            (*ptr).height = cover_height as i32;
        }
        let mut cover_stream = output
            .add_stream(None)
            .map_err(|e| anyhow!("添加封面流失败: {}", e))?;
        cover_stream.set_parameters(cover_params);
        cover_stream.set_time_base(ffmpeg_next::Rational::new(1, 90000));
        reset_codec_tag(&mut cover_stream);
        unsafe {
            (*cover_stream.as_mut_ptr()).disposition =
                ffmpeg_next::format::stream::Disposition::ATTACHED_PIC.bits();
        }
        let cover_stream_index = output.nb_streams() as usize - 1;

        output
            .write_header()
            .map_err(|e| anyhow!("写入输出头失败: {}", e))?;

        for (stream, mut packet) in input.packets() {
            let in_idx = stream.index();
            if let Some(Some(out_idx)) = stream_mapping.get(in_idx) {
                let in_tb = stream.time_base();
                let out_tb = output
                    .stream(*out_idx)
                    .ok_or_else(|| anyhow!("输出流索引越界"))?
                    .time_base();
                packet.rescale_ts(in_tb, out_tb);
                packet.set_stream(*out_idx);
                packet.set_position(-1);
                packet.write_interleaved(&mut output).ok();
            }
        }

        let mut cover_packet = ffmpeg_next::Packet::copy(jpeg_data);
        cover_packet.set_stream(cover_stream_index);
        cover_packet.set_pts(Some(0));
        cover_packet.set_dts(Some(0));
        cover_packet.set_duration(0);
        cover_packet.set_position(-1);
        cover_packet
            .write_interleaved(&mut output)
            .map_err(|e| anyhow!("写入封面图失败: {}", e))?;

        output
            .write_trailer()
            .map_err(|e| anyhow!("写入文件尾失败: {}", e))?;

        drop(input);
        drop(output);
        std::fs::rename(&temp_path, video_path).map_err(|e| anyhow!("替换原文件失败: {}", e))?;

        Ok(())
    }
}
