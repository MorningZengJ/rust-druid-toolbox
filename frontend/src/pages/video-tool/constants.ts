export const VIDEO_FORMATS = ["mp4", "mkv", "avi", "webm", "mov", "flv"];
export const AUDIO_FORMATS = ["mp3", "aac", "wav", "flac", "ogg", "opus"];
export const AUDIO_BITRATES = ["128k", "192k", "256k", "320k"];

/** 视频容器支持的音频编码映射 */
export const VIDEO_AUDIO_CODECS: Record<string, string[]> = {
  mp4:  ["aac", "mp3", "alac", "ac3", "flac", "opus", "vorbis"],
  mov:  ["aac", "mp3", "alac", "ac3", "flac"],
  mkv:  ["aac", "mp3", "alac", "ac3", "flac", "opus", "vorbis"],
  avi:  ["mp3", "aac"],
  webm: ["opus", "vorbis"],
  flv:  ["mp3", "aac"],
};

export const VIDEO_EXTENSIONS = ["mp4", "mkv", "avi", "webm", "mov", "flv", "ts"];
export const MEDIA_EXTENSIONS = [
  "mp4", "mkv", "avi", "webm", "mov", "flv", "ts",
  "mp3", "aac", "wav", "flac", "ogg", "opus",
];

/** 视频编码器选项 */
export interface CodecOption {
  value: string;
  label: string;
  tooltip: string;
}

export const VIDEO_CODECS: CodecOption[] = [
  {
    value: "copy",
    label: "流复制",
    tooltip: "不重新编码，直接复制视频/音频数据。零质量损失，速度最快，但要求所有输入视频的编码格式和分辨率一致。",
  },
  {
    value: "libx264",
    label: "H.264",
    tooltip: "兼容性最广泛的视频编码，几乎所有设备和播放器都支持。适合日常使用。",
  },
  {
    value: "libx265",
    label: "H.265",
    tooltip: "新一代视频编码，同等画质下文件比 H.264 小 30%-50%。编码较慢，部分老旧播放器不支持。",
  },
  {
    value: "ffv1",
    label: "FFV1 无损",
    tooltip: "数学无损编码，画质完全无损失，适合归档和专业后期。文件非常大（约为原始大小的 1/3），不适合日常播放。",
  },
  {
    value: "libvpx-vp9",
    label: "VP9",
    tooltip: "Google 开发的开放编码，配合 WebM 格式使用。画质优秀但编码较慢。",
  },
  {
    value: "mpeg4",
    label: "MPEG4",
    tooltip: "旧一代编码，兼容性好但压缩效率低。仅在其他编码不可用时作为兜底方案。",
  },
];

/** 格式转换用的编码器（不含流复制） */
export const CONVERT_VIDEO_CODECS: CodecOption[] = VIDEO_CODECS.filter(
  (c) => c.value !== "copy"
);

/** 质量预设选项 */
export interface QualityPresetOption {
  value: string;
  label: string;
  tooltip: string;
}

export const QUALITY_PRESETS: QualityPresetOption[] = [
  {
    value: "high",
    label: "高质量",
    tooltip: "CRF 18，视觉无损级别，文件较大，适合对画质要求极高的场景。",
  },
  {
    value: "balanced",
    label: "平衡",
    tooltip: "CRF 23，质量与文件大小的最佳平衡，推荐日常使用。",
  },
  {
    value: "fast",
    label: "快速",
    tooltip: "CRF 28，编码速度快，文件较小，适合预览或对画质要求不高的场景。",
  },
];
