use super::convert_video_setup::ConvertVideoConfig;
use super::VideoToolEngine;
use crate::model::video_tool_state::*;
use anyhow::{anyhow, Result};
use std::time::Instant;

impl VideoToolEngine {
    pub(super) fn convert_video_reencode<P, L>(
        params: &ConvertFormatParams,
        task_id: &str,
        start: Instant,
        progress_cb: &mut P,
        log_cb: &mut L,
    ) -> Result<ConvertFormatResult>
    where
        P: FnMut(VideoToolProgress),
        L: FnMut(VideoToolLog),
    {
        Self::log_info(log_cb, task_id, "使用重编码转换模式");

        let config = Self::probe_convert_config(params)?;
        Self::log_info(
            log_cb,
            task_id,
            &format!("使用编码器: {}", config.codec_name),
        );

        let (mut output, mut encoder) = Self::setup_convert_output(params, &config)?;

        let input_for_audio = ffmpeg_next::format::input(&params.input_path)
            .map_err(|e| anyhow!("打开输入文件失败: {}", e))?;
        let (has_audio, mut audio_enc, mut audio_dec, mut audio_resampler, audio_info) =
            Self::setup_audio_pipeline(params, &config, &mut output, &input_for_audio)?;
        if let Some(ref msg) = audio_info {
            if has_audio {
                Self::log_info(log_cb, task_id, msg);
            } else {
                Self::log_warn(log_cb, task_id, msg);
            }
        }
        drop(input_for_audio);

        let input_for_cover = ffmpeg_next::format::input(&params.input_path)
            .map_err(|e| anyhow!("打开输入文件失败: {}", e))?;
        let cover_stream_indices =
            Self::setup_convert_cover_streams(&config.format_str, &input_for_cover, &mut output)?;
        let has_cover = !cover_stream_indices.is_empty();
        drop(input_for_cover);

        output
            .write_header()
            .map_err(|e| anyhow!("写入输出头失败: {}", e))?;

        let mut input = ffmpeg_next::format::input(&params.input_path)
            .map_err(|e| anyhow!("打开输入文件失败: {}", e))?;
        let video_stream = input
            .streams()
            .best(ffmpeg_next::media::Type::Video)
            .ok_or_else(|| anyhow!("输入文件未找到视频流"))?;
        let decoder_ctx =
            ffmpeg_next::codec::context::Context::from_parameters(video_stream.parameters())
                .map_err(|e| anyhow!("创建解码上下文失败: {}", e))?;
        let mut decoder = decoder_ctx
            .decoder()
            .video()
            .map_err(|e| anyhow!("创建视频解码器失败: {}", e))?;

        let (scaled_w, scaled_h) = Self::calculate_aspect_ratio_resize(
            decoder.width(),
            decoder.height(),
            config.width,
            config.height,
        );
        let needs_padding = scaled_w != config.width || scaled_h != config.height;
        let x_off = if needs_padding {
            (config.width - scaled_w) / 2
        } else {
            0
        };
        let y_off = if needs_padding {
            (config.height - scaled_h) / 2
        } else {
            0
        };

        // 放大用 LANCZOS（高质量），缩小用 BILINEAR（足够且更快）
        let is_upscale = scaled_w > decoder.width() || scaled_h > decoder.height();
        let scale_algo = if is_upscale {
            ffmpeg_next::software::scaling::Flags::LANCZOS
        } else {
            ffmpeg_next::software::scaling::Flags::BILINEAR
        };
        let mut sws_ctx = ffmpeg_next::software::scaling::Context::get(
            decoder.format(),
            decoder.width(),
            decoder.height(),
            ffmpeg_next::format::Pixel::YUV420P,
            scaled_w,
            scaled_h,
            scale_algo,
        )
        .map_err(|e| anyhow!("创建颜色转换上下文失败: {}", e))?;

        if needs_padding {
            Self::log_info(
                log_cb,
                task_id,
                &format!(
                    "视频分辨率 {}x{} 与目标 {}x{} 不同，保持宽高比缩放至 {}x{} 并添加黑边",
                    decoder.width(),
                    decoder.height(),
                    config.width,
                    config.height,
                    scaled_w,
                    scaled_h
                ),
            );
        }

        let total_frames = {
            let dur_secs = input.duration() as f64 / 1_000_000.0;
            if dur_secs > 0.0 {
                (dur_secs * config.fps) as u64
            } else {
                0
            }
        };

        let mut frame_count: u64 = 0;
        let mut cover_counter: usize = 0;

        // ── 主处理循环 ──
        for (stream, packet) in input.packets() {
            let mt = stream.parameters().medium();

            if mt == ffmpeg_next::media::Type::Video {
                Self::process_convert_video_packet(
                    &packet,
                    &mut decoder,
                    &mut sws_ctx,
                    &mut encoder,
                    &mut output,
                    config.enc_tb,
                    &config,
                    scaled_w,
                    scaled_h,
                    x_off,
                    y_off,
                    needs_padding,
                    &mut frame_count,
                    total_frames,
                    start,
                    task_id,
                    progress_cb,
                    log_cb,
                )?;
            } else if mt == ffmpeg_next::media::Type::Audio && has_audio {
                if let (Some(ref mut dec), Some(ref mut enc)) = (&mut audio_dec, &mut audio_enc) {
                    Self::process_audio_packet(
                        &packet,
                        dec,
                        enc,
                        &mut audio_resampler,
                        &mut output,
                        log_cb,
                        task_id,
                    );
                }
            } else if has_cover {
                Self::try_write_cover(
                    &packet,
                    &stream,
                    mt,
                    &cover_stream_indices,
                    &mut cover_counter,
                    &mut output,
                    log_cb,
                    task_id,
                );
            }
        }

        // ── 刷新视频解码器 ──
        Self::flush_video_decoder_simple(
            &mut decoder,
            &mut sws_ctx,
            &mut encoder,
            &mut output,
            config.enc_tb,
            &config,
            scaled_w,
            scaled_h,
            x_off,
            y_off,
            needs_padding,
            &mut frame_count,
        );

        Self::encode_and_write(&mut encoder, None, &mut output, config.enc_tb)?;

        // ── 刷新音频编码器 ──
        if has_audio {
            Self::flush_audio_encoder(audio_dec, audio_enc, audio_resampler, &mut output);
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
            ..Default::default()
        });

        Self::log_info(
            log_cb,
            task_id,
            &format!(
                "转换完成，共编码 {} 帧，文件大小 {}，耗时 {:.1} 秒",
                frame_count,
                Self::format_size(file_size),
                start.elapsed().as_secs_f64()
            ),
        );

        Ok(ConvertFormatResult {
            output_path: params.output_path.to_string_lossy().to_string(),
            file_size_bytes: file_size,
        })
    }

    /// 处理视频 packet：解码、缩放、编码
    #[allow(clippy::too_many_arguments)]
    fn process_convert_video_packet<P, L>(
        packet: &ffmpeg_next::Packet,
        decoder: &mut ffmpeg_next::codec::decoder::Video,
        sws_ctx: &mut ffmpeg_next::software::scaling::Context,
        encoder: &mut ffmpeg_next::codec::encoder::video::Encoder,
        output: &mut ffmpeg_next::format::context::Output,
        enc_tb: ffmpeg_next::Rational,
        config: &ConvertVideoConfig,
        scaled_w: u32,
        scaled_h: u32,
        x_off: u32,
        y_off: u32,
        needs_padding: bool,
        frame_count: &mut u64,
        total_frames: u64,
        start: Instant,
        task_id: &str,
        progress_cb: &mut P,
        log_cb: &mut L,
    ) -> Result<()>
    where
        P: FnMut(VideoToolProgress),
        L: FnMut(VideoToolLog),
    {
        if let Err(e) = decoder.send_packet(packet) {
            Self::log_warn(log_cb, task_id, &format!("跳过损坏的视频 packet: {}", e));
            return Ok(());
        }
        let mut decoded = ffmpeg_next::frame::Video::empty();
        while decoder.receive_frame(&mut decoded).is_ok() {
            let yuv = Self::scale_and_pad_frame(
                &decoded,
                sws_ctx,
                config.width,
                config.height,
                scaled_w,
                scaled_h,
                x_off,
                y_off,
                needs_padding,
            )?;
            let mut frame = yuv;
            frame.set_pts(Some(*frame_count as i64));
            *frame_count += 1;
            Self::encode_and_write(encoder, Some(&frame), output, enc_tb)?;
            if *frame_count % 30 == 0 && total_frames > 0 {
                progress_cb(VideoToolProgress {
                    task_id: task_id.to_string(),
                    progress: (*frame_count as f32 / total_frames as f32).min(0.95),
                    current_step: "reencoding".to_string(),
                    elapsed_ms: start.elapsed().as_millis() as u64,
                    ..Default::default()
                });
            }
        }
        Ok(())
    }

    /// 处理音频 packet：解码、重采样、编码、写入
    fn process_audio_packet(
        packet: &ffmpeg_next::Packet,
        dec: &mut ffmpeg_next::codec::decoder::Audio,
        enc: &mut ffmpeg_next::codec::encoder::Audio,
        resampler: &mut Option<ffmpeg_next::software::resampling::Context>,
        output: &mut ffmpeg_next::format::context::Output,
        log_cb: &mut impl FnMut(VideoToolLog),
        task_id: &str,
    ) {
        if dec.send_packet(packet).is_err() {
            return;
        }
        let mut decoded_frame = ffmpeg_next::frame::Audio::empty();
        while dec.receive_frame(&mut decoded_frame).is_ok() {
            let frame_to_encode = if let Some(ref mut resamp) = resampler {
                let mut resampled = ffmpeg_next::frame::Audio::empty();
                if resamp.run(&decoded_frame, &mut resampled).is_err() {
                    continue;
                }
                resampled
            } else {
                decoded_frame.clone()
            };
            if enc.send_frame(&frame_to_encode).is_ok() {
                let mut encoded_packet = ffmpeg_next::Packet::empty();
                while enc.receive_packet(&mut encoded_packet).is_ok() {
                    encoded_packet.set_stream(1);
                    encoded_packet.set_position(-1);
                    if let Err(e) = encoded_packet.write_interleaved(output) {
                        Self::log_warn(log_cb, task_id, &format!("写入音频 packet 失败: {}", e));
                    }
                }
            }
        }
    }

    /// 刷新视频解码器缓冲区
    #[allow(clippy::too_many_arguments)]
    fn flush_video_decoder_simple(
        decoder: &mut ffmpeg_next::codec::decoder::Video,
        sws_ctx: &mut ffmpeg_next::software::scaling::Context,
        encoder: &mut ffmpeg_next::codec::encoder::video::Encoder,
        output: &mut ffmpeg_next::format::context::Output,
        enc_tb: ffmpeg_next::Rational,
        config: &ConvertVideoConfig,
        scaled_w: u32,
        scaled_h: u32,
        x_off: u32,
        y_off: u32,
        needs_padding: bool,
        frame_count: &mut u64,
    ) {
        decoder.send_eof().ok();
        let mut decoded = ffmpeg_next::frame::Video::empty();
        while decoder.receive_frame(&mut decoded).is_ok() {
            if let Ok(yuv) = Self::scale_and_pad_frame(
                &decoded,
                sws_ctx,
                config.width,
                config.height,
                scaled_w,
                scaled_h,
                x_off,
                y_off,
                needs_padding,
            ) {
                let mut frame = yuv;
                frame.set_pts(Some(*frame_count as i64));
                *frame_count += 1;
                let _ = Self::encode_and_write(encoder, Some(&frame), output, enc_tb);
            }
        }
    }

    /// 刷新音频编码器
    fn flush_audio_encoder(
        audio_dec: Option<ffmpeg_next::codec::decoder::Audio>,
        audio_enc: Option<ffmpeg_next::codec::encoder::Audio>,
        mut audio_resampler: Option<ffmpeg_next::software::resampling::Context>,
        output: &mut ffmpeg_next::format::context::Output,
    ) {
        let (mut dec, mut enc) = match (audio_dec, audio_enc) {
            (Some(d), Some(e)) => (d, e),
            _ => return,
        };
        dec.send_eof().ok();
        let mut decoded_frame = ffmpeg_next::frame::Audio::empty();
        while dec.receive_frame(&mut decoded_frame).is_ok() {
            let frame_to_encode = if let Some(ref mut resamp) = audio_resampler {
                let mut resampled = ffmpeg_next::frame::Audio::empty();
                if resamp.run(&decoded_frame, &mut resampled).is_err() {
                    continue;
                }
                resampled
            } else {
                decoded_frame.clone()
            };
            enc.send_frame(&frame_to_encode).ok();
            let mut pkt = ffmpeg_next::Packet::empty();
            while enc.receive_packet(&mut pkt).is_ok() {
                pkt.set_stream(1);
                pkt.set_position(-1);
                pkt.write_interleaved(output).ok();
            }
        }
        enc.send_eof().ok();
        let mut pkt = ffmpeg_next::Packet::empty();
        while enc.receive_packet(&mut pkt).is_ok() {
            pkt.set_stream(1);
            pkt.set_position(-1);
            pkt.write_interleaved(output).ok();
        }
    }
}
