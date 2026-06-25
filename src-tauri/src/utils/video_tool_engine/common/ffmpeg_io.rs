use super::progress::now_ms;
use crate::model::video_tool_state::VideoToolLog;
use anyhow::{anyhow, Result};

/// 编码视频帧并写入输出（frame 为 None 时发送 EOF）
pub(crate) fn encode_and_write(
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
pub(crate) fn try_write_cover(
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
