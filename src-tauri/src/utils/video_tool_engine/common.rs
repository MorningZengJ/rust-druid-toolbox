use super::VideoToolEngine;
use crate::model::video_tool_state::*;
use anyhow::{anyhow, Result};

/// 编码质量配置
pub(super) struct QualityConfig {
    pub crf: Option<i32>,
    pub preset: Option<&'static str>,
    pub tune: Option<&'static str>,
}

/// 根据 quality_preset 名称获取 CRF/preset/tune 配置
pub(super) fn get_quality_config(preset: Option<&str>) -> QualityConfig {
    match preset.unwrap_or("balanced") {
        "high" => QualityConfig {
            crf: Some(18),
            preset: Some("slow"),
            tune: Some("film"),
        },
        "fast" => QualityConfig {
            crf: Some(28),
            preset: Some("fast"),
            tune: Some("zerolatency"),
        },
        _ => QualityConfig {
            crf: Some(23),
            preset: Some("medium"),
            tune: None,
        },
    }
}

/// 将质量配置应用到编码器上下文
///
/// - libx264/libx265/libvpx-vp9: 使用 CRF 模式 + preset/tune
/// - ffv1: 无损编码，设置 level 3 + slicecrc 1
/// - mpeg4: 仅支持 CBR
/// - 若 custom_bitrate 有值，有损编码改用 CBR 模式
pub(super) fn apply_quality_config(
    enc: &mut ffmpeg_next::codec::encoder::video::Video,
    codec_name: &str,
    config: &QualityConfig,
    fallback_bitrate: usize,
    fps: f64,
    custom_bitrate: Option<usize>,
) {
    // GOP 设置（所有编码器通用）
    if codec_name != "ffv1" {
        enc.set_gop((fps * 10.0) as u32);
    }

    // FFV1 无损编码
    if codec_name == "ffv1" {
        set_enc_opt(enc, "level", "3");
        set_enc_opt(enc, "slicecrc", "1");
        return;
    }

    // 用户指定了自定义码率 → CBR 模式
    if let Some(br) = custom_bitrate {
        enc.set_bit_rate(br);
        return;
    }

    // libx264 / libx265: CRF + preset + tune
    if codec_name.starts_with("libx264") || codec_name.starts_with("libx265") {
        if let Some(crf) = config.crf {
            set_enc_opt(enc, "crf", &crf.to_string());
        }
        if let Some(p) = config.preset {
            set_enc_opt(enc, "preset", p);
        }
        if let Some(t) = config.tune {
            set_enc_opt(enc, "tune", t);
        }
        // 设一个较大的码率上限防止峰值过高
        enc.set_bit_rate(fallback_bitrate.max(50_000_000));
        return;
    }

    // libvpx-vp9: CRF 模式
    if codec_name == "libvpx-vp9" {
        if let Some(crf) = config.crf {
            set_enc_opt(enc, "crf", &crf.to_string());
            set_enc_opt(enc, "b", "0"); // 告诉 vp9 使用 CRF 模式
        }
        if let Some(p) = config.preset {
            let deadline = match p {
                "slow" => "good",
                "fast" => "realtime",
                _ => "good",
            };
            set_enc_opt(enc, "deadline", deadline);
        }
        enc.set_bit_rate(fallback_bitrate.max(50_000_000));
        return;
    }

    // mpeg4 等其他编码器: CBR
    enc.set_bit_rate(fallback_bitrate.max(2_000_000));
}

/// 设置编码器选项（通过 av_opt_set）
fn set_enc_opt(enc: &mut ffmpeg_next::codec::encoder::video::Video, key: &str, val: &str) {
    unsafe {
        let c_key = std::ffi::CString::new(key).unwrap();
        let c_val = std::ffi::CString::new(val).unwrap();
        ffmpeg_next::sys::av_opt_set(
            enc.as_mut_ptr() as *mut std::ffi::c_void,
            c_key.as_ptr(),
            c_val.as_ptr(),
            0,
        );
    }
}

/// 获取当前时间戳（毫秒）
pub(super) fn now_ms() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}

/// 根据输出格式查找可用的视频编码器
///
/// 若 user_codec 指定了编码器名称，优先使用该编码器
pub(super) fn find_video_encoder_for_format(
    format: &str,
    user_codec: Option<&str>,
) -> Result<&'static str> {
    // 用户指定了编码器，直接查找
    if let Some(codec) = user_codec {
        if codec == "copy" {
            return Ok("copy");
        }
        if ffmpeg_next::codec::encoder::find_by_name(codec).is_some() {
            return Ok(leak_static(codec));
        }
        return Err(anyhow!(
            "未找到指定的编码器 '{}'，请确保 FFmpeg 已编译该编码器。",
            codec
        ));
    }

    // 自动选择
    let candidates: &[&str] = match format {
        "flv" => &["libx264", "libx264rgb", "flv", "mpeg4"],
        "webm" => &["libvpx", "libvpx-vp9", "libx264"],
        _ => &["libx264", "libx264rgb", "libx265", "mpeg4"],
    };
    candidates
        .iter()
        .find(|&&name| ffmpeg_next::codec::encoder::find_by_name(name).is_some())
        .copied()
        .ok_or_else(move || {
            anyhow!(
                "未找到可用的视频编码器 ({})。请确保已安装包含 libx264 的 FFmpeg。\
                可以从 https://ffmpeg.org/download.html 下载完整版 FFmpeg。",
                format
            )
        })
}

/// 将 &str 转为 &'static str（用于编码器名称这类生命周期等同于进程的字符串）
fn leak_static(s: &str) -> &'static str {
    Box::leak(s.to_owned().into_boxed_str())
}

/// 根据音频格式名称查找可用的音频编码器
pub(super) fn find_audio_encoder_for_codec(codec_name: &str) -> Result<&'static str> {
    let candidates: &[&str] = match codec_name {
        "mp3" => &["libmp3lame", "mp3"],
        "aac" => &["aac", "libfdk_aac"],
        "wav" => &["pcm_s16le"],
        "flac" => &["flac"],
        "ogg" => &["libvorbis", "vorbis"],
        "opus" => &["libopus", "opus"],
        "alac" => &["alac"],
        "ac3" => &["ac3"],
        _ => {
            // 直接尝试使用传入的编码器名称
            return if ffmpeg_next::codec::encoder::find_by_name(codec_name).is_some() {
                // 从已知静态列表中查找匹配项
                let all_known = &["libmp3lame", "mp3", "aac", "libfdk_aac", "pcm_s16le",
                    "flac", "libvorbis", "vorbis", "libopus", "opus", "alac", "ac3"];
                all_known.iter().find(|&&n| n == codec_name).copied()
                    .ok_or_else(|| anyhow!("编码器 '{}' 存在但不在已知列表中", codec_name))
            } else {
                let available = get_available_audio_formats();
                if available.is_empty() {
                    Err(anyhow!("未找到可用的音频编码器: {}。当前 FFmpeg 构建不包含任何音频编码支持", codec_name))
                } else {
                    Err(anyhow!("未找到可用的音频编码器: {}。可用的音频格式: {}", codec_name, available.join(", ")))
                }
            };
        }
    };
    candidates
        .iter()
        .find(|&&name| ffmpeg_next::codec::encoder::find_by_name(name).is_some())
        .copied()
        .ok_or_else(|| {
            let available = get_available_audio_formats();
            if available.is_empty() {
                anyhow!("未找到可用的音频编码器: {}。当前 FFmpeg 构建不包含该编码支持", codec_name)
            } else {
                anyhow!("未找到可用的音频编码器: {}。可用的音频格式: {}", codec_name, available.join(", "))
            }
        })
}

/// 获取当前 FFmpeg 构建中可用的音频格式
fn get_available_audio_formats() -> Vec<&'static str> {
    let format_encoders: &[(&str, &[&str])] = &[
        ("mp3", &["libmp3lame", "mp3"]),
        ("aac", &["aac", "libfdk_aac"]),
        ("wav", &["pcm_s16le"]),
        ("flac", &["flac"]),
        ("ogg", &["libvorbis", "vorbis"]),
        ("opus", &["libopus", "opus"]),
        ("alac", &["alac"]),
        ("ac3", &["ac3"]),
    ];
    format_encoders
        .iter()
        .filter(|(_, encoders)| {
            encoders.iter().any(|&name| {
                ffmpeg_next::codec::encoder::find_by_name(name).is_some()
            })
        })
        .map(|(format, _)| *format)
        .collect()
}

/// 重置输出流的 codec_tag，避免容器格式兼容性问题
pub(super) fn reset_codec_tag(stream: &mut ffmpeg_next::format::stream::StreamMut) {
    unsafe {
        let avstream = stream.as_mut_ptr();
        (*(*avstream).codecpar).codec_tag = 0;
    }
}

impl VideoToolEngine {
    /// 计算保持宽高比的缩放尺寸，返回 (缩放后宽度, 缩放后高度)
    pub(super) fn calculate_aspect_ratio_resize(
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
            let scaled_height = (target_width as f64 / src_ratio) as u32;
            (target_width, scaled_height.max(1))
        } else {
            let scaled_width = (target_height as f64 * src_ratio) as u32;
            (scaled_width.max(1), target_height)
        };

        (scaled_width / 2 * 2, scaled_height / 2 * 2)
    }

    /// 查询编码器支持的音频参数，返回 (最佳采样格式, 最佳采样率, 最佳声道布局)
    /// 若编码器未限制某项则回退到解码器参数
    pub(super) fn query_audio_encoder_params(
        enc_codec: &ffmpeg_next::Codec,
        dec_format: ffmpeg_next::format::Sample,
        dec_rate: u32,
        dec_channels: u16,
    ) -> (ffmpeg_next::format::Sample, u32, ffmpeg_next::channel_layout::ChannelLayout) {
        let audio_codec = enc_codec.audio().ok();

        // 采样格式：优先匹配解码器格式，否则取编码器支持的第一个
        let format = if let Some(ref codec) = audio_codec {
            if let Some(formats) = codec.formats() {
                let supported: Vec<ffmpeg_next::format::Sample> = formats.collect();
                if supported.contains(&dec_format) {
                    dec_format
                } else {
                    supported.into_iter().next().unwrap_or(dec_format)
                }
            } else {
                dec_format
            }
        } else {
            dec_format
        };

        // 采样率：优先匹配解码器速率，否则取编码器支持的最近值
        let rate = if let Some(ref codec) = audio_codec {
            if let Some(rates) = codec.rates() {
                let supported: Vec<i32> = rates.collect();
                if supported.is_empty() {
                    dec_rate
                } else if supported.contains(&(dec_rate as i32)) {
                    dec_rate
                } else {
                    supported
                        .into_iter()
                        .min_by_key(|r| (*r - dec_rate as i32).unsigned_abs())
                        .map(|r| r as u32)
                        .unwrap_or(dec_rate)
                }
            } else {
                dec_rate
            }
        } else {
            dec_rate
        };

        // 声道布局：优先匹配解码器声道数
        let ch_layout = if let Some(ref codec) = audio_codec {
            if let Some(layouts) = codec.channel_layouts() {
                layouts.best(dec_channels as i32)
            } else if dec_channels >= 2 {
                ffmpeg_next::channel_layout::ChannelLayout::STEREO
            } else {
                ffmpeg_next::channel_layout::ChannelLayout::MONO
            }
        } else if dec_channels >= 2 {
            ffmpeg_next::channel_layout::ChannelLayout::STEREO
        } else {
            ffmpeg_next::channel_layout::ChannelLayout::MONO
        };

        (format, rate, ch_layout)
    }

    pub(super) fn is_audio_compatible(codec_id: ffmpeg_next::codec::Id, output_format: &str) -> bool {
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

    /// 约束 timebase 以满足编码器限制（如 MPEG4 要求分母 ≤ 65535）
    pub(super) fn constrain_timebase(tb: ffmpeg_next::Rational) -> ffmpeg_next::Rational {
        let max_den: i32 = 65535;
        if tb.1 <= max_den {
            return tb;
        }
        let a = tb.0.unsigned_abs();
        let b = tb.1.unsigned_abs();
        let g = Self::gcd(a, b);
        let mut num = (a / g) as i32;
        let mut den = (b / g) as i32;
        while den > max_den {
            num = (num as f64 * max_den as f64 / den as f64).round() as i32;
            den = max_den;
            if num <= 0 {
                num = 1;
            }
        }
        ffmpeg_next::Rational::new(num, den)
    }

    pub(super) fn gcd(mut a: u32, mut b: u32) -> u32 {
        while b != 0 {
            let t = b;
            b = a % b;
            a = t;
        }
        a
    }

    /// 将文件扩展名映射为 FFmpeg 标准格式名
    pub(super) fn normalize_format_name(ext: &str) -> &str {
        match ext {
            "mkv" => "matroska",
            "ts" => "mpegts",
            "m4v" => "mp4",
            other => other,
        }
    }

    /// 检测输入文件是否为 MPEG-TS 格式（ts/m2ts/mts/trp）
    pub(super) fn is_ts_format(path: &std::path::Path) -> bool {
        let Ok(input) = ffmpeg_next::format::input(path) else {
            return false;
        };
        let format_name = input.format().name().to_lowercase();
        let ts_names = ["mpegts", "mpeg_ts", "m2ts", "trp", "ts"];
        ts_names.iter().any(|&name| format_name.contains(name))
    }

    /// Parse a bitrate string like "5M", "2000k", "1500000" to bits/sec
    pub(super) fn parse_bitrate(s: &str) -> Option<usize> {
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
        let encoders = [
            "libx264", "libx264rgb", "libx265", "libvpx-vp9", "ffv1", "mpeg4", "gif",
            // 音频编码器
            "libmp3lame", "mp3", "aac", "libfdk_aac", "pcm_s16le",
            "flac", "libvorbis", "vorbis", "libopus", "opus", "alac", "ac3",
        ];
        encoders
            .iter()
            .map(|&name| {
                let available = ffmpeg_next::codec::encoder::find_by_name(name).is_some();
                (name, available)
            })
            .collect()
    }

    pub(super) fn format_size(bytes: u64) -> String {
        crate::utils::file_utils::FileUtils::format_size(bytes)
    }

    /// 编码视频帧并写入输出（frame 为 None 时发送 EOF）
    pub(super) fn encode_and_write(
        encoder: &mut ffmpeg_next::codec::encoder::video::Encoder,
        frame: Option<&ffmpeg_next::frame::Video>,
        output: &mut ffmpeg_next::format::context::Output,
        enc_tb: ffmpeg_next::Rational,
    ) -> Result<()> {
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
            let out_tb = output
                .stream(0)
                .ok_or_else(|| anyhow!("输出流索引越界"))?
                .time_base();
            encoded_packet.rescale_ts(enc_tb, out_tb);
            encoded_packet
                .write_interleaved(output)
                .map_err(|e| anyhow!("写入视频 packet 失败: {}", e))?;
        }
        Ok(())
    }

    /// 写入封面 packet（附加图片流）
    pub(super) fn try_write_cover(
        packet: &ffmpeg_next::Packet,
        stream: &ffmpeg_next::format::stream::Stream,
        mt: ffmpeg_next::media::Type,
        cover_indices: &[usize],
        cover_idx: &mut usize,
        output: &mut ffmpeg_next::format::context::Output,
        log_cb: &mut impl FnMut(VideoToolLog),
        task_id: &str,
    ) {
        let is_cover = mt == ffmpeg_next::media::Type::Attachment
            || stream
                .disposition()
                .contains(ffmpeg_next::format::stream::Disposition::ATTACHED_PIC);
        if !is_cover {
            return;
        }
        if let Some(&out_idx) = cover_indices.get(*cover_idx) {
            if let Some(out_st) = output.stream(out_idx) {
                let in_tb = stream.time_base();
                let out_tb = out_st.time_base();
                let mut pkt = packet.clone();
                pkt.set_stream(out_idx);
                pkt.rescale_ts(in_tb, out_tb);
                pkt.set_position(-1);
                if let Err(e) = pkt.write_interleaved(output) {
                    log_cb(VideoToolLog {
                        task_id: task_id.to_string(),
                        level: "warn".to_string(),
                        message: format!("写入封面 packet 失败: {}", e),
                        timestamp: now_ms(),
                    });
                }
            }
        }
        *cover_idx += 1;
    }

    /// 创建 YUV420P 帧并填充黑边
    pub(super) fn scale_and_pad_frame(
        decoded: &ffmpeg_next::frame::Video,
        sws_ctx: &mut ffmpeg_next::software::scaling::Context,
        width: u32,
        height: u32,
        scaled_width: u32,
        scaled_height: u32,
        x_offset: u32,
        y_offset: u32,
        needs_padding: bool,
    ) -> Result<ffmpeg_next::util::frame::video::Video> {
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

            for row in 0..scaled_height as usize {
                let src_start = row * src_y_linesize;
                let dst_start = (row + y_offset as usize) * dst_y_linesize + x_offset as usize;
                let src_row = &scaled_frame.data(0)[src_start..src_start + scaled_width as usize];
                let dst_row = &mut yuv_frame.data_mut(0)[dst_start..dst_start + scaled_width as usize];
                dst_row.copy_from_slice(src_row);
            }

            for row in 0..(scaled_height / 2) as usize {
                let src_start = row * src_u_linesize;
                let dst_start = (row + (y_offset / 2) as usize) * dst_u_linesize + (x_offset / 2) as usize;
                let src_row = &scaled_frame.data(1)[src_start..src_start + (scaled_width / 2) as usize];
                let dst_row = &mut yuv_frame.data_mut(1)[dst_start..dst_start + (scaled_width / 2) as usize];
                dst_row.copy_from_slice(src_row);
            }

            for row in 0..(scaled_height / 2) as usize {
                let src_start = row * src_v_linesize;
                let dst_start = (row + (y_offset / 2) as usize) * dst_v_linesize + (x_offset / 2) as usize;
                let src_row = &scaled_frame.data(2)[src_start..src_start + (scaled_width / 2) as usize];
                let dst_row = &mut yuv_frame.data_mut(2)[dst_start..dst_start + (scaled_width / 2) as usize];
                dst_row.copy_from_slice(src_row);
            }
        } else {
            sws_ctx
                .run(decoded, &mut yuv_frame)
                .map_err(|e| anyhow!("颜色空间转换失败: {}", e))?;
        }

        Ok(yuv_frame)
    }

    // ── 日志辅助函数 ──

    pub(super) fn log_info(log_cb: &mut impl FnMut(VideoToolLog), task_id: &str, msg: &str) {
        log_cb(VideoToolLog {
            task_id: task_id.to_string(),
            level: "info".to_string(),
            message: msg.to_string(),
            timestamp: now_ms(),
        });
    }

    pub(super) fn log_warn(log_cb: &mut impl FnMut(VideoToolLog), task_id: &str, msg: &str) {
        log_cb(VideoToolLog {
            task_id: task_id.to_string(),
            level: "warn".to_string(),
            message: msg.to_string(),
            timestamp: now_ms(),
        });
    }

    pub(super) fn log_error(log_cb: &mut impl FnMut(VideoToolLog), task_id: &str, msg: &str) {
        log_cb(VideoToolLog {
            task_id: task_id.to_string(),
            level: "error".to_string(),
            message: msg.to_string(),
            timestamp: now_ms(),
        });
    }
}
