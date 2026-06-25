//! Video tool engine shared utilities — split from the original common.rs (618 lines).
//!
//! Module layout:
//!   errors        — VideoToolError
//!   quality       — QualityConfig, encoding quality presets, encoder option helpers
//!   codec         — video/audio encoder lookup, availability check
//!   format        — format name normalization, TS detection, bitrate parsing
//!   ffmpeg_io     — encode-and-write, cover attachment writing
//!   frame_scaling — aspect-ratio resize, timebase constraint, YUV padding
//!   progress      — timestamp helper, structured log callbacks

mod codec;
mod errors;
mod ffmpeg_io;
mod format;
mod frame_scaling;
mod progress;
mod quality;

// ── Free-function re-exports ──

pub(super) use codec::find_audio_encoder_for_codec;
pub(super) use codec::find_video_encoder_for_format;
pub(super) use format::reset_codec_tag;
pub(super) use progress::now_ms;
pub(super) use quality::apply_quality_config;
pub(super) use quality::get_quality_config;
pub(super) use quality::QualityConfig;

// ── VideoToolEngine impl blocks (pub(super) from the parent module) ──

use super::VideoToolEngine;
use crate::model::video_tool_state::VideoToolLog;
use anyhow::Result;
use ffmpeg_next as ffi;

impl VideoToolEngine {
    // ── codec ──

    pub fn check_encoder_availability() -> Vec<(&'static str, bool)> {
        codec::check_encoder_availability()
    }

    // ── format ──

    pub(super) fn normalize_format_name(ext: &str) -> &str {
        match ext {
            "mkv" => "matroska",
            "ts" => "mpegts",
            "m4v" => "mp4",
            other => other,
        }
    }

    pub(super) fn is_ts_format(path: &std::path::Path) -> bool {
        let Ok(input) = ffi::format::input(path) else { return false };
        let format_name = input.format().name().to_lowercase();
        let ts_names = ["mpegts", "mpeg_ts", "m2ts", "trp", "ts"];
        ts_names.iter().any(|&name| format_name.contains(name))
    }

    pub(super) fn parse_bitrate(s: &str) -> Option<usize> {
        let s = s.trim();
        if s.is_empty() { return None; }
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

    pub(super) fn format_size(bytes: u64) -> String {
        crate::utils::file_utils::FileUtils::format_size(bytes)
    }

    pub(super) fn is_audio_compatible(codec_id: ffi::codec::Id, output_format: &str) -> bool {
        match output_format {
            "flv" => matches!(codec_id, ffi::codec::Id::MP3 | ffi::codec::Id::AAC | ffi::codec::Id::ADPCM_SWF | ffi::codec::Id::PCM_S16LE),
            "webm" => matches!(codec_id, ffi::codec::Id::OPUS | ffi::codec::Id::VORBIS),
            _ => true,
        }
    }

    // ── frame_scaling ──

    pub(super) fn calculate_aspect_ratio_resize(
        src_width: u32, src_height: u32, target_width: u32, target_height: u32,
    ) -> (u32, u32) {
        frame_scaling::calc_aspect_ratio_resize(src_width, src_height, target_width, target_height)
    }

    pub(super) fn query_audio_encoder_params(
        enc_codec: &ffi::Codec,
        dec_format: ffi::format::Sample,
        dec_rate: u32,
        dec_channels: u16,
    ) -> (ffi::format::Sample, u32, ffi::channel_layout::ChannelLayout) {
        frame_scaling::query_audio_encoder_params(enc_codec, dec_format, dec_rate, dec_channels)
    }

    pub(super) fn constrain_timebase(tb: ffi::Rational) -> ffi::Rational {
        frame_scaling::constrain_timebase(tb)
    }

    pub(super) fn gcd(a: u32, b: u32) -> u32 {
        frame_scaling::gcd(a, b)
    }

    pub(super) fn scale_and_pad_frame(
        decoded: &ffi::frame::Video,
        sws_ctx: &mut ffi::software::scaling::Context,
        width: u32, height: u32, scaled_width: u32, scaled_height: u32,
        x_offset: u32, y_offset: u32, needs_padding: bool,
    ) -> Result<ffi::util::frame::video::Video> {
        frame_scaling::scale_and_pad_frame(decoded, sws_ctx, width, height, scaled_width, scaled_height, x_offset, y_offset, needs_padding)
    }

    // ── ffmpeg_io ──

    pub(super) fn encode_and_write(
        encoder: &mut ffi::codec::encoder::video::Encoder,
        frame: Option<&ffi::frame::Video>,
        output: &mut ffi::format::context::Output,
        enc_tb: ffi::Rational,
    ) -> Result<()> {
        ffmpeg_io::encode_and_write(encoder, frame, output, enc_tb)
    }

    pub(super) fn try_write_cover(
        packet: &ffi::Packet,
        stream: &ffi::format::stream::Stream,
        mt: ffi::media::Type,
        cover_indices: &[usize],
        cover_idx: &mut usize,
        output: &mut ffi::format::context::Output,
        log_cb: &mut impl FnMut(VideoToolLog),
        task_id: &str,
    ) {
        ffmpeg_io::try_write_cover(packet, stream, mt, cover_indices, cover_idx, output, log_cb, task_id)
    }

    // ── progress ──

    pub(super) fn log_info(log_cb: &mut impl FnMut(VideoToolLog), task_id: &str, msg: &str) {
        progress::log_info(log_cb, task_id, msg)
    }

    pub(super) fn log_warn(log_cb: &mut impl FnMut(VideoToolLog), task_id: &str, msg: &str) {
        progress::log_warn(log_cb, task_id, msg)
    }

    pub(super) fn log_error(log_cb: &mut impl FnMut(VideoToolLog), task_id: &str, msg: &str) {
        progress::log_error(log_cb, task_id, msg)
    }
}

// ── Tests ──

#[cfg(test)]
mod tests {
    use super::VideoToolEngine;

    #[test]
    fn normalize_format_mkv() {
        assert_eq!(VideoToolEngine::normalize_format_name("mkv"), "matroska");
    }

    #[test]
    fn normalize_format_ts() {
        assert_eq!(VideoToolEngine::normalize_format_name("ts"), "mpegts");
    }

    #[test]
    fn normalize_format_pass_through() {
        assert_eq!(VideoToolEngine::normalize_format_name("mp4"), "mp4");
    }

    #[test]
    fn parse_bitrate_meg() {
        assert_eq!(VideoToolEngine::parse_bitrate("5M"), Some(5_000_000));
    }

    #[test]
    fn parse_bitrate_kilo() {
        assert_eq!(VideoToolEngine::parse_bitrate("2000k"), Some(2_000_000));
    }

    #[test]
    fn parse_bitrate_plain() {
        assert_eq!(VideoToolEngine::parse_bitrate("1500000"), Some(1_500_000));
    }

    #[test]
    fn parse_bitrate_empty() {
        assert_eq!(VideoToolEngine::parse_bitrate(""), None);
    }

    #[test]
    fn gcd_works() {
        assert_eq!(VideoToolEngine::gcd(48, 18), 6);
    }
}
