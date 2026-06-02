use super::VideoToolEngine;
use super::common::{
    apply_quality_config, find_audio_encoder_for_codec, find_video_encoder_for_format,
    get_quality_config, reset_codec_tag,
};
use crate::model::video_tool_state::*;
use anyhow::{anyhow, Result};

/// 视频重编码的探测和配置结果
pub(super) struct ConvertVideoConfig {
    pub format_str: String,
    pub codec_name: &'static str,
    pub width: u32,
    pub height: u32,
    pub fps: f64,
    pub enc_tb: ffmpeg_next::Rational,
    pub bit_rate: usize,
    pub has_audio: bool,
    pub audio_codec_name: String,
    pub quality_preset: Option<String>,
    pub custom_bitrate: Option<usize>,
}

impl VideoToolEngine {
    /// 探测输入视频参数并确定编码配置
    pub(super) fn probe_convert_config(params: &ConvertFormatParams) -> Result<ConvertVideoConfig> {
        let format_str = match &params.target {
            ConversionTarget::VideoFormat(f) => f.clone(),
            _ => unreachable!(),
        };

        let codec_name = find_video_encoder_for_format(&format_str, params.video_codec.as_deref())?;

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

        let (target_w, target_h) = if let Some((w, h)) = params.resolution {
            (w, h)
        } else {
            (decoder.width(), decoder.height())
        };

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
            Self::constrain_timebase(ffmpeg_next::Rational::new(
                avg_frame_rate.1,
                avg_frame_rate.0,
            ))
        } else {
            ffmpeg_next::Rational::new(1, 25)
        };

        let has_audio = input
            .streams()
            .best(ffmpeg_next::media::Type::Audio)
            .is_some();
        let audio_codec_name = params.audio_codec.as_deref().unwrap_or("aac").to_string();

        let custom_bitrate = params
            .video_bitrate
            .as_deref()
            .and_then(Self::parse_bitrate);

        Ok(ConvertVideoConfig {
            format_str,
            codec_name,
            width: target_w / 2 * 2,
            height: target_h / 2 * 2,
            fps,
            enc_tb,
            bit_rate,
            has_audio,
            audio_codec_name,
            quality_preset: params.quality_preset.clone(),
            custom_bitrate,
        })
    }

    /// 创建输出上下文和视频编码器
    pub(super) fn setup_convert_output(
        params: &ConvertFormatParams,
        config: &ConvertVideoConfig,
    ) -> Result<(
        ffmpeg_next::format::context::Output,
        ffmpeg_next::codec::encoder::video::Encoder,
    )> {
        let mut output = ffmpeg_next::format::output_as(
            &params.output_path,
            Self::normalize_format_name(&config.format_str),
        )
        .map_err(|e| anyhow!("创建输出失败: {}", e))?;

        let codec = ffmpeg_next::codec::encoder::find_by_name(config.codec_name)
            .ok_or_else(|| anyhow!("未找到编码器: {}", config.codec_name))?;
        let mut out_video = output
            .add_stream(codec)
            .map_err(|e| anyhow!("添加视频流失败: {}", e))?;

        let mut enc_ctx =
            ffmpeg_next::codec::context::Context::from_parameters(out_video.parameters())
                .map_err(|e| anyhow!("创建编码上下文失败: {}", e))?
                .encoder()
                .video()
                .map_err(|e| anyhow!("创建视频编码器失败: {}", e))?;

        enc_ctx.set_width(config.width);
        enc_ctx.set_height(config.height);
        enc_ctx.set_time_base(config.enc_tb);
        enc_ctx.set_format(ffmpeg_next::format::Pixel::YUV420P);

        // 应用质量配置
        let quality = get_quality_config(config.quality_preset.as_deref());
        apply_quality_config(
            &mut enc_ctx,
            config.codec_name,
            &quality,
            config.bit_rate,
            config.fps,
            config.custom_bitrate,
        );

        let encoder = enc_ctx
            .open_as(codec)
            .map_err(|e| anyhow!("打开编码器失败: {}", e))?;
        out_video.set_parameters(&encoder);
        out_video.set_time_base(config.enc_tb);

        Ok((output, encoder))
    }

    /// 设置音频编码器/解码器/重采样器
    pub(super) fn setup_audio_pipeline(
        params: &ConvertFormatParams,
        config: &ConvertVideoConfig,
        output: &mut ffmpeg_next::format::context::Output,
        input: &ffmpeg_next::format::context::Input,
    ) -> Result<(
        bool,
        Option<ffmpeg_next::codec::encoder::Audio>,
        Option<ffmpeg_next::codec::decoder::Audio>,
        Option<ffmpeg_next::software::resampling::Context>,
        Option<String>,
    )> {
        let mut has_audio = config.has_audio;
        let resolved_encoder = find_audio_encoder_for_codec(&config.audio_codec_name).ok();

        if has_audio && resolved_encoder.is_none() {
            has_audio = false;
            return Ok((
                has_audio,
                None,
                None,
                None,
                Some(format!(
                    "未找到音频编码器 '{}'，将跳过音频",
                    config.audio_codec_name
                )),
            ));
        }

        if !has_audio {
            return Ok((false, None, None, None, None));
        }

        let audio_stream = input
            .streams()
            .best(ffmpeg_next::media::Type::Audio)
            .ok_or_else(|| anyhow!("未找到音频流"))?;

        let dec_ctx =
            ffmpeg_next::codec::context::Context::from_parameters(audio_stream.parameters())
                .map_err(|e| anyhow!("创建音频解码上下文失败: {}", e))?;
        let dec = dec_ctx
            .decoder()
            .audio()
            .map_err(|e| anyhow!("创建音频解码器失败: {}", e))?;

        let dec_format = dec.format();
        let dec_rate = dec.rate();
        let dec_channels = dec.channels();
        let dec_layout = dec.channel_layout();

        let enc_codec_name = resolved_encoder.ok_or_else(|| anyhow!("未找到音频编码器"))?;
        let enc_codec = ffmpeg_next::codec::encoder::find_by_name(enc_codec_name)
            .ok_or_else(|| anyhow!("未找到音频编码器: {}", enc_codec_name))?;

        let (enc_format, enc_rate, enc_layout) =
            Self::query_audio_encoder_params(&enc_codec, dec_format, dec_rate, dec_channels);

        let mut out_audio = output
            .add_stream(enc_codec)
            .map_err(|e| anyhow!("添加音频输出流失败: {}", e))?;

        let mut enc_ctx =
            ffmpeg_next::codec::context::Context::from_parameters(out_audio.parameters())
                .map_err(|e| anyhow!("创建音频编码上下文失败: {}", e))?
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

        let opened_enc = enc_ctx
            .open_as(enc_codec)
            .map_err(|e| anyhow!("打开音频编码器失败: {}", e))?;
        out_audio.set_parameters(&opened_enc);
        out_audio.set_time_base(ffmpeg_next::Rational::new(1, enc_rate as i32));

        let needs_resample =
            dec_format != enc_format || dec_rate != enc_rate || dec_layout != enc_layout;
        let resamp = if needs_resample {
            Some(
                ffmpeg_next::software::resampling::Context::get(
                    dec_format, dec_layout, dec_rate, enc_format, enc_layout, enc_rate,
                )
                .map_err(|e| anyhow!("创建音频重采样器失败: {}", e))?,
            )
        } else {
            None
        };

        let info_msg = format!("音频将重编码为 {} ({}Hz)", enc_codec_name, enc_rate);

        Ok((
            true,
            Some(opened_enc),
            Some(dec),
            resamp,
            Some(info_msg),
        ))
    }

    /// 设置封面流
    pub(super) fn setup_convert_cover_streams(
        format_str: &str,
        input: &ffmpeg_next::format::context::Input,
        output: &mut ffmpeg_next::format::context::Output,
    ) -> Result<Vec<usize>> {
        let mut indices = Vec::new();
        if format_str == "flv" {
            return Ok(indices);
        }
        for stream in input.streams() {
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
}
