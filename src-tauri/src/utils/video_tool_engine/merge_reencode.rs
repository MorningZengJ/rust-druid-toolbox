use super::VideoToolEngine;
use super::common::{now_ms, find_video_encoder_for_format, reset_codec_tag};
use crate::model::video_tool_state::*;
use anyhow::{anyhow, Result};
use std::time::Instant;

impl VideoToolEngine {
    pub(super) fn merge_reencode<P, L>(
        params: &MergeVideosParams,
        task_id: &str,
        start: Instant,
        progress_cb: &mut P,
        log_cb: &mut L,
    ) -> Result<MergeVideosResult>
    where
        P: FnMut(VideoToolProgress),
        L: FnMut(VideoToolLog),
    {
        log_cb(VideoToolLog {
            task_id: task_id.to_string(),
            level: "info".to_string(),
            message: "使用重编码合并模式".to_string(),
            timestamp: now_ms(),
        });

        let codec_name = find_video_encoder_for_format(&params.output_format)?;

        log_cb(VideoToolLog {
            task_id: task_id.to_string(),
            level: "info".to_string(),
            message: format!("使用编码器: {}", codec_name),
            timestamp: now_ms(),
        });

        let first_input = ffmpeg_next::format::input(&params.input_paths[0])
            .map_err(|e| anyhow!("打开第一个视频失败: {}", e))?;

        let first_video = first_input
            .streams()
            .best(ffmpeg_next::media::Type::Video)
            .ok_or_else(|| anyhow!("第一个视频未找到视频流"))?;

        let first_decoder_ctx =
            ffmpeg_next::codec::context::Context::from_parameters(first_video.parameters())
                .map_err(|e| anyhow!("创建解码上下文失败: {}", e))?;
        let first_decoder = first_decoder_ctx
            .decoder()
            .video()
            .map_err(|e| anyhow!("创建视频解码器失败: {}", e))?;

        let width = first_decoder.width() / 2 * 2;
        let height = first_decoder.height() / 2 * 2;

        let avg_frame_rate = first_video.avg_frame_rate();
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

        let mut has_audio = false;
        let first_audio_codec = first_input
            .streams()
            .best(ffmpeg_next::media::Type::Audio)
            .map(|s| s.parameters().id());
        if let Some(audio_codec_id) = first_audio_codec {
            let audio_compatible = Self::is_audio_compatible(audio_codec_id, &params.output_format);
            if audio_compatible {
                has_audio = true;
            } else {
                log_cb(VideoToolLog {
                    task_id: task_id.to_string(),
                    level: "warn".to_string(),
                    message: format!(
                        "音频编码 {:?} 与输出格式 {} 不兼容，将跳过音频",
                        audio_codec_id, params.output_format
                    ),
                    timestamp: now_ms(),
                });
            }
        }

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
        encoder_ctx.set_time_base(enc_tb);
        encoder_ctx.set_format(ffmpeg_next::format::Pixel::YUV420P);
        encoder_ctx.set_bit_rate(first_decoder.bit_rate().max(2_000_000));
        if codec_name.starts_with("libx264") || codec_name.starts_with("libx265") {
            encoder_ctx.set_gop((fps * 10.0) as u32);
        }

        let mut encoder = encoder_ctx
            .open_as(codec)
            .map_err(|e| anyhow!("打开编码器失败: {}", e))?;
        out_video.set_parameters(&encoder);
        out_video.set_time_base(enc_tb);

        if has_audio && Self::is_ts_format(&params.input_paths[0]) {
            log_cb(VideoToolLog {
                task_id: task_id.to_string(),
                level: "warn".to_string(),
                message: "MPEG-TS 音频格式与输出容器不兼容，将跳过音频".to_string(),
                timestamp: now_ms(),
            });
            has_audio = false;
        }

        if has_audio {
            let audio_stream = first_input
                .streams()
                .best(ffmpeg_next::media::Type::Audio)
                .ok_or_else(|| anyhow!("未找到音频流"))?;
            let audio_params = audio_stream.parameters();
            let audio_tb = audio_stream.time_base();
            let mut out_audio = output
                .add_stream(None)
                .map_err(|e| anyhow!("添加音频流失败: {}", e))?;
            out_audio.set_parameters(audio_params);
            reset_codec_tag(&mut out_audio);
            out_audio.set_time_base(audio_tb);
        }

        let mut cover_stream_indices: Vec<usize> = Vec::new();
        let supports_cover = !matches!(params.output_format.as_str(), "flv");
        if supports_cover {
            for stream in first_input.streams() {
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

        let mut frame_count: u64 = 0;
        let total = params.input_paths.len();
        let mut last_audio_dts: i64 = i64::MIN;

        let mut estimated_total_frames: u64 = 0;
        for p in &params.input_paths {
            if let Ok(inp) = ffmpeg_next::format::input(p) {
                let dur_secs = inp.duration() as f64 / 1_000_000.0;
                if dur_secs > 0.0 {
                    let fps = inp.streams()
                        .best(ffmpeg_next::media::Type::Video)
                        .map(|s| {
                            let r = s.avg_frame_rate();
                            if r.1 > 0 { r.0 as f64 / r.1 as f64 } else { 25.0 }
                        })
                        .unwrap_or(25.0);
                    estimated_total_frames += (dur_secs * fps) as u64;
                }
            }
        }

        for (i, input_path) in params.input_paths.iter().enumerate() {
            log_cb(VideoToolLog {
                task_id: task_id.to_string(),
                level: "info".to_string(),
                message: format!("处理第 {}/{} 个文件", i + 1, total),
                timestamp: now_ms(),
            });

            let mut input = match ffmpeg_next::format::input(input_path) {
                Ok(input) => input,
                Err(e) => {
                    log_cb(VideoToolLog {
                        task_id: task_id.to_string(),
                        level: "error".to_string(),
                        message: format!("打开视频 {} 失败: {}", input_path.display(), e),
                        timestamp: now_ms(),
                    });
                    return Err(anyhow!("打开视频 {} 失败: {}", input_path.display(), e));
                }
            };

            let video_stream = input
                .streams()
                .best(ffmpeg_next::media::Type::Video)
                .ok_or_else(|| anyhow!("视频 {} 中未找到视频流", input_path.display()))?;

            let decoder_ctx =
                ffmpeg_next::codec::context::Context::from_parameters(video_stream.parameters())
                    .map_err(|e| anyhow!("创建解码上下文失败: {}", e))?;
            let mut decoder = decoder_ctx
                .decoder()
                .video()
                .map_err(|e| anyhow!("创建视频解码器失败: {}", e))?;

            let (scaled_width, scaled_height) = Self::calculate_aspect_ratio_resize(
                decoder.width(),
                decoder.height(),
                width,
                height,
            );

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
                        "视频 {} 分辨率 {}x{} 与目标 {}x{} 不同，保持宽高比缩放至 {}x{} 并添加黑边",
                        input_path.display(),
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

            let mut audio_packets: Vec<(ffmpeg_next::Packet, ffmpeg_next::Rational)> =
                Vec::new();
            let mut cover_stream_counter: usize = 0;

            for (stream, packet) in input.packets() {
                let media_type = stream.parameters().medium();

                if media_type == ffmpeg_next::media::Type::Video {
                    if let Err(e) = decoder.send_packet(&packet) {
                        log_cb(VideoToolLog {
                            task_id: task_id.to_string(),
                            level: "error".to_string(),
                            message: format!("处理文件 {} 时解码失败: {}", input_path.display(), e),
                            timestamp: now_ms(),
                        });
                        return Err(anyhow!("处理文件 {} 时解码失败: {}", input_path.display(), e));
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

                        let mut yuv_frame = yuv_frame;
                        yuv_frame.set_pts(Some(frame_count as i64));
                        frame_count += 1;

                        if let Err(e) = Self::encode_and_write(&mut encoder, Some(&yuv_frame), &mut output, enc_tb) {
                            log_cb(VideoToolLog {
                                task_id: task_id.to_string(),
                                level: "error".to_string(),
                                message: format!("处理文件 {} 时编码失败: {}", input_path.display(), e),
                                timestamp: now_ms(),
                            });
                            return Err(anyhow!("处理文件 {} 时编码失败: {}", input_path.display(), e));
                        }

                        if frame_count % 30 == 0 {
                            let progress = if estimated_total_frames > 0 {
                                (frame_count as f32 / estimated_total_frames as f32).min(0.95)
                            } else {
                                ((i as f32 + 0.5) / total as f32).min(0.95)
                            };
                            let elapsed = start.elapsed().as_secs_f64();
                            let speed = if elapsed > 0.0 { frame_count as f64 / elapsed } else { 0.0 };
                            let eta_ms = if speed > 0.0 && estimated_total_frames > frame_count {
                                Some(((estimated_total_frames - frame_count) as f64 / speed * 1000.0) as u64)
                            } else {
                                None
                            };
                            progress_cb(VideoToolProgress {
                                task_id: task_id.to_string(),
                                progress,
                                current_step: "reencoding".to_string(),
                                elapsed_ms: start.elapsed().as_millis() as u64,
                                current_file_index: Some(i),
                                total_files: Some(total),
                                current_file_name: Some(input_path.file_name().unwrap_or_default().to_string_lossy().to_string()),
                                speed: Some(speed),
                                eta_ms,
                                frames_processed: Some(frame_count.min(estimated_total_frames)),
                                total_frames: Some(estimated_total_frames),
                            });
                        }
                    }
                } else if media_type == ffmpeg_next::media::Type::Audio && has_audio {
                    let audio_compatible =
                        Self::is_audio_compatible(stream.parameters().id(), &params.output_format);
                    if audio_compatible {
                        audio_packets.push((packet, stream.time_base()));
                    }
                } else if has_cover && i == 0 {
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

                let mut yuv_frame = yuv_frame;
                yuv_frame.set_pts(Some(frame_count as i64));
                frame_count += 1;

                Self::encode_and_write(&mut encoder, Some(&yuv_frame), &mut output, enc_tb)?;

                if frame_count % 30 == 0 && estimated_total_frames > 0 {
                    let progress = (frame_count as f32 / estimated_total_frames as f32).min(0.95);
                    let elapsed = start.elapsed().as_secs_f64();
                    let speed = if elapsed > 0.0 { frame_count as f64 / elapsed } else { 0.0 };
                    let eta_ms = if speed > 0.0 && estimated_total_frames > frame_count {
                        Some(((estimated_total_frames - frame_count) as f64 / speed * 1000.0) as u64)
                    } else {
                        None
                    };
                    progress_cb(VideoToolProgress {
                        task_id: task_id.to_string(),
                        progress,
                        current_step: "reencoding".to_string(),
                        elapsed_ms: start.elapsed().as_millis() as u64,
                        current_file_index: Some(i),
                        total_files: Some(total),
                        current_file_name: Some(input_path.file_name().unwrap_or_default().to_string_lossy().to_string()),
                        speed: Some(speed),
                        eta_ms,
                        frames_processed: Some(frame_count.min(estimated_total_frames)),
                        total_frames: Some(estimated_total_frames),
                    });
                }
            }

            if has_audio {
                let out_tb = output
                    .stream(1)
                    .ok_or_else(|| anyhow!("输出音频流索引越界"))?
                    .time_base();
                let mut audio_dts_offset: i64 = 0;
                let mut first_audio = true;

                for (mut packet, in_tb) in audio_packets.drain(..) {
                    packet.set_stream(1);
                    packet.rescale_ts(in_tb, out_tb);

                    let raw_dts = packet.dts().unwrap_or_else(|| packet.pts().unwrap_or(0));

                    if first_audio {
                        first_audio = false;
                        if last_audio_dts != i64::MIN {
                            audio_dts_offset = last_audio_dts + 1 - raw_dts;
                        }
                    }

                    if let Some(p) = packet.pts() {
                        packet.set_pts(Some(p + audio_dts_offset));
                    }
                    if let Some(d) = packet.dts() {
                        packet.set_dts(Some(d + audio_dts_offset));
                    }

                    let current_dts = packet.dts().unwrap_or_else(|| packet.pts().unwrap_or(0));
                    if current_dts > last_audio_dts {
                        last_audio_dts = current_dts;
                    }

                    packet.set_position(-1);
                    if let Err(e) = packet.write_interleaved(&mut output) {
                        log_cb(VideoToolLog {
                            task_id: task_id.to_string(),
                            level: "error".to_string(),
                            message: format!("处理文件 {} 时写入音频失败: {}", input_path.display(), e),
                            timestamp: now_ms(),
                        });
                        return Err(anyhow!("处理文件 {} 时写入音频失败: {}", input_path.display(), e));
                    }
                }
            }

        }

        Self::encode_and_write(&mut encoder, None, &mut output, enc_tb)?;

        output
            .write_trailer()
            .map_err(|e| anyhow!("写入文件尾失败: {}", e))?;

        drop(output);

        if !has_cover {
            log_cb(VideoToolLog {
                task_id: task_id.to_string(),
                level: "info".to_string(),
                message: "输入视频无封面图，正在从视频内容生成...".to_string(),
                timestamp: now_ms(),
            });
            match Self::generate_jpeg_cover_from_video(&params.output_path) {
                Ok((jpeg_data, w, h)) => {
                    if let Err(e) = Self::embed_cover_art(&params.output_path, &jpeg_data, w, h, &params.output_format) {
                        log_cb(VideoToolLog {
                            task_id: task_id.to_string(),
                            level: "warn".to_string(),
                            message: format!("嵌入封面图失败: {}", e),
                            timestamp: now_ms(),
                        });
                    }
                }
                Err(e) => {
                    log_cb(VideoToolLog {
                        task_id: task_id.to_string(),
                        level: "warn".to_string(),
                        message: format!("生成封面图失败: {}", e),
                        timestamp: now_ms(),
                    });
                }
            }
        }

        let file_size = std::fs::metadata(&params.output_path)
            .map(|m| m.len())
            .unwrap_or(0);

        progress_cb(VideoToolProgress {
            task_id: task_id.to_string(),
            progress: 1.0,
            current_step: "done".to_string(),
            elapsed_ms: start.elapsed().as_millis() as u64,
            current_file_index: Some(total.saturating_sub(1)),
            total_files: Some(total),
            frames_processed: Some(frame_count),
            total_frames: Some(estimated_total_frames),
            ..Default::default()
        });

        log_cb(VideoToolLog {
            task_id: task_id.to_string(),
            level: "info".to_string(),
            message: format!(
                "合并完成，共编码 {} 帧，耗时 {:.1} 秒",
                frame_count,
                start.elapsed().as_secs_f64()
            ),
            timestamp: now_ms(),
        });

        Ok(MergeVideosResult {
            output_path: params.output_path.to_string_lossy().to_string(),
            duration_secs: frame_count as f64 / 25.0,
            file_size_bytes: file_size,
        })
    }
}
