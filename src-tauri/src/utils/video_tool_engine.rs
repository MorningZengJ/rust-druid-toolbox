use crate::model::video_tool_state::*;
use anyhow::{anyhow, Result};
use std::time::Instant;

pub struct VideoToolEngine;

impl VideoToolEngine {
    /// 计算保持宽高比的缩放尺寸，返回 (缩放后宽度, 缩放后高度)
    fn calculate_aspect_ratio_resize(
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
            // 源视频更宽，以目标宽度为基准
            let scaled_height = (target_width as f64 / src_ratio) as u32;
            (target_width, scaled_height.max(1))
        } else {
            // 源视频更高，以目标高度为基准
            let scaled_width = (target_height as f64 * src_ratio) as u32;
            (scaled_width.max(1), target_height)
        };

        // 确保宽高为偶数（视频编码要求）
        (scaled_width / 2 * 2, scaled_height / 2 * 2)
    }

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

        // Try fast stream copy first; fall back to reencode on codec/format incompatibility
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

        // Open first input to get stream info for output setup
        let first_input = ffmpeg_next::format::input(&params.input_paths[0])
            .map_err(|e| anyhow!("打开第一个视频失败: {}", e))?;

        // Check codec/format compatibility before attempting stream copy
        // FLV only supports flv1/h264/vp6a/vp6f; webm only supports vp8/vp9/opus/vorbis
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
            &params.output_format,
        )
        .map_err(|e| anyhow!("创建输出失败: {}", e))?;

        // Build stream mapping from first input
        let mut stream_mapping: Vec<Option<usize>> = vec![None; first_input.nb_streams() as usize];
        let mut out_stream_count: usize = 0;

        for stream in first_input.streams() {
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

        if out_stream_count == 0 {
            return Err(anyhow!("第一个视频中未找到视频或音频流"));
        }

        output
            .write_header()
            .map_err(|e| anyhow!("写入输出头失败: {}", e))?;

        let total_inputs = params.input_paths.len();
        // Track last DTS per output stream in output time_base for timestamp continuity
        let mut last_dts: Vec<i64> = vec![i64::MIN; out_stream_count];
        // Track cumulative DTS offsets per output stream in output time_base
        let mut dts_offsets: Vec<i64> = vec![0; out_stream_count];
        // Whether we've seen the first packet for each stream in the current file
        let mut seen_first: Vec<bool>;
        // Track stream index mapping per file (input stream index -> output stream index)
        let mut file_stream_mapping: Vec<Option<usize>>;

        for (file_idx, input_path) in params.input_paths.iter().enumerate() {
            log_cb(VideoToolLog {
                task_id: task_id.to_string(),
                level: "info".to_string(),
                message: format!("处理第 {}/{} 个文件", file_idx + 1, total_inputs),
                timestamp: now_ms(),
            });

            let mut input = ffmpeg_next::format::input(input_path)
                .map_err(|e| anyhow!("打开视频 {} 失败: {}", input_path.display(), e))?;

            // Build per-file stream mapping
            file_stream_mapping = vec![None; input.nb_streams() as usize];
            let mut out_idx = 0;
            for stream in input.streams() {
                let media_type = stream.parameters().medium();
                if media_type == ffmpeg_next::media::Type::Video
                    || media_type == ffmpeg_next::media::Type::Audio
                {
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

                // Rescale timestamps to output time_base first
                packet.rescale_ts(in_tb, out_tb);

                // Adjust timestamps for continuity across files
                if file_idx > 0 {
                    let raw_dts = packet.dts().unwrap_or_else(|| packet.pts().unwrap_or(0));

                    // On first packet of each stream in a new file, compute the offset
                    if !seen_first[out_idx] {
                        seen_first[out_idx] = true;
                        if last_dts[out_idx] != i64::MIN {
                            // Offset so that this packet's DTS = last_dts + 1
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

                // Update last_dts tracking (in output time_base)
                let current_dts = packet.dts().unwrap_or_else(|| packet.pts().unwrap_or(0));
                if current_dts > last_dts[out_idx] {
                    last_dts[out_idx] = current_dts;
                }

                packet.set_stream(out_idx);
                packet.set_position(-1);

                packet
                    .write_interleaved(&mut output)
                    .map_err(|e| anyhow!("写入 packet 失败: {}", e))?;
            }

            let progress = (file_idx + 1) as f32 / total_inputs as f32;
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

        // Find a suitable video encoder for the output format
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

        // Open first input to determine output dimensions
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

        // Determine audio codec compatibility
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

        // Create output
        let mut output = ffmpeg_next::format::output_as(
            &params.output_path,
            &params.output_format,
        )
        .map_err(|e| anyhow!("创建输出失败: {}", e))?;

        // Add encoded video stream (must be first for encode_and_write to use stream 0)
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
        encoder_ctx.set_time_base(ffmpeg_next::Rational::new(1, 25));
        encoder_ctx.set_format(ffmpeg_next::format::Pixel::YUV420P);
        encoder_ctx.set_bit_rate(first_decoder.bit_rate().max(2_000_000));
        if codec_name.starts_with("libx264") || codec_name.starts_with("libx265") {
            encoder_ctx.set_gop(250);
        }
        out_video.set_time_base(ffmpeg_next::Rational::new(1, 25));

        let mut encoder = encoder_ctx
            .open_as(codec)
            .map_err(|e| anyhow!("打开编码器失败: {}", e))?;
        out_video.set_parameters(&encoder);

        // Add audio stream if compatible (already determined above)
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
            out_audio.set_time_base(audio_tb);
        }

        output
            .write_header()
            .map_err(|e| anyhow!("写入输出头失败: {}", e))?;

        let enc_tb = ffmpeg_next::Rational::new(1, 25);
        let mut frame_count: u64 = 0;
        let total = params.input_paths.len();

        // Helper: encode a single frame and write packets
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

            let mut input = ffmpeg_next::format::input(input_path)
                .map_err(|e| anyhow!("打开视频 {} 失败: {}", input_path.display(), e))?;

            // Find video stream in this input
            let video_stream = input
                .streams()
                .best(ffmpeg_next::media::Type::Video)
                .ok_or_else(|| anyhow!("视频 {} 中未找到视频流", input_path.display()))?;

            // Create a fresh decoder for this file
            let decoder_ctx =
                ffmpeg_next::codec::context::Context::from_parameters(video_stream.parameters())
                    .map_err(|e| anyhow!("创建解码上下文失败: {}", e))?;
            let mut decoder = decoder_ctx
                .decoder()
                .video()
                .map_err(|e| anyhow!("创建视频解码器失败: {}", e))?;

            // 计算保持宽高比的缩放尺寸
            let (scaled_width, scaled_height) = Self::calculate_aspect_ratio_resize(
                decoder.width(),
                decoder.height(),
                width,
                height,
            );

            // 判断是否需要添加黑边（当缩放后的尺寸与目标尺寸不同时）
            let needs_padding = scaled_width != width || scaled_height != height;
            let x_offset = if needs_padding { (width - scaled_width) / 2 } else { 0 };
            let y_offset = if needs_padding { (height - scaled_height) / 2 } else { 0 };

            // Create SwsContext for this file's pixel format
            // 如果需要添加黑边，先缩放到保持宽高比的尺寸
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

            // Collect audio packets separately for remuxing
            let mut audio_packets: Vec<(ffmpeg_next::Packet, ffmpeg_next::Rational)> =
                Vec::new();

            for (stream, packet) in input.packets() {
                let media_type = stream.parameters().medium();

                if media_type == ffmpeg_next::media::Type::Video {
                    decoder
                        .send_packet(&packet)
                        .map_err(|e| anyhow!("发送 packet 到解码器失败: {}", e))?;

                    let mut decoded = ffmpeg_next::frame::Video::empty();
                    while decoder.receive_frame(&mut decoded).is_ok() {
                        let mut yuv_frame = ffmpeg_next::util::frame::video::Video::new(
                            ffmpeg_next::format::Pixel::YUV420P,
                            width,
                            height,
                        );

                        if needs_padding {
                            // 创建中间帧用于缩放（保持宽高比）
                            let mut scaled_frame = ffmpeg_next::util::frame::video::Video::new(
                                ffmpeg_next::format::Pixel::YUV420P,
                                scaled_width,
                                scaled_height,
                            );
                            sws_ctx
                                .run(&decoded, &mut scaled_frame)
                                .map_err(|e| anyhow!("颜色空间转换失败: {}", e))?;

                            // 获取行间距（linesize），FFmpeg 可能在每行末尾有填充字节
                            let src_y_linesize = scaled_frame.stride(0);
                            let src_u_linesize = scaled_frame.stride(1);
                            let src_v_linesize = scaled_frame.stride(2);
                            let dst_y_linesize = yuv_frame.stride(0);
                            let dst_u_linesize = yuv_frame.stride(1);
                            let dst_v_linesize = yuv_frame.stride(2);

                            // 填充黑边（YUV420P 中 Y=0 为黑色，U=128, V=128）
                            // 先将整个帧填充为黑色
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

                            // 将缩放后的帧复制到目标帧的正确位置
                            // 复制 Y 平面
                            for row in 0..scaled_height as usize {
                                let src_start = row * src_y_linesize;
                                let dst_start = (row + y_offset as usize) * dst_y_linesize + x_offset as usize;
                                let src_row = &scaled_frame.data(0)[src_start..src_start + scaled_width as usize];
                                let dst_row = &mut yuv_frame.data_mut(0)[dst_start..dst_start + scaled_width as usize];
                                dst_row.copy_from_slice(src_row);
                            }

                            // 复制 U 平面
                            for row in 0..(scaled_height / 2) as usize {
                                let src_start = row * src_u_linesize;
                                let dst_start = (row + (y_offset / 2) as usize) * dst_u_linesize + (x_offset / 2) as usize;
                                let src_row = &scaled_frame.data(1)[src_start..src_start + (scaled_width / 2) as usize];
                                let dst_row = &mut yuv_frame.data_mut(1)[dst_start..dst_start + (scaled_width / 2) as usize];
                                dst_row.copy_from_slice(src_row);
                            }

                            // 复制 V 平面
                            for row in 0..(scaled_height / 2) as usize {
                                let src_start = row * src_v_linesize;
                                let dst_start = (row + (y_offset / 2) as usize) * dst_v_linesize + (x_offset / 2) as usize;
                                let src_row = &scaled_frame.data(2)[src_start..src_start + (scaled_width / 2) as usize];
                                let dst_row = &mut yuv_frame.data_mut(2)[dst_start..dst_start + (scaled_width / 2) as usize];
                                dst_row.copy_from_slice(src_row);
                            }
                        } else {
                            // 不需要添加黑边，直接缩放
                            sws_ctx
                                .run(&decoded, &mut yuv_frame)
                                .map_err(|e| anyhow!("颜色空间转换失败: {}", e))?;
                        }

                        yuv_frame.set_pts(Some(frame_count as i64));
                        frame_count += 1;

                        encode_and_write(&mut encoder, Some(&yuv_frame), &mut output)?;
                    }
                } else if media_type == ffmpeg_next::media::Type::Audio && has_audio {
                    // Check per-file audio compatibility before collecting
                    let audio_compatible =
                        Self::is_audio_compatible(stream.parameters().id(), &params.output_format);
                    if audio_compatible {
                        audio_packets.push((packet, stream.time_base()));
                    }
                }
            }

            // Flush decoder for this file
            decoder.send_eof().ok();
            let mut decoded = ffmpeg_next::frame::Video::empty();
            while decoder.receive_frame(&mut decoded).is_ok() {
                let mut yuv_frame = ffmpeg_next::util::frame::video::Video::new(
                    ffmpeg_next::format::Pixel::YUV420P,
                    width,
                    height,
                );

                if needs_padding {
                    // 创建中间帧用于缩放（保持宽高比）
                    let mut scaled_frame = ffmpeg_next::util::frame::video::Video::new(
                        ffmpeg_next::format::Pixel::YUV420P,
                        scaled_width,
                        scaled_height,
                    );
                    sws_ctx
                        .run(&decoded, &mut scaled_frame)
                        .map_err(|e| anyhow!("颜色空间转换失败: {}", e))?;

                    // 获取行间距（linesize），FFmpeg 可能在每行末尾有填充字节
                    let src_y_linesize = scaled_frame.stride(0);
                    let src_u_linesize = scaled_frame.stride(1);
                    let src_v_linesize = scaled_frame.stride(2);
                    let dst_y_linesize = yuv_frame.stride(0);
                    let dst_u_linesize = yuv_frame.stride(1);
                    let dst_v_linesize = yuv_frame.stride(2);

                    // 填充黑边（YUV420P 中 Y=0 为黑色，U=128, V=128）
                    // 先将整个帧填充为黑色
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

                    // 将缩放后的帧复制到目标帧的正确位置
                    // 复制 Y 平面
                    for row in 0..scaled_height as usize {
                        let src_start = row * src_y_linesize;
                        let dst_start = (row + y_offset as usize) * dst_y_linesize + x_offset as usize;
                        let src_row = &scaled_frame.data(0)[src_start..src_start + scaled_width as usize];
                        let dst_row = &mut yuv_frame.data_mut(0)[dst_start..dst_start + scaled_width as usize];
                        dst_row.copy_from_slice(src_row);
                    }

                    // 复制 U 平面
                    for row in 0..(scaled_height / 2) as usize {
                        let src_start = row * src_u_linesize;
                        let dst_start = (row + (y_offset / 2) as usize) * dst_u_linesize + (x_offset / 2) as usize;
                        let src_row = &scaled_frame.data(1)[src_start..src_start + (scaled_width / 2) as usize];
                        let dst_row = &mut yuv_frame.data_mut(1)[dst_start..dst_start + (scaled_width / 2) as usize];
                        dst_row.copy_from_slice(src_row);
                    }

                    // 复制 V 平面
                    for row in 0..(scaled_height / 2) as usize {
                        let src_start = row * src_v_linesize;
                        let dst_start = (row + (y_offset / 2) as usize) * dst_v_linesize + (x_offset / 2) as usize;
                        let src_row = &scaled_frame.data(2)[src_start..src_start + (scaled_width / 2) as usize];
                        let dst_row = &mut yuv_frame.data_mut(2)[dst_start..dst_start + (scaled_width / 2) as usize];
                        dst_row.copy_from_slice(src_row);
                    }
                } else {
                    // 不需要添加黑边，直接缩放
                    sws_ctx
                        .run(&decoded, &mut yuv_frame)
                        .map_err(|e| anyhow!("颜色空间转换失败: {}", e))?;
                }

                yuv_frame.set_pts(Some(frame_count as i64));
                frame_count += 1;

                encode_and_write(&mut encoder, Some(&yuv_frame), &mut output)?;
            }

            // Remux collected audio packets
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

            let progress = (i + 1) as f32 / total as f32;
            progress_cb(VideoToolProgress {
                task_id: task_id.to_string(),
                progress,
                current_step: "reencoding".to_string(),
                elapsed_ms: start.elapsed().as_millis() as u64,
            });
        }

        // Flush encoder
        encode_and_write(&mut encoder, None, &mut output)?;

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

    fn is_audio_compatible(codec_id: ffmpeg_next::codec::Id, output_format: &str) -> bool {
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
            "flv" => {
                // FLV only supports flv1/h264/vp6a/vp6f
                let candidates = ["libx264", "libx264rgb", "flv", "mpeg4"];
                candidates
                    .iter()
                    .find(|&&name| ffmpeg_next::codec::encoder::find_by_name(name).is_some())
                    .copied()
                    .ok_or_else(|| anyhow!("未找到可用的视频编码器"))?
            }
            "webm" => {
                let candidates = ["libvpx", "libvpx-vp9", "libx264"];
                candidates
                    .iter()
                    .find(|&&name| ffmpeg_next::codec::encoder::find_by_name(name).is_some())
                    .copied()
                    .ok_or_else(|| anyhow!("未找到可用的视频编码器"))?
            }
            _ => {
                let candidates = ["libx264", "libx264rgb", "libx265", "mpeg4"];
                candidates
                    .iter()
                    .find(|&&name| ffmpeg_next::codec::encoder::find_by_name(name).is_some())
                    .copied()
                    .ok_or_else(|| anyhow!(
                        "未找到可用的视频编码器。请确保已安装包含 libx264 或 libx265 的 FFmpeg。\
                        可以从 https://ffmpeg.org/download.html 下载完整版 FFmpeg。"
                    ))?
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
            // 音频提取：保持流复制
            return Self::convert_audio_copy(params, &task_id, start, &mut progress_cb, &mut log_cb);
        }

        // 视频转换：两阶段策略
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
                });
                Self::convert_video_reencode(params, &task_id, start, &mut progress_cb, &mut log_cb)
            }
        }
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

        let mut output = ffmpeg_next::format::output_as(&params.output_path, &format_str)
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

        // Check codec/format compatibility before attempting stream copy
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

        let mut output = ffmpeg_next::format::output_as(&params.output_path, &format_str)
            .map_err(|e| anyhow!("创建输出失败: {}", e))?;

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
                    .map_err(|e| anyhow!("添加流失败: {}", e))?;
                out_stream.set_parameters(stream.parameters());
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

        // Find a suitable video encoder for the output format
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

        // Open input to determine output dimensions
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

        // Use user-specified resolution or fall back to source dimensions
        let (target_width, target_height) = if let Some((w, h)) = params.resolution {
            (w, h)
        } else {
            (decoder.width(), decoder.height())
        };
        let width = target_width / 2 * 2;
        let height = target_height / 2 * 2;

        // Parse user-specified video bitrate
        let bit_rate = params
            .video_bitrate
            .as_deref()
            .and_then(Self::parse_bitrate)
            .unwrap_or_else(|| decoder.bit_rate().max(2_000_000));

        // Determine audio codec compatibility
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

        // Create output
        let mut output = ffmpeg_next::format::output_as(&params.output_path, &format_str)
            .map_err(|e| anyhow!("创建输出失败: {}", e))?;

        // Add encoded video stream
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
        encoder_ctx.set_time_base(ffmpeg_next::Rational::new(1, 25));
        encoder_ctx.set_format(ffmpeg_next::format::Pixel::YUV420P);
        encoder_ctx.set_bit_rate(bit_rate);
        if codec_name.starts_with("libx264") || codec_name.starts_with("libx265") {
            encoder_ctx.set_gop(250);
        }
        out_video.set_time_base(ffmpeg_next::Rational::new(1, 25));

        let mut encoder = encoder_ctx
            .open_as(codec)
            .map_err(|e| anyhow!("打开编码器失败: {}", e))?;
        out_video.set_parameters(&encoder);

        // Add audio stream if compatible
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
            out_audio.set_time_base(audio_tb);
        }

        output
            .write_header()
            .map_err(|e| anyhow!("写入输出头失败: {}", e))?;

        // Re-open input for decoding (the previous handle was consumed by stream inspection)
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

        // 计算保持宽高比的缩放尺寸
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

        let enc_tb = ffmpeg_next::Rational::new(1, 25);
        let mut frame_count: u64 = 0;

        // Helper: encode a single frame and write packets
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

        // Helper: scale and pad a decoded frame
        let scale_and_pad =
            |decoded: &ffmpeg_next::frame::Video,
             sws_ctx: &mut ffmpeg_next::software::scaling::Context,
             width: u32,
             height: u32,
             scaled_width: u32,
             scaled_height: u32,
             x_offset: u32,
             y_offset: u32,
             needs_padding: bool|
             -> Result<ffmpeg_next::util::frame::video::Video> {
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

                    // Fill with black
                    for row in 0..height as usize {
                        let dst_start = row * dst_y_linesize;
                        yuv_frame.data_mut(0)[dst_start..dst_start + width as usize].fill(0);
                    }
                    for row in 0..(height / 2) as usize {
                        let dst_start = row * dst_u_linesize;
                        yuv_frame.data_mut(1)[dst_start..dst_start + (width / 2) as usize]
                            .fill(128);
                    }
                    for row in 0..(height / 2) as usize {
                        let dst_start = row * dst_v_linesize;
                        yuv_frame.data_mut(2)[dst_start..dst_start + (width / 2) as usize]
                            .fill(128);
                    }

                    // Copy Y plane
                    for row in 0..scaled_height as usize {
                        let src_start = row * src_y_linesize;
                        let dst_start =
                            (row + y_offset as usize) * dst_y_linesize + x_offset as usize;
                        let src_row = &scaled_frame.data(0)
                            [src_start..src_start + scaled_width as usize];
                        let dst_row = &mut yuv_frame.data_mut(0)
                            [dst_start..dst_start + scaled_width as usize];
                        dst_row.copy_from_slice(src_row);
                    }

                    // Copy U plane
                    for row in 0..(scaled_height / 2) as usize {
                        let src_start = row * src_u_linesize;
                        let dst_start = (row + (y_offset / 2) as usize) * dst_u_linesize
                            + (x_offset / 2) as usize;
                        let src_row = &scaled_frame.data(1)
                            [src_start..src_start + (scaled_width / 2) as usize];
                        let dst_row = &mut yuv_frame.data_mut(1)
                            [dst_start..dst_start + (scaled_width / 2) as usize];
                        dst_row.copy_from_slice(src_row);
                    }

                    // Copy V plane
                    for row in 0..(scaled_height / 2) as usize {
                        let src_start = row * src_v_linesize;
                        let dst_start = (row + (y_offset / 2) as usize) * dst_v_linesize
                            + (x_offset / 2) as usize;
                        let src_row = &scaled_frame.data(2)
                            [src_start..src_start + (scaled_width / 2) as usize];
                        let dst_row = &mut yuv_frame.data_mut(2)
                            [dst_start..dst_start + (scaled_width / 2) as usize];
                        dst_row.copy_from_slice(src_row);
                    }
                } else {
                    sws_ctx
                        .run(decoded, &mut yuv_frame)
                        .map_err(|e| anyhow!("颜色空间转换失败: {}", e))?;
                }

                Ok(yuv_frame)
            };

        // Collect audio packets for remuxing
        let mut audio_packets: Vec<(ffmpeg_next::Packet, ffmpeg_next::Rational)> = Vec::new();

        for (stream, packet) in input.packets() {
            let media_type = stream.parameters().medium();

            if media_type == ffmpeg_next::media::Type::Video {
                decoder
                    .send_packet(&packet)
                    .map_err(|e| anyhow!("发送 packet 到解码器失败: {}", e))?;

                let mut decoded = ffmpeg_next::frame::Video::empty();
                while decoder.receive_frame(&mut decoded).is_ok() {
                    let yuv_frame = scale_and_pad(
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
            } else if media_type == ffmpeg_next::media::Type::Audio && has_audio {
                let audio_compatible =
                    Self::is_audio_compatible(stream.parameters().id(), &format_str);
                if audio_compatible {
                    audio_packets.push((packet, stream.time_base()));
                }
            }
        }

        // Flush decoder
        decoder.send_eof().ok();
        let mut decoded = ffmpeg_next::frame::Video::empty();
        while decoder.receive_frame(&mut decoded).is_ok() {
            let yuv_frame = scale_and_pad(
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

        // Flush encoder
        encode_and_write(&mut encoder, None, &mut output)?;

        // Remux collected audio packets
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

    /// Parse a bitrate string like "5M", "2000k", "1500000" to bits/sec
    fn parse_bitrate(s: &str) -> Option<usize> {
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
