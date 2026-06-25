use anyhow::{anyhow, Result};

/// 根据输出格式查找可用的视频编码器。
/// 返回 String 而非 &'static str，避免 leak_static 内存泄漏。
pub(crate) fn find_video_encoder_for_format(
    format: &str,
    user_codec: Option<&str>,
) -> Result<String> {
    if let Some(codec) = user_codec {
        if codec == "copy" {
            return Ok("copy".to_string());
        }
        if ffmpeg_next::codec::encoder::find_by_name(codec).is_some() {
            return Ok(codec.to_string());
        }
        return Err(anyhow!(
            "未找到指定的编码器 '{}'，请确保 FFmpeg 已编译该编码器。",
            codec
        ));
    }

    let candidates: &[&str] = match format {
        "flv" => &["libx264", "libx264rgb", "flv", "mpeg4"],
        "webm" => &["libvpx", "libvpx-vp9", "libx264"],
        _ => &["libx264", "libx264rgb", "libx265", "mpeg4"],
    };

    candidates
        .iter()
        .find(|&&name| ffmpeg_next::codec::encoder::find_by_name(name).is_some())
        .copied()
        .map(String::from)
        .ok_or_else(move || {
            anyhow!(
                "未找到可用的视频编码器 ({}). 请确保已安装包含 libx264 的 FFmpeg.",
                format
            )
        })
}

/// 根据音频格式名称查找可用的音频编码器
pub(crate) fn find_audio_encoder_for_codec(codec_name: &str) -> Result<&'static str> {
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
            return if ffmpeg_next::codec::encoder::find_by_name(codec_name).is_some() {
                let all = &[
                    "libmp3lame",
                    "mp3",
                    "aac",
                    "libfdk_aac",
                    "pcm_s16le",
                    "flac",
                    "libvorbis",
                    "vorbis",
                    "libopus",
                    "opus",
                    "alac",
                    "ac3",
                ];
                all.iter()
                    .find(|&&n| n == codec_name)
                    .copied()
                    .ok_or_else(|| anyhow!("编码器 '{}' 存在但不在已知列表中", codec_name))
            } else {
                let available = get_available_audio_formats();
                if available.is_empty() {
                    Err(anyhow!(
                        "未找到可用的音频编码器: {}. 当前 FFmpeg 构建不包含任何音频编码支持",
                        codec_name
                    ))
                } else {
                    Err(anyhow!(
                        "未找到可用的音频编码器: {}. 可用的音频格式: {}",
                        codec_name,
                        available.join(", ")
                    ))
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
                anyhow!(
                    "未找到可用的音频编码器: {}. 当前 FFmpeg 构建不包含该编码支持",
                    codec_name
                )
            } else {
                anyhow!(
                    "未找到可用的音频编码器: {}. 可用的音频格式: {}",
                    codec_name,
                    available.join(", ")
                )
            }
        })
}

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
            encoders
                .iter()
                .any(|&name| ffmpeg_next::codec::encoder::find_by_name(name).is_some())
        })
        .map(|(format, _)| *format)
        .collect()
}

pub(crate) fn check_encoder_availability() -> Vec<(&'static str, bool)> {
    let encoders = [
        "libx264",
        "libx264rgb",
        "libx265",
        "libvpx-vp9",
        "ffv1",
        "mpeg4",
        "gif",
        "libmp3lame",
        "mp3",
        "aac",
        "libfdk_aac",
        "pcm_s16le",
        "flac",
        "libvorbis",
        "vorbis",
        "libopus",
        "opus",
        "alac",
        "ac3",
    ];
    encoders
        .iter()
        .map(|&name| {
            let available = ffmpeg_next::codec::encoder::find_by_name(name).is_some();
            (name, available)
        })
        .collect()
}
