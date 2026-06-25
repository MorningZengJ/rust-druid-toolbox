/// 重置输出流的 codec_tag，避免容器格式兼容性问题
pub(crate) fn reset_codec_tag(stream: &mut ffmpeg_next::format::stream::StreamMut) {
    unsafe {
        let avstream = stream.as_mut_ptr();
        (*(*avstream).codecpar).codec_tag = 0;
    }
}
