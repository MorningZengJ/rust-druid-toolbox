use crate::model::video_frame_state::{ExtractMode, ExtractParams, ExtractedFrame, LogEntry, OutputFormat, ProgressInfo, VideoInfo};
use anyhow::{anyhow, Result};
use std::path::Path;
use std::time::Instant;

pub struct VideoFrameEngine;

impl VideoFrameEngine {
    pub fn check_ffmpeg() -> bool {
        ffmpeg_next::init().is_ok()
    }

    pub fn probe_video(path: &Path) -> Result<VideoInfo> {
        ffmpeg_next::init().map_err(|e| anyhow!("FFmpeg 初始化失败: {}", e))?;

        let input = ffmpeg_next::format::input(path)
            .map_err(|e| anyhow!("无法打开视频文件: {}", e))?;

        let stream = input
            .streams()
            .best(ffmpeg_next::media::Type::Video)
            .ok_or_else(|| anyhow!("未找到视频流"))?;

        let params = stream.parameters();
        let context = ffmpeg_next::codec::context::Context::from_parameters(params)
            .map_err(|e| anyhow!("创建编解码上下文失败: {}", e))?;
        let decoder = context.decoder().video()
            .map_err(|e| anyhow!("创建解码器失败: {}", e))?;

        let width = decoder.width();
        let height = decoder.height();

        let fps = stream.avg_frame_rate();
        let fps_value = if fps.1 > 0 { fps.0 as f64 / fps.1 as f64 } else { 30.0 };

        let duration_ts = stream.duration();
        let time_base = stream.time_base();
        let duration = if duration_ts > 0 {
            duration_ts as f64 * time_base.0 as f64 / time_base.1 as f64
        } else {
            input.duration() as f64 / 1_000_000.0
        };

        let total_frames = (duration * fps_value).ceil() as u64;

        Ok(VideoInfo {
            width,
            height,
            fps: fps_value,
            duration,
            total_frames,
        })
    }

    pub fn extract_frames<P, L>(params: &ExtractParams, output_dir: &Path, mut progress_cb: P, mut log_cb: L) -> Result<Vec<ExtractedFrame>>
    where
        P: FnMut(ProgressInfo),
        L: FnMut(LogEntry),
    {
        std::fs::create_dir_all(output_dir).map_err(|e| anyhow!("创建输出目录失败: {}", e))?;
        ffmpeg_next::init().map_err(|e| anyhow!("FFmpeg 初始化失败: {}", e))?;

        let start_time = Instant::now();
        let timestamp = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as u64;
        log_cb(LogEntry {
            level: "info".to_string(),
            message: "开始提取帧...".to_string(),
            timestamp,
        });

        let mut input = ffmpeg_next::format::input(&params.video_path)
            .map_err(|e| anyhow!("无法打开视频文件: {}", e))?;

        let stream = input
            .streams()
            .best(ffmpeg_next::media::Type::Video)
            .ok_or_else(|| anyhow!("未找到视频流"))?;

        let stream_index = stream.index();
        let params_ref = stream.parameters();
        let context = ffmpeg_next::codec::context::Context::from_parameters(params_ref)
            .map_err(|e| anyhow!("创建编解码上下文失败: {}", e))?;
        let mut decoder = context.decoder().video()
            .map_err(|e| anyhow!("创建解码器失败: {}", e))?;

        let fps = stream.avg_frame_rate();
        let fps_value = if fps.1 > 0 { fps.0 as f64 / fps.1 as f64 } else { 30.0 };

        let duration_ts = stream.duration();
        let time_base = stream.time_base();
        let duration = if duration_ts > 0 {
            duration_ts as f64 * time_base.0 as f64 / time_base.1 as f64
        } else {
            input.duration() as f64 / 1_000_000.0
        };

        let out_w = params.resize_width.unwrap_or(decoder.width());
        let out_h = if let Some(w) = params.resize_width {
            let aspect = decoder.height() as f64 / decoder.width() as f64;
            (w as f64 * aspect).round() as u32
        } else {
            decoder.height()
        };

        let target_timestamps = Self::calculate_timestamps(
            &params.mode,
            duration,
            fps_value,
            params.interval_secs,
            params.frame_count as usize,
            &params.time_points,
        );
        let total_targets = target_timestamps.len();

        let timestamp = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as u64;
        log_cb(LogEntry {
            level: "info".to_string(),
            message: format!("计划提取 {} 帧", total_targets),
            timestamp,
        });

        let mut scaler = ffmpeg_next::software::scaling::Context::get(
            decoder.format(),
            decoder.width(),
            decoder.height(),
            ffmpeg_next::format::Pixel::RGB24,
            out_w,
            out_h,
            ffmpeg_next::software::scaling::Flags::BILINEAR,
        ).map_err(|e| anyhow!("创建缩放器失败: {}", e))?;

        let mut frames = Vec::new();
        let mut frame_count: usize = 0;
        let mut target_idx = 0;
        let mut decoded_frame = ffmpeg_next::util::frame::video::Video::empty();

        for (stream, packet) in input.packets() {
            if stream.index() != stream_index {
                continue;
            }

            if decoder.send_packet(&packet).is_err() {
                continue;
            }

            while decoder.receive_frame(&mut decoded_frame).is_ok() {
                let timestamp = decoded_frame.pts().unwrap_or(0) as f64
                    * time_base.0 as f64
                    / time_base.1 as f64;

                while target_idx < target_timestamps.len() {
                    let target = target_timestamps[target_idx];
                    if timestamp >= target - 0.5 / fps_value {
                        let encoded = Self::encode_frame(
                            &mut scaler,
                            &decoded_frame,
                            out_w,
                            out_h,
                            &params.output_format,
                            params.jpeg_quality,
                            frame_count,
                            timestamp,
                            output_dir,
                        )?;
                        frames.push(encoded);
                        target_idx += 1;

                        if total_targets > 0 {
                            let elapsed = start_time.elapsed().as_millis() as u64;
                            progress_cb(ProgressInfo {
                                progress: target_idx as f32 / total_targets as f32,
                                current_frame: target_idx,
                                total_frames: total_targets,
                                elapsed_ms: elapsed,
                            });

                            if target_idx % 10 == 0 || target_idx == total_targets {
                                let timestamp = std::time::SystemTime::now()
                                    .duration_since(std::time::UNIX_EPOCH)
                                    .unwrap_or_default()
                                    .as_millis() as u64;
                                log_cb(LogEntry {
                                    level: "info".to_string(),
                                    message: format!("已提取 {}/{} 帧", target_idx, total_targets),
                                    timestamp,
                                });
                            }
                        }
                    } else {
                        break;
                    }
                }

                frame_count += 1;

                if target_idx >= target_timestamps.len() {
                    let elapsed = start_time.elapsed().as_millis() as u64;
                    progress_cb(ProgressInfo {
                        progress: 1.0,
                        current_frame: total_targets,
                        total_frames: total_targets,
                        elapsed_ms: elapsed,
                    });
                    return Ok(frames);
                }
            }
        }

        let _ = decoder.send_eof();
        while decoder.receive_frame(&mut decoded_frame).is_ok() {
            if target_idx < target_timestamps.len() {
                let timestamp = decoded_frame.pts().unwrap_or(0) as f64
                    * time_base.0 as f64
                    / time_base.1 as f64;

                let encoded = Self::encode_frame(
                    &mut scaler,
                    &decoded_frame,
                    out_w,
                    out_h,
                    &params.output_format,
                    params.jpeg_quality,
                    frame_count,
                    timestamp,
                    output_dir,
                )?;
                frames.push(encoded);
                target_idx += 1;
                frame_count += 1;
            }
        }

        let elapsed = start_time.elapsed().as_millis() as u64;
        progress_cb(ProgressInfo {
            progress: 1.0,
            current_frame: total_targets,
            total_frames: total_targets,
            elapsed_ms: elapsed,
        });

        let timestamp = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as u64;
        log_cb(LogEntry {
            level: "info".to_string(),
            message: format!("提取完成，共 {} 帧，耗时 {:.1} 秒", frames.len(), elapsed as f64 / 1000.0),
            timestamp,
        });

        Ok(frames)
    }

    fn calculate_timestamps(mode: &ExtractMode, duration: f64, fps: f64, interval_secs: f64, frame_count: usize, time_points: &[f64]) -> Vec<f64> {
        match mode {
            ExtractMode::AllFrames => {
                let frame_interval = 1.0 / fps;
                let count = (duration * fps).ceil() as usize;
                (0..count)
                    .map(|i| i as f64 * frame_interval)
                    .collect()
            }
            ExtractMode::ByInterval => {
                let interval = if interval_secs > 0.0 { interval_secs } else { 1.0 };
                let mut timestamps = Vec::new();
                let mut t = 0.0;
                while t < duration {
                    timestamps.push(t);
                    t += interval;
                }
                timestamps
            }
            ExtractMode::ByCount => {
                let count = if frame_count > 0 { frame_count } else { 10 };
                if count <= 1 {
                    return vec![0.0];
                }
                let step = duration / (count - 1) as f64;
                (0..count)
                    .map(|i| (i as f64 * step).min(duration))
                    .collect()
            }
            ExtractMode::ByTimePoints => {
                let mut points: Vec<f64> = time_points.to_vec();
                points.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));
                points.retain(|&t| t >= 0.0 && t <= duration);
                points
            }
        }
    }

    fn encode_frame(
        scaler: &mut ffmpeg_next::software::scaling::Context,
        frame: &ffmpeg_next::util::frame::video::Video,
        width: u32,
        height: u32,
        format: &OutputFormat,
        _quality: u8,
        index: usize,
        timestamp: f64,
        output_dir: &Path,
    ) -> Result<ExtractedFrame> {
        let mut rgb_frame = ffmpeg_next::util::frame::video::Video::empty();
        scaler.run(frame, &mut rgb_frame)
            .map_err(|e| anyhow!("帧缩放失败: {}", e))?;

        let data = rgb_frame.data(0);
        let stride = rgb_frame.stride(0);
        let bytes_per_pixel = 3;

        let mut pixels = Vec::with_capacity((width * height * 3) as usize);
        for y in 0..height as usize {
            let row_start = y * stride;
            let row_end = row_start + width as usize * bytes_per_pixel;
            if row_end <= data.len() {
                pixels.extend_from_slice(&data[row_start..row_end]);
            }
        }

        let img = image::RgbImage::from_raw(width, height, pixels)
            .ok_or_else(|| anyhow!("创建图片失败"))?;

        let dynamic_img = image::DynamicImage::ImageRgb8(img);

        let ts_ms = (timestamp * 1000.0).round() as u64;
        let (filename, image_data) = match format {
            OutputFormat::Png => {
                let fname = format!("frame_{:06}_{}ms.png", index, ts_ms);
                let mut buf = std::io::Cursor::new(Vec::new());
                dynamic_img.write_to(&mut buf, image::ImageFormat::Png)
                    .map_err(|e| anyhow!("PNG 编码失败: {}", e))?;
                (fname, buf.into_inner())
            }
            OutputFormat::Jpeg => {
                let fname = format!("frame_{:06}_{}ms.jpg", index, ts_ms);
                let mut buf = std::io::Cursor::new(Vec::new());
                dynamic_img.write_to(&mut buf, image::ImageFormat::Jpeg)
                    .map_err(|e| anyhow!("JPEG 编码失败: {}", e))?;
                (fname, buf.into_inner())
            }
        };

        let file_path = output_dir.join(&filename);
        std::fs::write(&file_path, &image_data)
            .map_err(|e| anyhow!("写入帧文件失败 {}: {}", file_path.display(), e))?;

        Ok(ExtractedFrame {
            index,
            timestamp,
            filename,
            file_path: file_path.to_string_lossy().to_string(),
        })
    }
}
