use crate::model::live_record_state::{
    LiveRecordLogEntry, PreviewFrame, RecordParams, RecordProgressInfo, RecordingStatus,
};
use anyhow::{anyhow, Result};
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::{Instant, SystemTime, UNIX_EPOCH};

/// remux_loop 退出原因
enum RemuxResult {
    /// 分段时长到达，需要继续下一段
    SegmentComplete,
    /// 用户停止或流结束
    Done,
}

pub struct LiveRecordEngine;

impl LiveRecordEngine {
    pub fn start_recording<P, L, F>(
        params: &RecordParams,
        task_id: &str,
        stop_flag: Arc<AtomicBool>,
        mut progress_cb: P,
        mut log_cb: L,
        preview_cb: F,
    ) -> Result<()>
    where
        P: FnMut(RecordProgressInfo),
        L: FnMut(LiveRecordLogEntry),
        F: FnMut(PreviewFrame) + Send + 'static,
    {
        ffmpeg_next::init().map_err(|e| anyhow!("FFmpeg 初始化失败: {}", e))?;

        std::fs::create_dir_all(&params.output_dir)
            .map_err(|e| anyhow!("创建输出目录失败: {}", e))?;

        let now_ms = || {
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis() as u64
        };

        // R6: streamCopy 参数提示
        let mut params = params.clone();
        if !params.stream_copy {
            log_cb(LiveRecordLogEntry {
                task_id: task_id.to_string(),
                level: "warn".to_string(),
                message: "当前版本仅支持流复制模式，已自动启用".to_string(),
                timestamp: now_ms(),
            });
            params.stream_copy = true;
        }

        log_cb(LiveRecordLogEntry {
            task_id: task_id.to_string(),
            level: "info".to_string(),
            message: format!("正在连接: {}", params.url),
            timestamp: now_ms(),
        });

        let mut input = ffmpeg_next::format::input(&params.url)
            .map_err(|e| anyhow!("无法打开流: {}", e))?;

        log_cb(LiveRecordLogEntry {
            task_id: task_id.to_string(),
            level: "info".to_string(),
            message: "连接成功，开始录制".to_string(),
            timestamp: now_ms(),
        });

        // Build stream mapping: only record best video + audio
        let mut stream_mapping: Vec<Option<usize>> = vec![None; input.nb_streams() as usize];
        let mut out_stream_count: usize = 0;
        let mut has_video = false;
        let mut has_audio = false;

        for stream in input.streams() {
            let media_type = stream.parameters().medium();
            if !has_video && media_type == ffmpeg_next::media::Type::Video {
                stream_mapping[stream.index()] = Some(out_stream_count);
                out_stream_count += 1;
                has_video = true;
            } else if !has_audio && media_type == ffmpeg_next::media::Type::Audio {
                stream_mapping[stream.index()] = Some(out_stream_count);
                out_stream_count += 1;
                has_audio = true;
            }
        }

        if !has_video {
            return Err(anyhow!("流中未找到视频轨"));
        }

        // Segment state
        let segment_duration = params
            .segment_duration_secs
            .filter(|&d| d > 0)
            .map(|d| d as u64);

        let mut segment_index: u32 = 1;

        // Preview thread (if enabled)
        let preview_handle = if params.preview_enabled {
            let url = params.url.clone();
            let tid = task_id.to_string();
            let flag = stop_flag.clone();
            let interval = params.preview_interval_ms;
            Some(std::thread::spawn(move || {
                Self::preview_loop(&url, &tid, interval, flag, preview_cb);
            }))
        } else {
            None
        };

        // R1: Outer loop for segment continuation
        let record_start = Instant::now();

        loop {
            let mut output_path = Self::make_output_path(&params, segment_index);
            let mut segment_start = Instant::now();

            // Create output for this segment
            let mut output = Self::create_output(
                &params.url,
                &output_path,
                &params,
                &input,
                &stream_mapping,
                out_stream_count,
            )?;

            let mut last_progress_time = Instant::now();

            let remux_result = Self::remux_loop(
                &mut input,
                &mut output,
                &stream_mapping,
                stop_flag.clone(),
                segment_duration,
                &mut segment_index,
                &mut output_path,
                &mut segment_start,
                &params,
                record_start,
                &mut last_progress_time,
                task_id,
                &mut progress_cb,
                &mut log_cb,
            );

            // R4: Log trailer write errors instead of silently ignoring
            if let Err(e) = output.write_trailer() {
                log_cb(LiveRecordLogEntry {
                    task_id: task_id.to_string(),
                    level: "warn".to_string(),
                    message: format!("写入文件尾失败: {}", e),
                    timestamp: now_ms(),
                });
            }

            match remux_result {
                Ok(RemuxResult::SegmentComplete) => {
                    log_cb(LiveRecordLogEntry {
                        task_id: task_id.to_string(),
                        level: "info".to_string(),
                        message: format!("分段 {} 完成", segment_index),
                        timestamp: now_ms(),
                    });
                    segment_index += 1;
                    // Continue loop to create next segment
                    // Re-open input for the new segment
                    input = ffmpeg_next::format::input(&params.url)
                        .map_err(|e| anyhow!("重新连接流失败: {}", e))?;
                    continue;
                }
                Ok(RemuxResult::Done) => {
                    break;
                }
                Err(e) => {
                    log_cb(LiveRecordLogEntry {
                        task_id: task_id.to_string(),
                        level: "error".to_string(),
                        message: format!("录制错误: {}", e),
                        timestamp: now_ms(),
                    });
                    if let Some(h) = preview_handle {
                        let _ = h.join();
                    }
                    return Err(e);
                }
            }
        }

        let elapsed = record_start.elapsed().as_secs_f64();
        log_cb(LiveRecordLogEntry {
            task_id: task_id.to_string(),
            level: "info".to_string(),
            message: format!("录制结束，总时长 {:.1} 秒，共 {} 个分段", elapsed, segment_index),
            timestamp: now_ms(),
        });

        if let Some(h) = preview_handle {
            let _ = h.join();
        }

        Ok(())
    }

    fn remux_loop<P, L>(
        input: &mut ffmpeg_next::format::context::Input,
        output: &mut ffmpeg_next::format::context::Output,
        stream_mapping: &[Option<usize>],
        stop_flag: Arc<AtomicBool>,
        segment_duration: Option<u64>,
        segment_index: &mut u32,
        output_path: &mut PathBuf,
        segment_start: &mut Instant,
        _params: &RecordParams,
        record_start: Instant,
        last_progress_time: &mut Instant,
        task_id: &str,
        progress_cb: &mut P,
        _log_cb: &mut L,
    ) -> Result<RemuxResult>
    where
        P: FnMut(RecordProgressInfo),
        L: FnMut(LiveRecordLogEntry),
    {
        // R7: 发送 Recording 状态事件，通知前端状态切换
        progress_cb(RecordProgressInfo {
            task_id: task_id.to_string(),
            status: RecordingStatus::Recording,
            duration_secs: 0.0,
            file_size_bytes: 0,
            bitrate_kbps: 0.0,
            current_segment: *segment_index,
            output_path: output_path.to_string_lossy().to_string(),
        });

        for (stream, mut packet) in input.packets() {
            if stop_flag.load(Ordering::Relaxed) {
                return Ok(RemuxResult::Done);
            }

            let in_idx = stream.index();
            let out_idx = match stream_mapping.get(in_idx).and_then(|m| *m) {
                Some(idx) => idx,
                None => continue,
            };

            // R2: Replace unwrap with error handling
            let out_st = output
                .stream(out_idx as usize)
                .ok_or_else(|| anyhow!("输出流索引 {} 越界", out_idx))?;
            let in_tb = stream.time_base();
            let out_tb = out_st.time_base();
            packet.rescale_ts(in_tb, out_tb);
            packet.set_stream(out_idx);
            packet.set_position(-1);

            packet
                .write_interleaved(output)
                .map_err(|e| anyhow!("写入 packet 失败: {}", e))?;

            // Progress report (every ~1 second)
            if last_progress_time.elapsed().as_secs() >= 1 {
                *last_progress_time = Instant::now();
                let duration = record_start.elapsed().as_secs_f64();
                let file_size = std::fs::metadata(&**output_path)
                    .map(|m| m.len())
                    .unwrap_or(0);
                let bitrate = if duration > 0.0 {
                    file_size as f64 * 8.0 / duration / 1000.0
                } else {
                    0.0
                };

                progress_cb(RecordProgressInfo {
                    task_id: task_id.to_string(),
                    status: RecordingStatus::Recording,
                    duration_secs: duration,
                    file_size_bytes: file_size,
                    bitrate_kbps: bitrate,
                    current_segment: *segment_index,
                    output_path: output_path.to_string_lossy().to_string(),
                });
            }

            // Segment check
            if let Some(seg_dur) = segment_duration {
                if segment_start.elapsed().as_secs() >= seg_dur {
                    return Ok(RemuxResult::SegmentComplete);
                }
            }
        }

        Ok(RemuxResult::Done)
    }

    fn create_output(
        _input_url: &str,
        output_path: &PathBuf,
        params: &RecordParams,
        input: &ffmpeg_next::format::context::Input,
        stream_mapping: &[Option<usize>],
        _out_stream_count: usize,
    ) -> Result<ffmpeg_next::format::context::Output> {
        let mut output = ffmpeg_next::format::output_as(
            output_path,
            params.container_format.ffmpeg_format(),
        )
        .map_err(|e| anyhow!("创建输出失败: {}", e))?;

        // R5: MP4 容器在流复制模式下不支持 faststart，
        // moov atom 在 write_trailer 时写入，异常中断的文件不可读。
        // UI 层已添加格式选择提示，推荐 TS/MKV。

        for stream in input.streams() {
            let in_idx = stream.index();
            let _out_idx = match stream_mapping.get(in_idx).and_then(|m| *m) {
                Some(idx) => idx,
                None => continue,
            };

            let mut out_stream = output
                .add_stream(None)
                .map_err(|e| anyhow!("添加输出流失败: {}", e))?;
            out_stream.set_parameters(stream.parameters());
            out_stream.set_time_base(stream.time_base());
        }

        output
            .write_header()
            .map_err(|e| anyhow!("写入输出头失败: {}", e))?;

        Ok(output)
    }

    fn make_output_path(params: &RecordParams, segment: u32) -> PathBuf {
        let ext = params.container_format.extension();
        let filename = match params.segment_duration_secs {
            Some(d) if d > 0 => {
                format!("{}_{:04}.{}", params.filename_prefix, segment, ext)
            }
            _ => {
                format!("{}.{}", params.filename_prefix, ext)
            }
        };
        PathBuf::from(&params.output_dir).join(filename)
    }

    fn preview_loop<F>(
        url: &str,
        task_id: &str,
        interval_ms: u32,
        stop_flag: Arc<AtomicBool>,
        mut preview_cb: F,
    ) where
        F: FnMut(PreviewFrame),
    {
        // R3: Capture and report preview errors
        let result = Self::preview_loop_inner(url, task_id, interval_ms, stop_flag, &mut preview_cb);
        if let Err(e) = result {
            // Preview errors are non-fatal; log to stderr for debugging
            eprintln!("[live-record] 预览线程错误 (task {}): {}", task_id, e);
        }
    }

    fn preview_loop_inner<F>(
        url: &str,
        task_id: &str,
        interval_ms: u32,
        stop_flag: Arc<AtomicBool>,
        preview_cb: &mut F,
    ) -> Result<()>
    where
        F: FnMut(PreviewFrame),
    {
        let mut input = ffmpeg_next::format::input(url)
            .map_err(|e| anyhow!("预览连接失败: {}", e))?;

        let stream = input
            .streams()
            .best(ffmpeg_next::media::Type::Video)
            .ok_or_else(|| anyhow!("预览未找到视频流"))?;

        let stream_index = stream.index();
        let params = stream.parameters();
        let context = ffmpeg_next::codec::context::Context::from_parameters(params)
            .map_err(|e| anyhow!("预览创建编解码上下文失败: {}", e))?;
        let mut decoder = context
            .decoder()
            .video()
            .map_err(|e| anyhow!("预览创建解码器失败: {}", e))?;

        let preview_w = 480u32;
        let preview_h = {
            let aspect = decoder.height() as f64 / decoder.width() as f64;
            (preview_w as f64 * aspect).round() as u32
        };

        let mut scaler = ffmpeg_next::software::scaling::Context::get(
            decoder.format(),
            decoder.width(),
            decoder.height(),
            ffmpeg_next::format::Pixel::RGB24,
            preview_w,
            preview_h,
            ffmpeg_next::software::scaling::Flags::BILINEAR,
        )
        .map_err(|e| anyhow!("预览创建缩放器失败: {}", e))?;

        let interval = std::time::Duration::from_millis(interval_ms.max(100) as u64);
        let mut last_preview = Instant::now();
        let mut decoded_frame = ffmpeg_next::util::frame::video::Video::empty();

        for (stream, packet) in input.packets() {
            if stop_flag.load(Ordering::Relaxed) {
                break;
            }

            if stream.index() != stream_index {
                continue;
            }

            if decoder.send_packet(&packet).is_err() {
                continue;
            }

            while decoder.receive_frame(&mut decoded_frame).is_ok() {
                if last_preview.elapsed() < interval {
                    continue;
                }
                last_preview = Instant::now();

                let mut rgb_frame = ffmpeg_next::util::frame::video::Video::empty();
                if scaler.run(&decoded_frame, &mut rgb_frame).is_err() {
                    continue;
                }

                let data = rgb_frame.data(0);
                let stride = rgb_frame.stride(0);
                let bpp = 3usize;

                let mut pixels =
                    Vec::with_capacity((preview_w * preview_h * 3) as usize);
                for y in 0..preview_h as usize {
                    let row_start = y * stride;
                    let row_end = row_start + preview_w as usize * bpp;
                    if row_end <= data.len() {
                        pixels.extend_from_slice(&data[row_start..row_end]);
                    }
                }

                let img = match image::RgbImage::from_raw(preview_w, preview_h, pixels) {
                    Some(img) => image::DynamicImage::ImageRgb8(img),
                    None => continue,
                };

                let mut buf = std::io::Cursor::new(Vec::new());
                if img
                    .write_to(&mut buf, image::ImageFormat::Jpeg)
                    .is_err()
                {
                    continue;
                }

                let pts = decoded_frame.pts().unwrap_or(0) as f64
                    * stream.time_base().0 as f64
                    / stream.time_base().1 as f64;

                preview_cb(PreviewFrame {
                    task_id: task_id.to_string(),
                    jpeg_data: buf.into_inner(),
                    width: preview_w,
                    height: preview_h,
                    timestamp: pts,
                });
            }
        }

        Ok(())
    }
}
