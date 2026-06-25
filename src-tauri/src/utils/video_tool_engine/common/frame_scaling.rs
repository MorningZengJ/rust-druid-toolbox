use anyhow::{anyhow, Result};

/// 计算保持宽高比的缩放尺寸
pub(crate) fn calc_aspect_ratio_resize(
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
    let (sw, sh) = if src_ratio > target_ratio {
        (
            target_width,
            ((target_width as f64 / src_ratio) as u32).max(1),
        )
    } else {
        (
            ((target_height as f64 * src_ratio) as u32).max(1),
            target_height,
        )
    };
    (sw / 2 * 2, sh / 2 * 2)
}

/// 查询编码器支持的音频参数
pub(crate) fn query_audio_encoder_params(
    enc_codec: &ffmpeg_next::Codec,
    dec_format: ffmpeg_next::format::Sample,
    dec_rate: u32,
    dec_channels: u16,
) -> (
    ffmpeg_next::format::Sample,
    u32,
    ffmpeg_next::channel_layout::ChannelLayout,
) {
    let audio_codec = enc_codec.audio().ok();
    let format = if let Some(ref codec) = audio_codec {
        if let Some(formats) = codec.formats() {
            let supported: Vec<_> = formats.collect();
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

/// 约束 timebase 以满足编码器限制
pub(crate) fn constrain_timebase(tb: ffmpeg_next::Rational) -> ffmpeg_next::Rational {
    let max_den: i32 = 65535;
    if tb.1 <= max_den {
        return tb;
    }
    let g = gcd(tb.0.unsigned_abs(), tb.1.unsigned_abs());
    let mut num = (tb.0.unsigned_abs() / g) as i32;
    let mut den = (tb.1.unsigned_abs() / g) as i32;
    while den > max_den {
        num = (num as f64 * max_den as f64 / den as f64).round() as i32;
        den = max_den;
        if num <= 0 {
            num = 1;
        }
    }
    ffmpeg_next::Rational::new(num, den)
}

pub(crate) fn gcd(mut a: u32, mut b: u32) -> u32 {
    while b != 0 {
        let t = b;
        b = a % b;
        a = t;
    }
    a
}

/// 创建 YUV420P 帧并填充黑边
pub(crate) fn scale_and_pad_frame(
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

        let src_y = scaled_frame.stride(0);
        let src_u = scaled_frame.stride(1);
        let src_v = scaled_frame.stride(2);
        let dst_y = yuv_frame.stride(0);
        let dst_u = yuv_frame.stride(1);
        let dst_v = yuv_frame.stride(2);

        for row in 0..height as usize {
            yuv_frame.data_mut(0)[row * dst_y..row * dst_y + width as usize].fill(0);
        }
        for row in 0..(height / 2) as usize {
            yuv_frame.data_mut(1)[row * dst_u..row * dst_u + (width / 2) as usize].fill(128);
        }
        for row in 0..(height / 2) as usize {
            yuv_frame.data_mut(2)[row * dst_v..row * dst_v + (width / 2) as usize].fill(128);
        }

        for row in 0..scaled_height as usize {
            let s = row * src_y;
            let d = (row + y_offset as usize) * dst_y + x_offset as usize;
            yuv_frame.data_mut(0)[d..d + scaled_width as usize]
                .copy_from_slice(&scaled_frame.data(0)[s..s + scaled_width as usize]);
        }
        for row in 0..(scaled_height / 2) as usize {
            let s = row * src_u;
            let d = (row + (y_offset / 2) as usize) * dst_u + (x_offset / 2) as usize;
            yuv_frame.data_mut(1)[d..d + (scaled_width / 2) as usize]
                .copy_from_slice(&scaled_frame.data(1)[s..s + (scaled_width / 2) as usize]);
        }
        for row in 0..(scaled_height / 2) as usize {
            let s = row * src_v;
            let d = (row + (y_offset / 2) as usize) * dst_v + (x_offset / 2) as usize;
            yuv_frame.data_mut(2)[d..d + (scaled_width / 2) as usize]
                .copy_from_slice(&scaled_frame.data(2)[s..s + (scaled_width / 2) as usize]);
        }
    } else {
        sws_ctx
            .run(decoded, &mut yuv_frame)
            .map_err(|e| anyhow!("颜色空间转换失败: {}", e))?;
    }

    Ok(yuv_frame)
}

// ── Tests ──

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn gcd_basic() {
        assert_eq!(gcd(48, 18), 6);
        assert_eq!(gcd(17, 13), 1);
        assert_eq!(gcd(0, 5), 5);
        assert_eq!(gcd(100, 0), 100);
    }

    #[test]
    fn aspect_ratio_16x9_to_4x3() {
        let (w, h) = calc_aspect_ratio_resize(1920, 1080, 640, 480);
        // 1920/1080 = 1.778 > 640/480 = 1.333 → height-constrained
        assert_eq!(w % 2, 0);
        assert_eq!(h % 2, 0);
        assert!(w <= 640);
        assert!(h <= 480);
    }

    #[test]
    fn aspect_ratio_4x3_to_16x9() {
        let (w, h) = calc_aspect_ratio_resize(640, 480, 1280, 720);
        assert_eq!(w % 2, 0);
        assert_eq!(h % 2, 0);
        assert!(w <= 1280);
        assert!(h <= 720);
    }

    #[test]
    fn aspect_ratio_same_ratio() {
        let (w, h) = calc_aspect_ratio_resize(800, 600, 400, 300);
        assert_eq!((w, h), (400, 300));
    }

    #[test]
    fn aspect_ratio_zero_input() {
        let (w, h) = calc_aspect_ratio_resize(0, 0, 640, 480);
        assert_eq!((w, h), (640, 480)); // fallback to target
    }

    #[test]
    fn constrain_timebase_small_den() {
        let tb = ffmpeg_next::Rational::new(1, 1000);
        let result = constrain_timebase(tb);
        assert_eq!(result, tb); // unchanged
    }

    #[test]
    fn constrain_timebase_large_den() {
        let tb = ffmpeg_next::Rational::new(1, 90000);
        let result = constrain_timebase(tb);
        assert!(result.1 <= 65535);
        assert!(result.0 > 0);
    }
}
