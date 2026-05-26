use super::VideoToolEngine;
use super::common::{now_ms, find_video_encoder_for_format, find_audio_encoder_for_codec, reset_codec_tag};
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
        let format_str = match &params.target {
            ConversionTarget::VideoFormat(f) => f.clone(),
            _ => unreachable!(),
        };

        log_cb(VideoToolLog {
            task_id: task_id.to_string(),
            level: "info".to_string(),
            message: "使用重编码转换模式".to_string(),
            timestamp: now_ms(),
        });

        let codec_name = find_video_encoder_for_format(&format_str)?;

        log_cb(VideoToolLog {
            task_id: task_id.to_string(),
            level: "info".to_string(),
            message: format!("使用编码器: {}", codec_name),
            timestamp: now_ms(),
        });

        let input = ffmpeg_next::format::input(&params.input_path)
            .map_err(|e| anyhow!("打开输入文件失败: {}", e))?;

        let video_stream = input
            .streams()
            .best(ffmpeg_next::media::Type::Video)
            .ok_or_else(|| anyhow!("输入文件未找到视频流"))?;

        let decoder_ctx =
            ffmpeg_next::codec::context::Context::from_parameters(video_stream.parameters())
                .map_err(|e| anyhow!("创建解码上下文失败: {}", e))?;
        let decoder = decoder_ctx
            .decoder()
            .video()
            .map_err(|e| anyhow!("创建视频解码器失败: {}", e))?;

        let (target_width, target_height) = if let Some((w, h)) = params.resolution {
            (w, h)
        } else {
            (decoder.width(), decoder.height())
        };
        let width = target_width / 2 * 2;
        let height = target_height / 2 * 2;

        let bit_rate = params
            .video_bitrate
            .as_deref()
            .and_then(Self::parse_bitrate)
            .unwrap_or_else(|| decoder.bit_rate().max(2_000_000));

        let avg_frame_rate = video_stream.avg_frame_rate();
        let fps = if avg_frame_rate.1 > 0 {
            avg_frame_rate.0 as f64 / avg_frame_rate.1 as f64
        } else {
            25.0
        };
        let enc_tb = if avg_frame_rate.1 > 0 {
            Self::constrain_timebase(ffmpeg_next::Rational::new(avg_frame_rate.1, avg_frame_rate.0))
        } else {
            ffmpeg_next::Rational::new(1, 25)
        };

        let mut has_audio = input.streams().best(ffmpeg_next::media::Type::Audio).is_some();
        let audio_codec_name = params.audio_codec.as_deref().unwrap_or("aac");
        let resolved_audio_encoder = find_audio_encoder_for_codec(audio_codec_name).ok();

        let mut output = ffmpeg_next::format::output_as(&params.output_path, Self::normalize_format_name(&format_str))
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
        encoder_ctx.set_time_base(enc_tb);
        encoder_ctx.set_format(ffmpeg_next::format::Pixel::YUV420P);
        encoder_ctx.set_bit_rate(bit_rate);
        if codec_name.starts_with("libx264") || codec_name.starts_with("libx265") {
            encoder_ctx.set_gop((fps * 10.0) as u32);
        }

        let mut encoder = encoder_ctx
            .open_as(codec)
            .map_err(|e| anyhow!("打开编码器失败: {}", e))?;
        out_video.set_parameters(&encoder);
        out_video.set_time_base(enc_tb);

        if has_audio && resolved_audio_encoder.is_none() {
            log_cb(VideoToolLog {
                task_id: task_id.to_string(),
                level: "warn".to_string(),
                message: format!("未找到音频编码器 '{}'，将跳过音频", audio_codec_name),
                timestamp: now_ms(),
            });
            has_audio = false;
        }

        let mut audio_enc: Option<ffmpeg_next::codec::encoder::Audio> = None;
        let mut audio_dec: Option<ffmpeg_next::codec::decoder::Audio> = None;
        let mut audio_resampler: Option<ffmpeg_next::software::resampling::Context> = None;

        if has_audio {
            let audio_stream = input
                .streams()
                .best(ffmpeg_next::media::Type::Audio)
                .unwrap();

            let dec_ctx =
                ffmpeg_next::codec::context::Context::from_parameters(audio_stream.parameters())
                    .map_err(|e| anyhow!("创建音频解码上下文失败: {}", e))?;
            let dec = dec_ctx
                .decoder()
                .audio()
                .map_err(|e| anyhow!("创建音频解码器失败: {}", e))?;

            let dec_format = dec.format();
            let dec_rate = dec.rate();
            let dec_channels = dec.channels();
            let dec_layout = dec.channel_layout();

            let enc_codec_name = resolved_audio_encoder
                .ok_or_else(|| anyhow!("未找到音频编码器"))?;
            let enc_codec = ffmpeg_next::codec::encoder::find_by_name(enc_codec_name)
                .ok_or_else(|| anyhow!("未找到音频编码器: {}", enc_codec_name))?;

            let (enc_format, enc_rate, enc_layout) = Self::query_audio_encoder_params(
                &enc_codec, dec_format, dec_rate, dec_channels,
            );

            let mut out_audio = output
                .add_stream(enc_codec)
                .map_err(|e| anyhow!("添加音频输出流失败: {}", e))?;

            let mut enc_ctx = ffmpeg_next::codec::context::Context::from_parameters(out_audio.parameters())
                .map_err(|e| anyhow!("创建音频编码上下文失败: {}", e))?
                .encoder()
                .audio()
                .map_err(|e| anyhow!("创建音频编码器失败: {}", e))?;

            enc_ctx.set_rate(enc_rate as i32);
            enc_ctx.set_channel_layout(enc_layout);
            enc_ctx.set_format(enc_format);
            if let Some(bitrate_str) = &params.audio_bitrate {
                if let Some(br) = Self::parse_bitrate(bitrate_str) {
                    enc_ctx.set_bit_rate(br);
                }
            }
            enc_ctx.set_time_base(ffmpeg_next::Rational::new(1, enc_rate as i32));

            let opened_enc = enc_ctx
                .open_as(enc_codec)
                .map_err(|e| anyhow!("打开音频编码器失败: {}", e))?;
            out_audio.set_parameters(&opened_enc);
            out_audio.set_time_base(ffmpeg_next::Rational::new(1, enc_rate as i32));

            let needs_resample = dec_format != enc_format
                || dec_rate != enc_rate
                || dec_layout != enc_layout;
            let resamp = if needs_resample {
                Some(
                    ffmpeg_next::software::resampling::Context::get(
                        dec_format, dec_layout, dec_rate,
                        enc_format, enc_layout, enc_rate,
                    )
                    .map_err(|e| anyhow!("创建音频重采样器失败: {}", e))?,
                )
            } else {
                None
            };

            log_cb(VideoToolLog {
                task_id: task_id.to_string(),
                level: "info".to_string(),
                message: format!("音频将重编码为 {} ({}Hz)", enc_codec_name, enc_rate),
                timestamp: now_ms(),
            });

            audio_enc = Some(opened_enc);
            audio_dec = Some(dec);
            audio_resampler = resamp;
        }

        let mut cover_stream_indices: Vec<usize> = Vec::new();
        let supports_cover = !matches!(format_str.as_str(), "flv");
        if supports_cover {
            for stream in input.streams() {
                let media_type = stream.parameters().medium();
                let is_cover = media_type == ffmpeg_next::media::Type::Attachment
                    || stream.disposition().contains(ffmpeg_next::format::stream::Disposition::ATTACHED_PIC);
                if is_cover {
                    let mut out_att = output
                        .add_stream(None)
                        .map_err(|e| anyhow!("添加封面流失败: {}", e))?;
                    out_att.set_parameters(stream.parameters());
                    reset_codec_tag(&mut out_att);
                    out_att.set_time_base(stream.time_base());
                    cover_stream_indices.push(output.nb_streams() as usize - 1);
                }
            }
        }
        let has_cover = !cover_stream_indices.is_empty();

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

        let (scaled_width, scaled_height) =
            Self::calculate_aspect_ratio_resize(decoder.width(), decoder.height(), width, height);

        let needs_padding = scaled_width != width || scaled_height != height;
        let x_offset = if needs_padding { (width - scaled_width) / 2 } else { 0 };
        let y_offset = if needs_padding { (height - scaled_height) / 2 } else { 0 };

        let mut sws_ctx = ffmpeg_next::software::scaling::Context::get(
            decoder.format(),
            decoder.width(),
            decoder.height(),
            ffmpeg_next::format::Pixel::YUV420P,
            scaled_width,
            scaled_height,
            ffmpeg_next::software::scaling::Flags::BILINEAR,
        )
        .map_err(|e| anyhow!("创建颜色转换上下文失败: {}", e))?;

        if needs_padding {
            log_cb(VideoToolLog {
                task_id: task_id.to_string(),
                level: "info".to_string(),
                message: format!(
                    "视频分辨率 {}x{} 与目标 {}x{} 不同，保持宽高比缩放至 {}x{} 并添加黑边",
                    decoder.width(),
                    decoder.height(),
                    width,
                    height,
                    scaled_width,
                    scaled_height
                ),
                timestamp: now_ms(),
            });
        }

        let mut frame_count: u64 = 0;
        let total_frames = {
            let dur_secs = input.duration() as f64 / 1_000_000.0;
            if dur_secs > 0.0 {
                (dur_secs * fps) as u64
            } else {
                0
            }
        };

        let mut cover_stream_counter: usize = 0;

        for (stream, packet) in input.packets() {
            let media_type = stream.parameters().medium();

            if media_type == ffmpeg_next::media::Type::Video {
                if let Err(e) = decoder.send_packet(&packet) {
                    log_cb(VideoToolLog {
                        task_id: task_id.to_string(),
                        level: "warn".to_string(),
                        message: format!("跳过损坏的视频 packet: {}", e),
                        timestamp: now_ms(),
                    });
                    continue;
                }

                let mut decoded = ffmpeg_next::frame::Video::empty();
                while decoder.receive_frame(&mut decoded).is_ok() {
                    let yuv_frame = Self::scale_and_pad_frame(
                        &decoded,
                        &mut sws_ctx,
                        width,
                        height,
                        scaled_width,
                        scaled_height,
                        x_offset,
                        y_offset,
                        needs_padding,
                    )?;

                    let mut frame = yuv_frame;
                    frame.set_pts(Some(frame_count as i64));
                    frame_count += 1;

                    Self::encode_and_write(&mut encoder, Some(&frame), &mut output, enc_tb)?;

                    if frame_count % 30 == 0 && total_frames > 0 {
                        let progress = (frame_count as f32 / total_frames as f32).min(0.95);
                        progress_cb(VideoToolProgress {
                            task_id: task_id.to_string(),
                            progress,
                            current_step: "reencoding".to_string(),
                            elapsed_ms: start.elapsed().as_millis() as u64,
                            ..Default::default()
                        });
                    }
                }
            } else if media_type == ffmpeg_next::media::Type::Audio && has_audio {
                if let (Some(ref mut dec), Some(ref mut enc)) = (&mut audio_dec, &mut audio_enc) {
                    if dec.send_packet(&packet).is_ok() {
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

                            if enc.send_frame(&frame_to_encode).is_ok() {
                                let mut encoded_packet = ffmpeg_next::Packet::empty();
                                while enc.receive_packet(&mut encoded_packet).is_ok() {
                                    encoded_packet.set_stream(1);
                                    encoded_packet.set_position(-1);
                                    if let Err(e) = encoded_packet.write_interleaved(&mut output) {
                                        log_cb(VideoToolLog {
                                            task_id: task_id.to_string(),
                                            level: "warn".to_string(),
                                            message: format!("写入音频 packet 失败: {}", e),
                                            timestamp: now_ms(),
                                        });
                                    }
                                }
                            }
                        }
                    }
                }
            } else if has_cover {
                let is_cover = media_type == ffmpeg_next::media::Type::Attachment
                    || stream.disposition().contains(ffmpeg_next::format::stream::Disposition::ATTACHED_PIC);
                if is_cover {
                    if let Some(&out_idx) = cover_stream_indices.get(cover_stream_counter) {
                        if let Some(out_st) = output.stream(out_idx) {
                            let in_tb = stream.time_base();
                            let out_tb = out_st.time_base();
                            let mut cover_packet = packet.clone();
                            cover_packet.set_stream(out_idx);
                            cover_packet.rescale_ts(in_tb, out_tb);
                            cover_packet.set_position(-1);
                            if let Err(e) = cover_packet.write_interleaved(&mut output) {
                                log_cb(VideoToolLog {
                                    task_id: task_id.to_string(),
                                    level: "warn".to_string(),
                                    message: format!("写入封面 packet 失败: {}", e),
                                    timestamp: now_ms(),
                                });
                            }
                        }
                    }
                    cover_stream_counter += 1;
                }
            }
        }

        decoder.send_eof().ok();
        let mut decoded = ffmpeg_next::frame::Video::empty();
        while decoder.receive_frame(&mut decoded).is_ok() {
            let yuv_frame = Self::scale_and_pad_frame(
                &decoded,
                &mut sws_ctx,
                width,
                height,
                scaled_width,
                scaled_height,
                x_offset,
                y_offset,
                needs_padding,
            )?;

            let mut frame = yuv_frame;
            frame.set_pts(Some(frame_count as i64));
            frame_count += 1;

            Self::encode_and_write(&mut encoder, Some(&frame), &mut output, enc_tb)?;
        }

        Self::encode_and_write(&mut encoder, None, &mut output, enc_tb)?;

        if has_audio {
            if let (Some(ref mut dec), Some(ref mut enc)) = (&mut audio_dec, &mut audio_enc) {
                dec.send_eof().ok();
                let mut decoded_frame = ffmpeg_next::frame::Audio::empty();
                while dec.receive_frame(&mut decoded_frame).is_ok() {
                    let frame_to_encode = if let Some(ref mut resamp) = audio_resampler {
                        let mut resampled = ffmpeg_next::frame::Audio::empty();
                        resamp.run(&decoded_frame, &mut resampled).ok();
                        resampled
                    } else {
                        decoded_frame.clone()
                    };
                    enc.send_frame(&frame_to_encode).ok();
                    let mut encoded_packet = ffmpeg_next::Packet::empty();
                    while enc.receive_packet(&mut encoded_packet).is_ok() {
                        encoded_packet.set_stream(1);
                        encoded_packet.set_position(-1);
                        encoded_packet.write_interleaved(&mut output).ok();
                    }
                }

                enc.send_eof().ok();
                let mut encoded_packet = ffmpeg_next::Packet::empty();
                while enc.receive_packet(&mut encoded_packet).is_ok() {
                    encoded_packet.set_stream(1);
                    encoded_packet.set_position(-1);
                    encoded_packet.write_interleaved(&mut output).ok();
                }
            }
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

        log_cb(VideoToolLog {
            task_id: task_id.to_string(),
            level: "info".to_string(),
            message: format!(
                "转换完成，共编码 {} 帧，文件大小 {}，耗时 {:.1} 秒",
                frame_count,
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
}
