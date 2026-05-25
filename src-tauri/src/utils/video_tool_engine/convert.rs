use super::VideoToolEngine;
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
        let now_ms = || {
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis() as u64
        };

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
            return Self::convert_audio_copy(params, &task_id, start, &mut progress_cb, &mut log_cb);
        }

        match Self::convert_video_copy(params, &task_id, start, &mut progress_cb, &mut log_cb) {
            Ok(result) => Ok(result),
            Err(e) => {
                let err_msg = e.to_string();
                log_cb(VideoToolLog {
                    task_id: task_id.clone(),
                    level: "warn".to_string(),
                    message: format!("快速转换失败 ({}), 自动切换到重编码模式", err_msg),
                    timestamp: now_ms(),
                });
                progress_cb(VideoToolProgress {
                    task_id: task_id.clone(),
                    progress: 0.0,
                    current_step: "reencoding".to_string(),
                    elapsed_ms: start.elapsed().as_millis() as u64,
                    ..Default::default()
                });
                Self::convert_video_reencode(params, &task_id, start, &mut progress_cb, &mut log_cb)
            }
        }
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

        let now_ms = || {
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis() as u64
        };

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

    fn convert_audio_copy<P, L>(
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
        let now_ms = || {
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis() as u64
        };

        let format_str = match &params.target {
            ConversionTarget::AudioFormat(f) => f.clone(),
            _ => unreachable!(),
        };

        let mut input = ffmpeg_next::format::input(&params.input_path)
            .map_err(|e| anyhow!("打开输入文件失败: {}", e))?;

        let mut output = ffmpeg_next::format::output_as(&params.output_path, Self::normalize_format_name(&format_str))
            .map_err(|e| anyhow!("创建输出失败: {}", e))?;

        let mut stream_mapping: Vec<Option<usize>> = vec![None; input.nb_streams() as usize];
        let mut out_stream_count: usize = 0;

        for stream in input.streams() {
            if stream.parameters().medium() == ffmpeg_next::media::Type::Audio {
                stream_mapping[stream.index()] = Some(out_stream_count);
                out_stream_count += 1;

                let mut out_stream = output
                    .add_stream(None)
                    .map_err(|e| anyhow!("添加音频流失败: {}", e))?;
                out_stream.set_parameters(stream.parameters());
                unsafe {
                    let avstream = out_stream.as_mut_ptr();
                    (*(*avstream).codecpar).codec_tag = 0;
                }
                out_stream.set_time_base(stream.time_base());
            }
        }

        if out_stream_count == 0 {
            return Err(anyhow!("输入文件中未找到音频流"));
        }

        output
            .write_header()
            .map_err(|e| anyhow!("写入输出头失败: {}", e))?;

        let input_duration = input.duration() as f64 / 1_000_000.0;

        for (stream, mut packet) in input.packets() {
            let out_idx = match stream_mapping.get(stream.index()).and_then(|m| *m) {
                Some(idx) => idx,
                None => continue,
            };

            let out_st = output
                .stream(out_idx)
                .ok_or_else(|| anyhow!("输出流索引越界"))?;
            packet.rescale_ts(stream.time_base(), out_st.time_base());
            packet.set_stream(out_idx);
            packet.set_position(-1);

            packet
                .write_interleaved(&mut output)
                .map_err(|e| anyhow!("写入 packet 失败: {}", e))?;

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
                "音频提取完成，文件大小 {}，耗时 {:.1} 秒",
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

    fn convert_video_copy<P, L>(
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
        let now_ms = || {
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis() as u64
        };

        let format_str = match &params.target {
            ConversionTarget::VideoFormat(f) => f.clone(),
            _ => unreachable!(),
        };

        log_cb(VideoToolLog {
            task_id: task_id.to_string(),
            level: "info".to_string(),
            message: "使用流复制快速转换模式".to_string(),
            timestamp: now_ms(),
        });

        let mut input = ffmpeg_next::format::input(&params.input_path)
            .map_err(|e| anyhow!("打开输入文件失败: {}", e))?;

        if Self::is_ts_format(&params.input_path) {
            return Err(anyhow!(
                "MPEG-TS 格式不支持直接流复制到 {}，需要重编码",
                format_str
            ));
        }

        for stream in input.streams() {
            if stream.parameters().medium() == ffmpeg_next::media::Type::Video {
                let codec_id = stream.parameters().id();
                let incompatible = match format_str.as_str() {
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
                        format_str
                    ));
                }
            }
            if stream.parameters().medium() == ffmpeg_next::media::Type::Audio {
                let audio_codec_id = stream.parameters().id();
                if !Self::is_audio_compatible(audio_codec_id, &format_str) {
                    return Err(anyhow!(
                        "音频编码 {:?} 与输出格式 {} 不兼容，需要重编码",
                        audio_codec_id,
                        format_str
                    ));
                }
            }
        }

        let mut output = ffmpeg_next::format::output_as(&params.output_path, Self::normalize_format_name(&format_str))
            .map_err(|e| anyhow!("创建输出失败: {}", e))?;

        let mut stream_mapping: Vec<Option<usize>> = vec![None; input.nb_streams() as usize];
        let mut out_stream_count: usize = 0;

        let supports_cover = !matches!(format_str.as_str(), "flv");
        for stream in input.streams() {
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
                    .map_err(|e| anyhow!("添加流失败: {}", e))?;
                out_stream.set_parameters(stream.parameters());
                unsafe {
                    let avstream = out_stream.as_mut_ptr();
                    (*(*avstream).codecpar).codec_tag = 0;
                }
                out_stream.set_time_base(stream.time_base());
            }
        }

        if out_stream_count == 0 {
            return Err(anyhow!("输入文件中未找到视频或音频流"));
        }

        output
            .write_header()
            .map_err(|e| anyhow!("写入输出头失败: {}", e))?;

        let input_duration = input.duration() as f64 / 1_000_000.0;

        for (stream, mut packet) in input.packets() {
            let out_idx = match stream_mapping.get(stream.index()).and_then(|m| *m) {
                Some(idx) => idx,
                None => continue,
            };

            let out_st = output
                .stream(out_idx)
                .ok_or_else(|| anyhow!("输出流索引越界"))?;
            packet.rescale_ts(stream.time_base(), out_st.time_base());
            packet.set_stream(out_idx);
            packet.set_position(-1);

            packet
                .write_interleaved(&mut output)
                .map_err(|e| anyhow!("写入 packet 失败: {}", e))?;

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

    fn convert_video_reencode<P, L>(
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
        let now_ms = || {
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis() as u64
        };

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

        let codec_candidates: &[&str] = match format_str.as_str() {
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

        let mut has_audio = false;
        let first_audio_codec = input
            .streams()
            .best(ffmpeg_next::media::Type::Audio)
            .map(|s| s.parameters().id());
        if let Some(audio_codec_id) = first_audio_codec {
            let audio_compatible = Self::is_audio_compatible(audio_codec_id, &format_str);
            if audio_compatible {
                has_audio = true;
            } else {
                log_cb(VideoToolLog {
                    task_id: task_id.to_string(),
                    level: "warn".to_string(),
                    message: format!(
                        "音频编码 {:?} 与输出格式 {} 不兼容，将跳过音频",
                        audio_codec_id, format_str
                    ),
                    timestamp: now_ms(),
                });
            }
        }

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

        if has_audio && Self::is_ts_format(&params.input_path) {
            log_cb(VideoToolLog {
                task_id: task_id.to_string(),
                level: "warn".to_string(),
                message: "MPEG-TS 音频格式与输出容器不兼容，将跳过音频".to_string(),
                timestamp: now_ms(),
            });
            has_audio = false;
        }

        if has_audio {
            let audio_stream = input
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

        let mut audio_packets: Vec<(ffmpeg_next::Packet, ffmpeg_next::Rational)> = Vec::new();
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

                    encode_and_write(&mut encoder, Some(&frame), &mut output)?;

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
                let audio_compatible =
                    Self::is_audio_compatible(stream.parameters().id(), &format_str);
                if audio_compatible {
                    audio_packets.push((packet, stream.time_base()));
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

            let mut frame = yuv_frame;
            frame.set_pts(Some(frame_count as i64));
            frame_count += 1;

            encode_and_write(&mut encoder, Some(&frame), &mut output)?;
        }

        encode_and_write(&mut encoder, None, &mut output)?;

        if has_audio {
            for (mut packet, in_tb) in audio_packets.drain(..) {
                packet.set_stream(1);
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
