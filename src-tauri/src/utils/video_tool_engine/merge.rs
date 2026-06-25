use super::common::{now_ms, reset_codec_tag};
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

        if params.input_paths.len() < 2 {
            return Err(anyhow!("至少需要两个视频文件才能合并"));
        }

        log_cb(VideoToolLog {
            task_id: task_id.clone(),
            level: "info".to_string(),
            message: format!("开始合并 {} 个视频文件", params.input_paths.len()),
            timestamp: now_ms(),
        });

        let use_stream_copy = params
            .video_codec
            .as_deref()
            .map(|c| c == "copy")
            .unwrap_or(false);

        // 用户明确选择流复制，或未选编码器且未勾选重编码
        if use_stream_copy || (!params.reencode && params.video_codec.is_none()) {
            match Self::merge_concat(params, &task_id, start, &mut progress_cb, &mut log_cb) {
                Ok(result) => return Ok(result),
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
                }
            }
        }

        // 重编码模式
        Self::merge_reencode(params, &task_id, start, &mut progress_cb, &mut log_cb)
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
                || stream
                    .disposition()
                    .contains(ffmpeg_next::format::stream::Disposition::ATTACHED_PIC);
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
                reset_codec_tag(&mut out_stream);
                out_stream.set_time_base(stream.time_base());
            }
        }

        if out_stream_count == 0 {
            return Err(anyhow!("第一个视频中未找到视频或音频流"));
        }

        let has_cover_art = supports_cover
            && first_input.streams().any(|s| {
                let mt = s.parameters().medium();
                mt == ffmpeg_next::media::Type::Attachment
                    || s.disposition()
                        .contains(ffmpeg_next::format::stream::Disposition::ATTACHED_PIC)
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
                    || stream
                        .disposition()
                        .contains(ffmpeg_next::format::stream::Disposition::ATTACHED_PIC);
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
                    return Err(anyhow!(
                        "处理文件 {} 时写入失败: {}",
                        input_path.display(),
                        e
                    ));
                }

                packets_since_progress += 1;
                if packets_since_progress >= 100 || last_progress_emit.elapsed().as_millis() > 200 {
                    packets_since_progress = 0;
                    last_progress_emit = Instant::now();

                    let file_dur = input_durations.get(file_idx).copied().unwrap_or(0.0);
                    let intra_progress = if file_dur > 0.0 {
                        let ts = stream.time_base();
                        let pts_secs =
                            packet.pts().unwrap_or(0).max(0) as f64 * ts.0 as f64 / ts.1 as f64;
                        (pts_secs / file_dur).min(1.0)
                    } else {
                        0.5
                    };

                    let overall = if total_duration_all > 0.0 {
                        ((cumulative_duration + file_dur * intra_progress) / total_duration_all)
                            .min(0.95) as f32
                    } else {
                        ((file_idx as f32 + intra_progress as f32) / total_inputs as f32).min(0.95)
                    };

                    let elapsed_ms = start.elapsed().as_millis() as u64;
                    let remaining_dur =
                        total_duration_all - cumulative_duration - file_dur * intra_progress;
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
                        current_file_name: Some(
                            input_path
                                .file_name()
                                .unwrap_or_default()
                                .to_string_lossy()
                                .to_string(),
                        ),
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
                    if let Err(e) = Self::embed_cover_art(
                        &params.output_path,
                        &jpeg_data,
                        w,
                        h,
                        &params.output_format,
                    ) {
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
            duration_secs: total_duration_all,
            file_size_bytes: file_size,
        })
    }
}
