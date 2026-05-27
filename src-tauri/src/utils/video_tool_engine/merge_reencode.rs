use super::VideoToolEngine;
use super::common::{now_ms, find_video_encoder_for_format};
use super::merge_setup::FirstInputProbe;
use crate::model::video_tool_state::*;
use anyhow::{anyhow, Result};
use std::path::Path;
use std::time::Instant;

/// 合并重编码过程中的可变状态
struct MergeState {
    frame_count: u64,
    estimated_total_frames: u64,
    last_audio_dts: i64,
}

impl MergeState {
    fn new(estimated_total_frames: u64) -> Self {
        Self {
            frame_count: 0,
            estimated_total_frames,
            last_audio_dts: i64::MIN,
        }
    }
}

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
        Self::log_info(log_cb, task_id, &format!("使用编码器: {}", codec_name));

        let probe = Self::probe_first_input(params)?;
        if let Some(ref reason) = probe.audio_skip_reason {
            Self::log_warn(log_cb, task_id, reason);
        }

        let (mut output, mut encoder, enc_tb) =
            Self::setup_merge_output(params, codec_name, &probe)?;
        let cover_stream_indices = Self::setup_cover_streams(params, &mut output)?;

        output
            .write_header()
            .map_err(|e| anyhow!("写入输出头失败: {}", e))?;

        let mut state = MergeState::new(Self::estimate_total_frames(&params.input_paths));
        let total = params.input_paths.len();

        for (i, input_path) in params.input_paths.iter().enumerate() {
            Self::log_info(log_cb, task_id, &format!("处理第 {}/{} 个文件", i + 1, total));
            Self::process_single_input(
                input_path, i, total, &probe, params, task_id, &mut output, &mut encoder,
                enc_tb, &cover_stream_indices, &mut state, start, progress_cb, log_cb,
            )?;
        }

        Self::encode_and_write(&mut encoder, None, &mut output, enc_tb)?;
        output.write_trailer().map_err(|e| anyhow!("写入文件尾失败: {}", e))?;
        drop(output);

        Self::generate_cover_if_needed(params, task_id, log_cb);

        let file_size = std::fs::metadata(&params.output_path).map(|m| m.len()).unwrap_or(0);

        progress_cb(VideoToolProgress {
            task_id: task_id.to_string(),
            progress: 1.0,
            current_step: "done".to_string(),
            elapsed_ms: start.elapsed().as_millis() as u64,
            current_file_index: Some(total.saturating_sub(1)),
            total_files: Some(total),
            frames_processed: Some(state.frame_count),
            total_frames: Some(state.estimated_total_frames),
            ..Default::default()
        });

        Self::log_info(log_cb, task_id, &format!(
            "合并完成，共编码 {} 帧，耗时 {:.1} 秒",
            state.frame_count, start.elapsed().as_secs_f64()
        ));

        Ok(MergeVideosResult {
            output_path: params.output_path.to_string_lossy().to_string(),
            duration_secs: state.frame_count as f64 / 25.0,
            file_size_bytes: file_size,
        })
    }

    /// 处理单个输入文件：解码视频、收集音频、写入封面
    #[allow(clippy::too_many_arguments)]
    fn process_single_input<P, L>(
        input_path: &Path,
        file_index: usize,
        total_files: usize,
        probe: &FirstInputProbe,
        params: &MergeVideosParams,
        task_id: &str,
        output: &mut ffmpeg_next::format::context::Output,
        encoder: &mut ffmpeg_next::codec::encoder::video::Encoder,
        enc_tb: ffmpeg_next::Rational,
        cover_stream_indices: &[usize],
        state: &mut MergeState,
        start: Instant,
        progress_cb: &mut P,
        log_cb: &mut L,
    ) -> Result<()>
    where
        P: FnMut(VideoToolProgress),
        L: FnMut(VideoToolLog),
    {
        let mut input = ffmpeg_next::format::input(input_path)
            .map_err(|e| {
                Self::log_error(log_cb, task_id, &format!("打开视频 {} 失败: {}", input_path.display(), e));
                anyhow!("打开视频 {} 失败: {}", input_path.display(), e)
            })?;

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

        let (scaled_w, scaled_h) = Self::calculate_aspect_ratio_resize(
            decoder.width(), decoder.height(), probe.width, probe.height,
        );
        let needs_padding = scaled_w != probe.width || scaled_h != probe.height;
        let x_off = if needs_padding { (probe.width - scaled_w) / 2 } else { 0 };
        let y_off = if needs_padding { (probe.height - scaled_h) / 2 } else { 0 };

        let mut sws_ctx = ffmpeg_next::software::scaling::Context::get(
            decoder.format(), decoder.width(), decoder.height(),
            ffmpeg_next::format::Pixel::YUV420P, scaled_w, scaled_h,
            ffmpeg_next::software::scaling::Flags::BILINEAR,
        )
        .map_err(|e| anyhow!("创建颜色转换上下文失败: {}", e))?;

        if needs_padding {
            Self::log_info(log_cb, task_id, &format!(
                "视频 {} 分辨率 {}x{} 与目标 {}x{} 不同，保持宽高比缩放至 {}x{} 并添加黑边",
                input_path.display(), decoder.width(), decoder.height(),
                probe.width, probe.height, scaled_w, scaled_h
            ));
        }

        let mut audio_packets: Vec<(ffmpeg_next::Packet, ffmpeg_next::Rational)> = Vec::new();
        let mut cover_idx = 0usize;

        for (stream, packet) in input.packets() {
            let mt = stream.parameters().medium();

            if mt == ffmpeg_next::media::Type::Video {
                Self::decode_encode_packet(
                    &packet, input_path, &mut decoder, &mut sws_ctx, encoder, output,
                    enc_tb, probe, needs_padding, scaled_w, scaled_h, x_off, y_off,
                    state, start, file_index, total_files, progress_cb, log_cb,
                )?;
            } else if mt == ffmpeg_next::media::Type::Audio && probe.has_audio {
                if Self::is_audio_compatible(stream.parameters().id(), &params.output_format) {
                    audio_packets.push((packet, stream.time_base()));
                }
            } else if !cover_stream_indices.is_empty() && file_index == 0 {
                Self::try_write_cover(
                    &packet, &stream, mt, cover_stream_indices, &mut cover_idx, output, log_cb, task_id,
                );
            }
        }

        // 刷新解码器
        Self::flush_decoder(
            &mut decoder, &mut sws_ctx, encoder, output, enc_tb, probe,
            needs_padding, scaled_w, scaled_h, x_off, y_off,
            state, start, file_index, total_files, input_path, progress_cb,
        );

        // 写入音频
        if probe.has_audio {
            Self::write_audio(audio_packets, output, &mut state.last_audio_dts, input_path, log_cb, task_id)?;
        }

        Ok(())
    }

    /// 解码一个视频 packet 并编码写入输出
    #[allow(clippy::too_many_arguments)]
    fn decode_encode_packet<P, L>(
        packet: &ffmpeg_next::Packet,
        input_path: &Path,
        decoder: &mut ffmpeg_next::codec::decoder::Video,
        sws_ctx: &mut ffmpeg_next::software::scaling::Context,
        encoder: &mut ffmpeg_next::codec::encoder::video::Encoder,
        output: &mut ffmpeg_next::format::context::Output,
        enc_tb: ffmpeg_next::Rational,
        probe: &FirstInputProbe,
        needs_padding: bool,
        scaled_w: u32,
        scaled_h: u32,
        x_off: u32,
        y_off: u32,
        state: &mut MergeState,
        start: Instant,
        file_index: usize,
        total_files: usize,
        progress_cb: &mut P,
        log_cb: &mut L,
    ) -> Result<()>
    where
        P: FnMut(VideoToolProgress),
        L: FnMut(VideoToolLog),
    {
        decoder.send_packet(packet).map_err(|e| {
            Self::log_error(log_cb, "", &format!("处理文件 {} 时解码失败: {}", input_path.display(), e));
            anyhow!("处理文件 {} 时解码失败: {}", input_path.display(), e)
        })?;

        let mut decoded = ffmpeg_next::frame::Video::empty();
        while decoder.receive_frame(&mut decoded).is_ok() {
            let yuv = Self::scale_and_pad_frame(
                &decoded, sws_ctx, probe.width, probe.height,
                scaled_w, scaled_h, x_off, y_off, needs_padding,
            )?;
            let mut yuv = yuv;
            yuv.set_pts(Some(state.frame_count as i64));
            state.frame_count += 1;

            Self::encode_and_write(encoder, Some(&yuv), output, enc_tb).map_err(|e| {
                Self::log_error(log_cb, "", &format!("处理文件 {} 时编码失败: {}", input_path.display(), e));
                anyhow!("处理文件 {} 时编码失败: {}", input_path.display(), e)
            })?;

            if state.frame_count % 30 == 0 {
                Self::report_progress(state, start, file_index, total_files, input_path, progress_cb);
            }
        }
        Ok(())
    }

    /// 刷新解码器缓冲区中剩余帧
    #[allow(clippy::too_many_arguments)]
    fn flush_decoder<P>(
        decoder: &mut ffmpeg_next::codec::decoder::Video,
        sws_ctx: &mut ffmpeg_next::software::scaling::Context,
        encoder: &mut ffmpeg_next::codec::encoder::video::Encoder,
        output: &mut ffmpeg_next::format::context::Output,
        enc_tb: ffmpeg_next::Rational,
        probe: &FirstInputProbe,
        needs_padding: bool,
        scaled_w: u32,
        scaled_h: u32,
        x_off: u32,
        y_off: u32,
        state: &mut MergeState,
        start: Instant,
        file_index: usize,
        total_files: usize,
        input_path: &Path,
        progress_cb: &mut P,
    ) where
        P: FnMut(VideoToolProgress),
    {
        decoder.send_eof().ok();
        let mut decoded = ffmpeg_next::frame::Video::empty();
        while decoder.receive_frame(&mut decoded).is_ok() {
            if let Ok(yuv) = Self::scale_and_pad_frame(
                &decoded, sws_ctx, probe.width, probe.height,
                scaled_w, scaled_h, x_off, y_off, needs_padding,
            ) {
                let mut yuv = yuv;
                yuv.set_pts(Some(state.frame_count as i64));
                state.frame_count += 1;
                let _ = Self::encode_and_write(encoder, Some(&yuv), output, enc_tb);
                if state.frame_count % 30 == 0 && state.estimated_total_frames > 0 {
                    Self::report_progress(state, start, file_index, total_files, input_path, progress_cb);
                }
            }
        }
    }

    /// 写入收集的音频 packets
    fn write_audio(
        audio_packets: Vec<(ffmpeg_next::Packet, ffmpeg_next::Rational)>,
        output: &mut ffmpeg_next::format::context::Output,
        last_audio_dts: &mut i64,
        input_path: &Path,
        log_cb: &mut impl FnMut(VideoToolLog),
        task_id: &str,
    ) -> Result<()> {
        let out_tb = output
            .stream(1)
            .ok_or_else(|| anyhow!("输出音频流索引越界"))?
            .time_base();
        let mut dts_offset: i64 = 0;
        let mut first = true;

        for (mut pkt, in_tb) in audio_packets {
            pkt.set_stream(1);
            pkt.rescale_ts(in_tb, out_tb);
            let raw_dts = pkt.dts().unwrap_or_else(|| pkt.pts().unwrap_or(0));

            if first {
                first = false;
                if *last_audio_dts != i64::MIN {
                    dts_offset = *last_audio_dts + 1 - raw_dts;
                }
            }

            if let Some(p) = pkt.pts() { pkt.set_pts(Some(p + dts_offset)); }
            if let Some(d) = pkt.dts() { pkt.set_dts(Some(d + dts_offset)); }

            let cur = pkt.dts().unwrap_or_else(|| pkt.pts().unwrap_or(0));
            if cur > *last_audio_dts { *last_audio_dts = cur; }

            pkt.set_position(-1);
            pkt.write_interleaved(output).map_err(|e| {
                Self::log_error(log_cb, task_id, &format!("处理文件 {} 时写入音频失败: {}", input_path.display(), e));
                anyhow!("处理文件 {} 时写入音频失败: {}", input_path.display(), e)
            })?;
        }
        Ok(())
    }

    /// 上报处理进度
    fn report_progress<P>(
        state: &MergeState,
        start: Instant,
        file_index: usize,
        total_files: usize,
        input_path: &Path,
        progress_cb: &mut P,
    ) where
        P: FnMut(VideoToolProgress),
    {
        let progress = if state.estimated_total_frames > 0 {
            (state.frame_count as f32 / state.estimated_total_frames as f32).min(0.95)
        } else {
            ((file_index as f32 + 0.5) / total_files as f32).min(0.95)
        };
        let elapsed = start.elapsed().as_secs_f64();
        let speed = if elapsed > 0.0 { state.frame_count as f64 / elapsed } else { 0.0 };
        let eta_ms = if speed > 0.0 && state.estimated_total_frames > state.frame_count {
            Some(((state.estimated_total_frames - state.frame_count) as f64 / speed * 1000.0) as u64)
        } else {
            None
        };
        progress_cb(VideoToolProgress {
            task_id: String::new(),
            progress,
            current_step: "reencoding".to_string(),
            elapsed_ms: start.elapsed().as_millis() as u64,
            current_file_index: Some(file_index),
            total_files: Some(total_files),
            current_file_name: Some(input_path.file_name().unwrap_or_default().to_string_lossy().to_string()),
            speed: Some(speed),
            eta_ms,
            frames_processed: Some(state.frame_count.min(state.estimated_total_frames)),
            total_frames: Some(state.estimated_total_frames),
        });
    }

    /// 生成并嵌入封面图（如果输入没有封面）
    fn generate_cover_if_needed<L>(
        params: &MergeVideosParams,
        task_id: &str,
        log_cb: &mut L,
    ) where
        L: FnMut(VideoToolLog),
    {
        let has_cover = ffmpeg_next::format::input(&params.input_paths[0])
            .map(|inp| inp.streams().any(|s| {
                let mt = s.parameters().medium();
                mt == ffmpeg_next::media::Type::Attachment
                    || s.disposition().contains(ffmpeg_next::format::stream::Disposition::ATTACHED_PIC)
            }))
            .unwrap_or(false);
        if has_cover { return; }

        Self::log_info(log_cb, task_id, "输入视频无封面图，正在从视频内容生成...");
        match Self::generate_jpeg_cover_from_video(&params.output_path) {
            Ok((jpeg_data, w, h)) => {
                if let Err(e) = Self::embed_cover_art(&params.output_path, &jpeg_data, w, h, &params.output_format) {
                    Self::log_warn(log_cb, task_id, &format!("嵌入封面图失败: {}", e));
                }
            }
            Err(e) => {
                Self::log_warn(log_cb, task_id, &format!("生成封面图失败: {}", e));
            }
        }
    }

}
