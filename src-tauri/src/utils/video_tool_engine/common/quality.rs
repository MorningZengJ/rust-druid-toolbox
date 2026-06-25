use anyhow::anyhow;

/// 编码质量配置
pub(crate) struct QualityConfig {
    pub crf: Option<i32>,
    pub preset: Option<&'static str>,
    pub tune: Option<&'static str>,
}

/// 根据 quality_preset 名称获取 CRF/preset/tune 配置
pub(crate) fn get_quality_config(preset: Option<&str>) -> QualityConfig {
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
pub(crate) fn apply_quality_config(
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
        let _ = set_enc_opt(enc, "level", "3");
        let _ = set_enc_opt(enc, "slicecrc", "1");
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
            let _ = set_enc_opt(enc, "crf", &crf.to_string());
        }
        if let Some(p) = config.preset {
            let _ = set_enc_opt(enc, "preset", p);
        }
        if let Some(t) = config.tune {
            let _ = set_enc_opt(enc, "tune", t);
        }
        // 设一个较大的码率上限防止峰值过高
        enc.set_bit_rate(fallback_bitrate.max(50_000_000));
        return;
    }

    // libvpx-vp9: CRF 模式
    if codec_name == "libvpx-vp9" {
        if let Some(crf) = config.crf {
            let _ = set_enc_opt(enc, "crf", &crf.to_string());
            let _ = set_enc_opt(enc, "b", "0"); // 告诉 vp9 使用 CRF 模式
        }
        if let Some(p) = config.preset {
            let deadline = match p {
                "slow" => "good",
                "fast" => "realtime",
                _ => "good",
            };
            let _ = set_enc_opt(enc, "deadline", deadline);
        }
        enc.set_bit_rate(fallback_bitrate.max(50_000_000));
        return;
    }

    // mpeg4 等其他编码器: CBR
    enc.set_bit_rate(fallback_bitrate.max(2_000_000));
}

/// 设置编码器选项（通过 av_opt_set）—— 不再 unwrap
fn set_enc_opt(
    enc: &mut ffmpeg_next::codec::encoder::video::Video,
    key: &str,
    val: &str,
) -> Result<(), anyhow::Error> {
    let c_key = std::ffi::CString::new(key)
        .map_err(|e| anyhow!("invalid C string for key '{}': {}", key, e))?;
    let c_val = std::ffi::CString::new(val)
        .map_err(|e| anyhow!("invalid C string for val '{}': {}", val, e))?;
    unsafe {
        ffmpeg_next::sys::av_opt_set(
            enc.as_mut_ptr() as *mut std::ffi::c_void,
            c_key.as_ptr(),
            c_val.as_ptr(),
            0,
        );
    }
    Ok(())
}
