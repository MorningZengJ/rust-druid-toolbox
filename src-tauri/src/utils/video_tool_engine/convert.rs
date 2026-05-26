use super::VideoToolEngine;
use super::common::{now_ms, find_audio_encoder_for_codec};
use crate::model::video_tool_state::*;
use anyhow::{anyhow, Result};
use std::time::Instant;

impl VideoToolEngine {
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

        let is_audio_only = matches!(params.target, ConversionTarget::AudioFormat(_));

        log_cb(VideoToolLog {
            task_id: task_id.clone(),
            level: "info".to_string(),
            message: format!(
                "开始格式转换: {} → {}",
                params.input_path.display(),
                if is_audio_only { "音频" } else { "视频" }
            ),
            timestamp: now_ms(),
        });

        if is_audio_only {
            return Self::convert_audio_reencode(params, &task_id, start, &mut progress_cb, &mut log_cb);
        }

        Self::convert_video_reencode(params, &task_id, start, &mut progress_cb, &mut log_cb)
    }

    pub fn batch_convert_format<P, L, BP>(
        params: &BatchConvertParams,
        mut progress_cb: P,
        mut log_cb: L,
        mut batch_progress_cb: BP,
    ) -> Result<BatchConvertResult>
    where
        P: FnMut(VideoToolProgress),
        L: FnMut(VideoToolLog),
        BP: FnMut(BatchProgress),
    {
        let total = params.items.len();
        let mut results = Vec::with_capacity(total);
        let mut success_count = 0u32;
        let mut fail_count = 0u32;

        for (index, item) in params.items.iter().enumerate() {
            let file_name = item
                .input_path
                .file_name()
                .map(|n| n.to_string_lossy().to_string())
                .unwrap_or_default();

            batch_progress_cb(BatchProgress {
                current_index: index as u32,
                total_count: total as u32,
                overall_progress: index as f32 / total as f32,
                current_file_name: file_name.clone(),
            });

            log_cb(VideoToolLog {
                task_id: format!("batch-{}", index),
                level: "info".to_string(),
                message: format!("开始转换第 {}/{} 个文件: {}", index + 1, total, file_name),
                timestamp: now_ms(),
            });

            let file_index = index;
            let mut file_progress = |p: VideoToolProgress| {
                progress_cb(VideoToolProgress {
                    task_id: format!("batch-{}", file_index),
                    ..p
                });
            };
            let mut file_log = |l: VideoToolLog| {
                log_cb(VideoToolLog {
                    task_id: format!("batch-{}", file_index),
                    ..l
                });
            };

            match Self::convert_format(item, &mut file_progress, &mut file_log) {
                Ok(result) => {
                    success_count += 1;
                    results.push(BatchConvertItemResult {
                        input_path: item.input_path.to_string_lossy().to_string(),
                        output_path: result.output_path,
                        file_size_bytes: result.file_size_bytes,
                        success: true,
                        error: None,
                    });
                }
                Err(e) => {
                    fail_count += 1;
                    log_cb(VideoToolLog {
                        task_id: format!("batch-{}", index),
                        level: "error".to_string(),
                        message: format!("转换失败: {}", e),
                        timestamp: now_ms(),
                    });
                    results.push(BatchConvertItemResult {
                        input_path: item.input_path.to_string_lossy().to_string(),
                        output_path: item.output_path.to_string_lossy().to_string(),
                        file_size_bytes: 0,
                        success: false,
                        error: Some(e.to_string()),
                    });
                }
            }

            batch_progress_cb(BatchProgress {
                current_index: index as u32 + 1,
                total_count: total as u32,
                overall_progress: (index + 1) as f32 / total as f32,
                current_file_name: file_name,
            });
        }

        Ok(BatchConvertResult {
            results,
            total_files: total as u32,
            success_count,
            fail_count,
        })
    }

    fn convert_audio_reencode<P, L>(
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
            ConversionTarget::AudioFormat(f) => f.clone(),
            _ => unreachable!(),
        };

        log_cb(VideoToolLog {
            task_id: task_id.to_string(),
            level: "info".to_string(),
            message: "使用音频重编码模式".to_string(),
            timestamp: now_ms(),
        });

        let input = ffmpeg_next::format::input(&params.input_path)
            .map_err(|e| anyhow!("打开输入文件失败: {}", e))?;

        let audio_stream = input
            .streams()
            .best(ffmpeg_next::media::Type::Audio)
            .ok_or_else(|| anyhow!("输入文件中未找到音频流"))?;

        let decoder_ctx =
            ffmpeg_next::codec::context::Context::from_parameters(audio_stream.parameters())
                .map_err(|e| anyhow!("创建音频解码上下文失败: {}", e))?;
        let mut decoder = decoder_ctx
            .decoder()
            .audio()
            .map_err(|e| anyhow!("创建音频解码器失败: {}", e))?;

        let encoder_name = find_audio_encoder_for_codec(&format_str)?;

        log_cb(VideoToolLog {
            task_id: task_id.to_string(),
            level: "info".to_string(),
            message: format!("使用音频编码器: {}", encoder_name),
            timestamp: now_ms(),
        });

        let enc_codec = ffmpeg_next::codec::encoder::find_by_name(encoder_name)
            .ok_or_else(|| anyhow!("未找到音频编码器: {}", encoder_name))?;

        let mut output = ffmpeg_next::format::output_as(
            &params.output_path,
            Self::normalize_format_name(&format_str),
        )
        .map_err(|e| anyhow!("创建输出失败: {}", e))?;

        let mut out_audio = output
            .add_stream(enc_codec)
            .map_err(|e| anyhow!("添加音频输出流失败: {}", e))?;

        let dec_format = decoder.format();
        let dec_rate = decoder.rate();
        let dec_channels = decoder.channels();
        let dec_layout = decoder.channel_layout();

        let (enc_format, enc_rate, enc_layout) = Self::query_audio_encoder_params(
            &enc_codec, dec_format, dec_rate, dec_channels,
        );

        let mut enc_ctx = ffmpeg_next::codec::context::Context::from_parameters(out_audio.parameters())
            .map_err(|e| anyhow!("创建编码上下文失败: {}", e))?
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

        let mut encoder = enc_ctx
            .open_as(enc_codec)
            .map_err(|e| anyhow!("打开音频编码器失败: {}", e))?;
        out_audio.set_parameters(&encoder);
        out_audio.set_time_base(ffmpeg_next::Rational::new(1, enc_rate as i32));

        let needs_resample = dec_format != enc_format
            || dec_rate != enc_rate
            || dec_layout != enc_layout;
        let mut resampler = if needs_resample {
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

        output
            .write_header()
            .map_err(|e| anyhow!("写入输出头失败: {}", e))?;

        let input_duration = input.duration() as f64 / 1_000_000.0;

        let mut input = ffmpeg_next::format::input(&params.input_path)
            .map_err(|e| anyhow!("打开输入文件失败: {}", e))?;

        let audio_stream = input
            .streams()
            .best(ffmpeg_next::media::Type::Audio)
            .ok_or_else(|| anyhow!("输入文件中未找到音频流"))?;
        let audio_stream_idx = audio_stream.index();

        for (stream, packet) in input.packets() {
            if stream.index() != audio_stream_idx {
                continue;
            }

            if decoder.send_packet(&packet).is_err() {
                continue;
            }

            let mut decoded_frame = ffmpeg_next::frame::Audio::empty();
            while decoder.receive_frame(&mut decoded_frame).is_ok() {
                let frame_to_encode = if let Some(ref mut resamp) = resampler {
                    let mut resampled = ffmpeg_next::frame::Audio::empty();
                    resamp.run(&decoded_frame, &mut resampled).map_err(|e| anyhow!("音频重采样失败: {}", e))?;
                    resampled
                } else {
                    decoded_frame.clone()
                };

                encoder.send_frame(&frame_to_encode).map_err(|e| anyhow!("发送帧到音频编码器失败: {}", e))?;

                let mut encoded_packet = ffmpeg_next::Packet::empty();
                while encoder.receive_packet(&mut encoded_packet).is_ok() {
                    encoded_packet.set_stream(0);
                    encoded_packet.set_position(-1);
                    encoded_packet
                        .write_interleaved(&mut output)
                        .map_err(|e| anyhow!("写入音频 packet 失败: {}", e))?;
                }
            }

            if input_duration > 0.0 {
                let ts = stream.time_base();
                let pts = packet.pts().unwrap_or(0) as f64 * ts.0 as f64 / ts.1 as f64;
                let progress = (pts / input_duration).min(0.95) as f32;
                progress_cb(VideoToolProgress {
                    task_id: task_id.to_string(),
                    progress,
                    current_step: "converting".to_string(),
                    elapsed_ms: start.elapsed().as_millis() as u64,
                    ..Default::default()
                });
            }
        }

        decoder.send_eof().ok();
        let mut decoded_frame = ffmpeg_next::frame::Audio::empty();
        while decoder.receive_frame(&mut decoded_frame).is_ok() {
            let frame_to_encode = if let Some(ref mut resamp) = resampler {
                let mut resampled = ffmpeg_next::frame::Audio::empty();
                resamp.run(&decoded_frame, &mut resampled).ok();
                resampled
            } else {
                decoded_frame.clone()
            };
            encoder.send_frame(&frame_to_encode).ok();
            let mut encoded_packet = ffmpeg_next::Packet::empty();
            while encoder.receive_packet(&mut encoded_packet).is_ok() {
                encoded_packet.set_stream(0);
                encoded_packet.set_position(-1);
                encoded_packet.write_interleaved(&mut output).ok();
            }
        }

        encoder.send_eof().ok();
        let mut encoded_packet = ffmpeg_next::Packet::empty();
        while encoder.receive_packet(&mut encoded_packet).is_ok() {
            encoded_packet.set_stream(0);
            encoded_packet.set_position(-1);
            encoded_packet.write_interleaved(&mut output).ok();
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
                "音频重编码完成，文件大小 {}，耗时 {:.1} 秒",
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
