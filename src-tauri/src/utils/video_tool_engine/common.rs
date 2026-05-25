use super::VideoToolEngine;
use anyhow::{anyhow, Result};

/// 获取当前时间戳（毫秒）
pub(super) fn now_ms() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}

/// 根据输出格式查找可用的视频编码器
pub(super) fn find_video_encoder_for_format(format: &str) -> Result<&'static str> {
    let candidates: &[&str] = match format {
        "flv" => &["libx264", "libx264rgb", "flv", "mpeg4"],
        "webm" => &["libvpx", "libvpx-vp9", "libx264"],
        _ => &["libx264", "libx264rgb", "libx265", "mpeg4"],
    };
    candidates
        .iter()
        .find(|&&name| ffmpeg_next::codec::encoder::find_by_name(name).is_some())
        .copied()
        .ok_or_else(move || {
            anyhow!(
                "未找到可用的视频编码器 ({})。请确保已安装包含 libx264 的 FFmpeg。\
                可以从 https://ffmpeg.org/download.html 下载完整版 FFmpeg。",
                format
            )
        })
}

/// 根据音频格式名称查找可用的音频编码器
pub(super) fn find_audio_encoder_for_codec(codec_name: &str) -> Result<&'static str> {
    let candidates: &[&str] = match codec_name {
        "mp3" => &["libmp3lame", "mp3"],
        "aac" => &["aac", "libfdk_aac"],
        "wav" => &["pcm_s16le"],
        "flac" => &["flac"],
        "ogg" => &["libvorbis", "vorbis"],
        "opus" => &["libopus", "opus"],
        "alac" => &["alac"],
        "ac3" => &["ac3"],
        _ => {
            // 直接尝试使用传入的编码器名称
            return if ffmpeg_next::codec::encoder::find_by_name(codec_name).is_some() {
                // 从已知静态列表中查找匹配项
                let all_known = &["libmp3lame", "mp3", "aac", "libfdk_aac", "pcm_s16le",
                    "flac", "libvorbis", "vorbis", "libopus", "opus", "alac", "ac3"];
                all_known.iter().find(|&&n| n == codec_name).copied()
                    .ok_or_else(|| anyhow!("编码器 '{}' 存在但不在已知列表中", codec_name))
            } else {
                Err(anyhow!("未找到可用的音频编码器: {}", codec_name))
            };
        }
    };
    candidates
        .iter()
        .find(|&&name| ffmpeg_next::codec::encoder::find_by_name(name).is_some())
        .copied()
        .ok_or_else(|| anyhow!("未找到可用的音频编码器: {}", codec_name))
}

/// 重置输出流的 codec_tag，避免容器格式兼容性问题
pub(super) fn reset_codec_tag(stream: &mut ffmpeg_next::format::stream::StreamMut) {
    unsafe {
        let avstream = stream.as_mut_ptr();
        (*(*avstream).codecpar).codec_tag = 0;
    }
}

impl VideoToolEngine {
    /// 计算保持宽高比的缩放尺寸，返回 (缩放后宽度, 缩放后高度)
    pub(super) fn calculate_aspect_ratio_resize(
        src_width: u32,
        src_height: u32,
        target_width: u32,
        target_height: u32,
    ) -> (u32, u32) {
        if src_width == 0 || src_height == 0 {
            return (target_width, target_height);
        }

        let src_ratio = src_width as f64 / src_height as f64;
        let target_ratio = target_width as f64 / target_height as f64;

        let (scaled_width, scaled_height) = if src_ratio > target_ratio {
            let scaled_height = (target_width as f64 / src_ratio) as u32;
            (target_width, scaled_height.max(1))
        } else {
            let scaled_width = (target_height as f64 * src_ratio) as u32;
            (scaled_width.max(1), target_height)
        };

        (scaled_width / 2 * 2, scaled_height / 2 * 2)
    }

    /// 查询编码器支持的音频参数，返回 (最佳采样格式, 最佳采样率, 最佳声道布局)
    /// 若编码器未限制某项则回退到解码器参数
    pub(super) fn query_audio_encoder_params(
        enc_codec: &ffmpeg_next::Codec,
        dec_format: ffmpeg_next::format::Sample,
        dec_rate: u32,
        dec_channels: u16,
    ) -> (ffmpeg_next::format::Sample, u32, ffmpeg_next::channel_layout::ChannelLayout) {
        let audio_codec = enc_codec.audio().ok();

        // 采样格式：优先匹配解码器格式，否则取编码器支持的第一个
        let format = if let Some(ref codec) = audio_codec {
            if let Some(formats) = codec.formats() {
                let supported: Vec<ffmpeg_next::format::Sample> = formats.collect();
                if supported.contains(&dec_format) {
                    dec_format
                } else {
                    supported.into_iter().next().unwrap_or(dec_format)
                }
            } else {
                dec_format
            }
        } else {
            dec_format
        };

        // 采样率：优先匹配解码器速率，否则取编码器支持的最近值
        let rate = if let Some(ref codec) = audio_codec {
            if let Some(rates) = codec.rates() {
                let supported: Vec<i32> = rates.collect();
                if supported.is_empty() {
                    dec_rate
                } else if supported.contains(&(dec_rate as i32)) {
                    dec_rate
                } else {
                    supported
                        .into_iter()
                        .min_by_key(|r| (*r - dec_rate as i32).unsigned_abs())
                        .map(|r| r as u32)
                        .unwrap_or(dec_rate)
                }
            } else {
                dec_rate
            }
        } else {
            dec_rate
        };

        // 声道布局：优先匹配解码器声道数
        let ch_layout = if let Some(ref codec) = audio_codec {
            if let Some(layouts) = codec.channel_layouts() {
                layouts.best(dec_channels as i32)
            } else if dec_channels >= 2 {
                ffmpeg_next::channel_layout::ChannelLayout::STEREO
            } else {
                ffmpeg_next::channel_layout::ChannelLayout::MONO
            }
        } else if dec_channels >= 2 {
            ffmpeg_next::channel_layout::ChannelLayout::STEREO
        } else {
            ffmpeg_next::channel_layout::ChannelLayout::MONO
        };

        (format, rate, ch_layout)
    }

    pub(super) fn is_audio_compatible(codec_id: ffmpeg_next::codec::Id, output_format: &str) -> bool {
        match output_format {
            "flv" => matches!(
                codec_id,
                ffmpeg_next::codec::Id::MP3
                    | ffmpeg_next::codec::Id::AAC
                    | ffmpeg_next::codec::Id::ADPCM_SWF
                    | ffmpeg_next::codec::Id::PCM_S16LE
            ),
            "webm" => matches!(
                codec_id,
                ffmpeg_next::codec::Id::OPUS | ffmpeg_next::codec::Id::VORBIS
            ),
            _ => true,
        }
    }

    /// 约束 timebase 以满足编码器限制（如 MPEG4 要求分母 ≤ 65535）
    pub(super) fn constrain_timebase(tb: ffmpeg_next::Rational) -> ffmpeg_next::Rational {
        let max_den: i32 = 65535;
        if tb.1 <= max_den {
            return tb;
        }
        let a = tb.0.unsigned_abs();
        let b = tb.1.unsigned_abs();
        let g = Self::gcd(a, b);
        let mut num = (a / g) as i32;
        let mut den = (b / g) as i32;
        while den > max_den {
            num = (num as f64 * max_den as f64 / den as f64).round() as i32;
            den = max_den;
            if num <= 0 {
                num = 1;
            }
        }
        ffmpeg_next::Rational::new(num, den)
    }

    pub(super) fn gcd(mut a: u32, mut b: u32) -> u32 {
        while b != 0 {
            let t = b;
            b = a % b;
            a = t;
        }
        a
    }

    /// 将文件扩展名映射为 FFmpeg 标准格式名
    pub(super) fn normalize_format_name(ext: &str) -> &str {
        match ext {
            "mkv" => "matroska",
            "ts" => "mpegts",
            "m4v" => "mp4",
            other => other,
        }
    }

    /// 检测输入文件是否为 MPEG-TS 格式（ts/m2ts/mts/trp）
    pub(super) fn is_ts_format(path: &std::path::Path) -> bool {
        let Ok(input) = ffmpeg_next::format::input(path) else {
            return false;
        };
        let format_name = input.format().name().to_lowercase();
        let ts_names = ["mpegts", "mpeg_ts", "m2ts", "trp", "ts"];
        ts_names.iter().any(|&name| format_name.contains(name))
    }

    /// 从视频中解码一帧并编码为 JPEG，返回 (jpeg_bytes, width, height)
    pub(super) fn generate_jpeg_cover_from_video(video_path: &std::path::Path) -> Result<(Vec<u8>, u32, u32)> {
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

        let mut input = ffmpeg_next::format::input(video_path)
            .map_err(|e| anyhow!("打开原视频失败: {}", e))?;

        let mut output = ffmpeg_next::format::output_as(&temp_path, Self::normalize_format_name(output_format))
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
        std::fs::rename(&temp_path, video_path)
            .map_err(|e| anyhow!("替换原文件失败: {}", e))?;

        Ok(())
    }

    /// Parse a bitrate string like "5M", "2000k", "1500000" to bits/sec
    pub(super) fn parse_bitrate(s: &str) -> Option<usize> {
        let s = s.trim();
        if s.is_empty() {
            return None;
        }
        let (num_str, multiplier) = if let Some(n) = s.strip_suffix('M').or_else(|| s.strip_suffix('m')) {
            (n, 1_000_000)
        } else if let Some(n) = s.strip_suffix('K').or_else(|| s.strip_suffix('k')) {
            (n, 1_000)
        } else {
            (s, 1)
        };
        let value: f64 = num_str.parse().ok()?;
        Some((value * multiplier as f64) as usize)
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

    pub(super) fn format_size(bytes: u64) -> String {
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

    /// 编码视频帧并写入输出（frame 为 None 时发送 EOF）
    pub(super) fn encode_and_write(
        encoder: &mut ffmpeg_next::codec::encoder::video::Encoder,
        frame: Option<&ffmpeg_next::frame::Video>,
        output: &mut ffmpeg_next::format::context::Output,
        enc_tb: ffmpeg_next::Rational,
    ) -> Result<()> {
        if let Some(f) = frame {
            encoder
                .send_frame(f)
                .map_err(|e| anyhow!("发送帧到编码器失败: {}", e))?;
        } else {
            encoder
                .send_eof()
                .map_err(|e| anyhow!("发送 EOF 到编码器失败: {}", e))?;
        }
        let mut encoded_packet = ffmpeg_next::Packet::empty();
        while encoder.receive_packet(&mut encoded_packet).is_ok() {
            encoded_packet.set_stream(0);
            let out_tb = output
                .stream(0)
                .ok_or_else(|| anyhow!("输出流索引越界"))?
                .time_base();
            encoded_packet.rescale_ts(enc_tb, out_tb);
            encoded_packet
                .write_interleaved(output)
                .map_err(|e| anyhow!("写入视频 packet 失败: {}", e))?;
        }
        Ok(())
    }

    /// 创建 YUV420P 帧并填充黑边
    pub(super) fn scale_and_pad_frame(
        decoded: &ffmpeg_next::frame::Video,
        sws_ctx: &mut ffmpeg_next::software::scaling::Context,
        width: u32,
        height: u32,
        scaled_width: u32,
        scaled_height: u32,
        x_offset: u32,
        y_offset: u32,
        needs_padding: bool,
    ) -> Result<ffmpeg_next::util::frame::video::Video> {
        let mut yuv_frame = ffmpeg_next::util::frame::video::Video::new(
            ffmpeg_next::format::Pixel::YUV420P,
            width,
            height,
        );

        if needs_padding {
            let mut scaled_frame = ffmpeg_next::util::frame::video::Video::new(
                ffmpeg_next::format::Pixel::YUV420P,
                scaled_width,
                scaled_height,
            );
            sws_ctx
                .run(decoded, &mut scaled_frame)
                .map_err(|e| anyhow!("颜色空间转换失败: {}", e))?;

            let src_y_linesize = scaled_frame.stride(0);
            let src_u_linesize = scaled_frame.stride(1);
            let src_v_linesize = scaled_frame.stride(2);
            let dst_y_linesize = yuv_frame.stride(0);
            let dst_u_linesize = yuv_frame.stride(1);
            let dst_v_linesize = yuv_frame.stride(2);

            for row in 0..height as usize {
                let dst_start = row * dst_y_linesize;
                yuv_frame.data_mut(0)[dst_start..dst_start + width as usize].fill(0);
            }
            for row in 0..(height / 2) as usize {
                let dst_start = row * dst_u_linesize;
                yuv_frame.data_mut(1)[dst_start..dst_start + (width / 2) as usize].fill(128);
            }
            for row in 0..(height / 2) as usize {
                let dst_start = row * dst_v_linesize;
                yuv_frame.data_mut(2)[dst_start..dst_start + (width / 2) as usize].fill(128);
            }

            for row in 0..scaled_height as usize {
                let src_start = row * src_y_linesize;
                let dst_start = (row + y_offset as usize) * dst_y_linesize + x_offset as usize;
                let src_row = &scaled_frame.data(0)[src_start..src_start + scaled_width as usize];
                let dst_row = &mut yuv_frame.data_mut(0)[dst_start..dst_start + scaled_width as usize];
                dst_row.copy_from_slice(src_row);
            }

            for row in 0..(scaled_height / 2) as usize {
                let src_start = row * src_u_linesize;
                let dst_start = (row + (y_offset / 2) as usize) * dst_u_linesize + (x_offset / 2) as usize;
                let src_row = &scaled_frame.data(1)[src_start..src_start + (scaled_width / 2) as usize];
                let dst_row = &mut yuv_frame.data_mut(1)[dst_start..dst_start + (scaled_width / 2) as usize];
                dst_row.copy_from_slice(src_row);
            }

            for row in 0..(scaled_height / 2) as usize {
                let src_start = row * src_v_linesize;
                let dst_start = (row + (y_offset / 2) as usize) * dst_v_linesize + (x_offset / 2) as usize;
                let src_row = &scaled_frame.data(2)[src_start..src_start + (scaled_width / 2) as usize];
                let dst_row = &mut yuv_frame.data_mut(2)[dst_start..dst_start + (scaled_width / 2) as usize];
                dst_row.copy_from_slice(src_row);
            }
        } else {
            sws_ctx
                .run(decoded, &mut yuv_frame)
                .map_err(|e| anyhow!("颜色空间转换失败: {}", e))?;
        }

        Ok(yuv_frame)
    }
}
