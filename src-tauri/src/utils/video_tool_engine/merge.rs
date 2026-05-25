use super::VideoToolEngine;
use crate::model::video_tool_state::*;
use anyhow::{anyhow, Result};
use std::time::Instant;

impl VideoToolEngine {
    pub fn merge_videos<P, L>(
        params: &MergeVideosParams,
        mut progress_cb: P,
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
            return Self::merge_reencode(params, &task_id, start, &mut progress_cb, &mut log_cb);
        }

        match Self::merge_concat(params, &task_id, start, &mut progress_cb, &mut log_cb) {
            Ok(result) => Ok(result),
            Err(e) => {
                let err_msg = e.to_string();
                log_cb(VideoToolLog {
                    task_id: task_id.clone(),
                    level: "warn".to_string(),
                    message: format!("快速合并失败 ({}), 自动切换到重编码模式", err_msg),
                    timestamp: now_ms(),
                });
                progress_cb(VideoToolProgress {
                    task_id: task_id.clone(),
                    progress: 0.0,
                    current_step: "reencoding".to_string(),
                    elapsed_ms: start.elapsed().as_millis() as u64,
                    ..Default::default()
                });
                Self::merge_reencode(params, &task_id, start, &mut progress_cb, &mut log_cb)
            }
        }
    }

    fn merge_concat<P, L>(
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
        let now_ms = || {
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis() as u64
        };

        log_cb(VideoToolLog {
            task_id: task_id.to_string(),
            level: "info".to_string(),
            message: "使用流复制快速合并模式".to_string(),
            timestamp: now_ms(),
        });

        let first_input = ffmpeg_next::format::input(&params.input_paths[0])
            .map_err(|e| anyhow!("打开第一个视频失败: {}", e))?;

        if Self::is_ts_format(&params.input_paths[0]) {
            return Err(anyhow!(
                "MPEG-TS 格式不支持直接流复制到 {}，需要重编码",
                params.output_format
            ));
        }

        for stream in first_input.streams() {
            if stream.parameters().medium() == ffmpeg_next::media::Type::Video {
                let codec_id = stream.parameters().id();
                let incompatible = match params.output_format.as_str() {
                    "flv" => !matches!(
                        codec_id,
                        ffmpeg_next::codec::Id::FLV1
                            | ffmpeg_next::codec::Id::H264
                            | ffmpeg_next::codec::Id::VP6A
                            | ffmpeg_next::codec::Id::VP6F
                    ),
                    "webm" => !matches!(
                        codec_id,
                        ffmpeg_next::codec::Id::VP8
                            | ffmpeg_next::codec::Id::VP9
                            | ffmpeg_next::codec::Id::AV1
                    ),
                    _ => false,
                };
                if incompatible {
                    return Err(anyhow!(
                        "编码 {:?} 与输出格式 {} 不兼容，需要重编码",
                        codec_id,
                        params.output_format
                    ));
                }
            }
        }

        let mut output = ffmpeg_next::format::output_as(
            &params.output_path,
            Self::normalize_format_name(&params.output_format),
        )
        .map_err(|e| anyhow!("创建输出失败: {}", e))?;

        let mut stream_mapping: Vec<Option<usize>> = vec![None; first_input.nb_streams() as usize];
        let mut out_stream_count: usize = 0;
        let supports_cover = !matches!(params.output_format.as_str(), "flv");

        for stream in first_input.streams() {
            let media_type = stream.parameters().medium();
            let is_cover = media_type == ffmpeg_next::media::Type::Attachment
                || stream.disposition().contains(ffmpeg_next::format::stream::Disposition::ATTACHED_PIC);
            if media_type == ffmpeg_next::media::Type::Video
                || media_type == ffmpeg_next::media::Type::Audio
                || (is_cover && supports_cover)
            {
                stream_mapping[stream.index()] = Some(out_stream_count);
                out_stream_count += 1;

                let mut out_stream = output
                    .add_stream(None)
                    .map_err(|e| anyhow!("添加输出流失败: {}", e))?;
                out_stream.set_parameters(stream.parameters());
                unsafe {
                    let avstream = out_stream.as_mut_ptr();
                    (*(*avstream).codecpar).codec_tag = 0;
                }
                out_stream.set_time_base(stream.time_base());
            }
        }

        if out_stream_count == 0 {
            return Err(anyhow!("第一个视频中未找到视频或音频流"));
        }

        let has_cover_art = supports_cover && first_input.streams().any(|s| {
            let mt = s.parameters().medium();
            mt == ffmpeg_next::media::Type::Attachment
                || s.disposition().contains(ffmpeg_next::format::stream::Disposition::ATTACHED_PIC)
        });

        output
            .write_header()
            .map_err(|e| anyhow!("写入输出头失败: {}", e))?;

        let total_inputs = params.input_paths.len();

        let mut input_durations: Vec<f64> = Vec::with_capacity(total_inputs);
        let mut total_duration_all: f64 = 0.0;
        for p in &params.input_paths {
            let dur = ffmpeg_next::format::input(p)
                .ok()
                .map(|inp| inp.duration() as f64 / 1_000_000.0)
                .unwrap_or(0.0);
            input_durations.push(dur);
            total_duration_all += dur;
        }
        let mut cumulative_duration: f64 = 0.0;

        let mut packets_since_progress: u32 = 0;
        let mut last_progress_emit = Instant::now();

        let mut last_dts: Vec<i64> = vec![i64::MIN; out_stream_count];
        let mut dts_offsets: Vec<i64> = vec![0; out_stream_count];
        let mut seen_first: Vec<bool>;
        let mut file_stream_mapping: Vec<Option<usize>>;

        for (file_idx, input_path) in params.input_paths.iter().enumerate() {
            log_cb(VideoToolLog {
                task_id: task_id.to_string(),
                level: "info".to_string(),
                message: format!("处理第 {}/{} 个文件", file_idx + 1, total_inputs),
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

            file_stream_mapping = vec![None; input.nb_streams() as usize];
            let mut out_idx = 0;
            for stream in input.streams() {
                let media_type = stream.parameters().medium();
                let is_cover = media_type == ffmpeg_next::media::Type::Attachment
                    || stream.disposition().contains(ffmpeg_next::format::stream::Disposition::ATTACHED_PIC);
                let should_map = media_type == ffmpeg_next::media::Type::Video
                    || media_type == ffmpeg_next::media::Type::Audio
                    || (is_cover && file_idx == 0);
                if should_map {
                    if out_idx < out_stream_count {
                        file_stream_mapping[stream.index()] = Some(out_idx);
                        out_idx += 1;
                    }
                }
            }

            seen_first = vec![false; out_stream_count];

            for (stream, mut packet) in input.packets() {
                let out_idx = match file_stream_mapping.get(stream.index()).and_then(|m| *m) {
                    Some(idx) => idx,
                    None => continue,
                };

                let out_st = output
                    .stream(out_idx)
                    .ok_or_else(|| anyhow!("输出流索引越界"))?;
                let in_tb = stream.time_base();
                let out_tb = out_st.time_base();

                packet.rescale_ts(in_tb, out_tb);

                if file_idx > 0 {
                    let raw_dts = packet.dts().unwrap_or_else(|| packet.pts().unwrap_or(0));

                    if !seen_first[out_idx] {
                        seen_first[out_idx] = true;
                        if last_dts[out_idx] != i64::MIN {
                            dts_offsets[out_idx] = last_dts[out_idx] + 1 - raw_dts;
                        }
                    }

                    if let Some(p) = packet.pts() {
                        packet.set_pts(Some(p + dts_offsets[out_idx]));
                    }
                    if let Some(d) = packet.dts() {
                        packet.set_dts(Some(d + dts_offsets[out_idx]));
                    }
                }

                let current_dts = packet.dts().unwrap_or_else(|| packet.pts().unwrap_or(0));
                if current_dts > last_dts[out_idx] {
                    last_dts[out_idx] = current_dts;
                }

                packet.set_stream(out_idx);
                packet.set_position(-1);

                if let Err(e) = packet.write_interleaved(&mut output) {
                    log_cb(VideoToolLog {
                        task_id: task_id.to_string(),
                        level: "error".to_string(),
                        message: format!("处理文件 {} 时写入失败: {}", input_path.display(), e),
                        timestamp: now_ms(),
                    });
                    return Err(anyhow!("处理文件 {} 时写入失败: {}", input_path.display(), e));
                }

                packets_since_progress += 1;
                if packets_since_progress >= 100 || last_progress_emit.elapsed().as_millis() > 200 {
                    packets_since_progress = 0;
                    last_progress_emit = Instant::now();

                    let file_dur = input_durations.get(file_idx).copied().unwrap_or(0.0);
                    let intra_progress = if file_dur > 0.0 {
                        let ts = stream.time_base();
                        let pts_secs = packet.pts().unwrap_or(0).max(0) as f64 * ts.0 as f64 / ts.1 as f64;
                        (pts_secs / file_dur).min(1.0)
                    } else {
                        0.5
                    };

                    let overall = if total_duration_all > 0.0 {
                        ((cumulative_duration + file_dur * intra_progress) / total_duration_all).min(0.95) as f32
                    } else {
                        ((file_idx as f32 + intra_progress as f32) / total_inputs as f32).min(0.95)
                    };

                    let elapsed_ms = start.elapsed().as_millis() as u64;
                    let remaining_dur = total_duration_all - cumulative_duration - file_dur * intra_progress;
                    let processed_dur = cumulative_duration + file_dur * intra_progress;
                    let eta_ms = if processed_dur > 0.0 && elapsed_ms > 0 {
                        Some((remaining_dur / processed_dur * elapsed_ms as f64) as u64)
                    } else {
                        None
                    };

                    progress_cb(VideoToolProgress {
                        task_id: task_id.to_string(),
                        progress: overall,
                        current_step: "merging".to_string(),
                        elapsed_ms,
                        current_file_index: Some(file_idx),
                        total_files: Some(total_inputs),
                        current_file_name: Some(input_path.file_name().unwrap_or_default().to_string_lossy().to_string()),
                        eta_ms,
                        ..Default::default()
                    });
                }
            }

            cumulative_duration += input_durations.get(file_idx).copied().unwrap_or(0.0);
        }

        output
            .write_trailer()
            .map_err(|e| anyhow!("写入文件尾失败: {}", e))?;

        drop(output);

        if !has_cover_art {
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
            current_file_index: Some(total_inputs.saturating_sub(1)),
            total_files: Some(total_inputs),
            ..Default::default()
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
        progress_cb: &mut P,
        log_cb: &mut L,
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

        let codec_candidates: &[&str] = match params.output_format.as_str() {
            "flv" => &["libx264", "libx264rgb", "flv", "mpeg4"],
            "webm" => &["libvpx", "libvpx-vp9", "libx264"],
            _ => &["libx264", "libx264rgb", "libx265", "mpeg4"],
        };
        let codec_name = codec_candidates
            .iter()
            .find(|&&name| ffmpeg_next::codec::encoder::find_by_name(name).is_some())
            .copied()
            .ok_or_else(|| {
                anyhow!(
                    "未找到可用的视频编码器。请确保已安装包含 libx264 的 FFmpeg。\
                    可以从 https://ffmpeg.org/download.html 下载完整版 FFmpeg。"
                )
            })?;

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
                .unwrap();
            let audio_params = audio_stream.parameters();
            let audio_tb = audio_stream.time_base();
            let mut out_audio = output
                .add_stream(None)
                .map_err(|e| anyhow!("添加音频流失败: {}", e))?;
            out_audio.set_parameters(audio_params);
            unsafe {
                let avstream = out_audio.as_mut_ptr();
                (*(*avstream).codecpar).codec_tag = 0;
            }
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
                    unsafe {
                        let avstream = out_att.as_mut_ptr();
                        (*(*avstream).codecpar).codec_tag = 0;
                    }
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

        let encode_and_write =
            |encoder: &mut ffmpeg_next::codec::encoder::video::Encoder,
             frame: Option<&ffmpeg_next::frame::Video>,
             output: &mut ffmpeg_next::format::context::Output|
             -> Result<()> {
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
                    encoded_packet.rescale_ts(enc_tb, output.stream(0).unwrap().time_base());
                    encoded_packet
                        .write_interleaved(output)
                        .map_err(|e| anyhow!("写入视频 packet 失败: {}", e))?;
                }
                Ok(())
            };

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

                        if let Err(e) = encode_and_write(&mut encoder, Some(&yuv_frame), &mut output) {
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
                                let _ = cover_packet.write_interleaved(&mut output);
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

                encode_and_write(&mut encoder, Some(&yuv_frame), &mut output)?;

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
                let out_tb = output.stream(1).unwrap().time_base();
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

        encode_and_write(&mut encoder, None, &mut output)?;

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
