use super::VideoToolEngine;
use super::common::{apply_quality_config, get_quality_config, reset_codec_tag};
use crate::model::video_tool_state::*;
use anyhow::{anyhow, Result};
use std::path::Path;

/// 第一个输入的探测结果
pub(super) struct FirstInputProbe {
    pub width: u32,
    pub height: u32,
    pub fps: f64,
    pub enc_tb: ffmpeg_next::Rational,
    pub has_audio: bool,
    /// 音频被跳过的原因（如果有）
    pub audio_skip_reason: Option<String>,
}

impl VideoToolEngine {
    /// 探测第一个输入视频的参数
    pub(super) fn probe_first_input(params: &MergeVideosParams) -> Result<FirstInputProbe> {
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
            Self::constrain_timebase(ffmpeg_next::Rational::new(
                avg_frame_rate.1,
                avg_frame_rate.0,
            ))
        } else {
            ffmpeg_next::Rational::new(1, 25)
        };

        let mut has_audio = false;
        let mut audio_skip_reason = None;
        let first_audio_codec = first_input
            .streams()
            .best(ffmpeg_next::media::Type::Audio)
            .map(|s| s.parameters().id());
        if let Some(audio_codec_id) = first_audio_codec {
            if Self::is_audio_compatible(audio_codec_id, &params.output_format) {
                has_audio = true;
            } else {
                audio_skip_reason = Some(format!(
                    "音频编码 {:?} 与输出格式 {} 不兼容，将跳过音频",
                    audio_codec_id, params.output_format
                ));
            }
        }

        if has_audio && Self::is_ts_format(&params.input_paths[0]) {
            audio_skip_reason = Some("MPEG-TS 音频格式与输出容器不兼容，将跳过音频".to_string());
            has_audio = false;
        }

        Ok(FirstInputProbe {
            width,
            height,
            fps,
            enc_tb,
            has_audio,
            audio_skip_reason,
        })
    }

    /// 创建输出上下文、视频编码器和音频流
    pub(super) fn setup_merge_output(
        params: &MergeVideosParams,
        codec_name: &str,
        probe: &FirstInputProbe,
    ) -> Result<(
        ffmpeg_next::format::context::Output,
        ffmpeg_next::codec::encoder::video::Encoder,
        ffmpeg_next::Rational,
    )> {
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

        encoder_ctx.set_width(probe.width);
        encoder_ctx.set_height(probe.height);
        encoder_ctx.set_time_base(probe.enc_tb);
        encoder_ctx.set_format(ffmpeg_next::format::Pixel::YUV420P);

        // 应用质量配置
        let quality = get_quality_config(params.quality_preset.as_deref());
        let fallback_bitrate = 2_000_000;
        let custom_bitrate = params
            .video_bitrate
            .as_deref()
            .and_then(Self::parse_bitrate);
        apply_quality_config(
            &mut encoder_ctx,
            codec_name,
            &quality,
            fallback_bitrate,
            probe.fps,
            custom_bitrate,
        );

        let encoder = encoder_ctx
            .open_as(codec)
            .map_err(|e| anyhow!("打开编码器失败: {}", e))?;
        out_video.set_parameters(&encoder);
        out_video.set_time_base(probe.enc_tb);

        if probe.has_audio {
            let first_input = ffmpeg_next::format::input(&params.input_paths[0])
                .map_err(|e| anyhow!("打开第一个视频失败: {}", e))?;
            let audio_stream = first_input
                .streams()
                .best(ffmpeg_next::media::Type::Audio)
                .ok_or_else(|| anyhow!("未找到音频流"))?;
            let mut out_audio = output
                .add_stream(None)
                .map_err(|e| anyhow!("添加音频流失败: {}", e))?;
            out_audio.set_parameters(audio_stream.parameters());
            reset_codec_tag(&mut out_audio);
            out_audio.set_time_base(audio_stream.time_base());
        }

        Ok((output, encoder, probe.enc_tb))
    }

    /// 设置封面流（附加图片流）
    pub(super) fn setup_cover_streams(
        params: &MergeVideosParams,
        output: &mut ffmpeg_next::format::context::Output,
    ) -> Result<Vec<usize>> {
        let mut indices = Vec::new();
        if params.output_format == "flv" {
            return Ok(indices);
        }
        let first_input = ffmpeg_next::format::input(&params.input_paths[0])
            .map_err(|e| anyhow!("打开第一个视频失败: {}", e))?;
        for stream in first_input.streams() {
            let mt = stream.parameters().medium();
            let is_cover = mt == ffmpeg_next::media::Type::Attachment
                || stream
                    .disposition()
                    .contains(ffmpeg_next::format::stream::Disposition::ATTACHED_PIC);
            if is_cover {
                let mut out_att = output
                    .add_stream(None)
                    .map_err(|e| anyhow!("添加封面流失败: {}", e))?;
                out_att.set_parameters(stream.parameters());
                reset_codec_tag(&mut out_att);
                out_att.set_time_base(stream.time_base());
                indices.push(output.nb_streams() as usize - 1);
            }
        }
        Ok(indices)
    }

    /// 估算所有输入视频的总帧数
    pub(super) fn estimate_total_frames(input_paths: &[impl AsRef<Path>]) -> u64 {
        let mut total = 0u64;
        for p in input_paths {
            if let Ok(inp) = ffmpeg_next::format::input(p) {
                let dur_secs = inp.duration() as f64 / 1_000_000.0;
                if dur_secs > 0.0 {
                    let fps = inp
                        .streams()
                        .best(ffmpeg_next::media::Type::Video)
                        .map(|s| {
                            let r = s.avg_frame_rate();
                            if r.1 > 0 { r.0 as f64 / r.1 as f64 } else { 25.0 }
                        })
                        .unwrap_or(25.0);
                    total += (dur_secs * fps) as u64;
                }
            }
        }
        total
    }
}
