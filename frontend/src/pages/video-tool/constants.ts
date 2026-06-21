import i18n from "@/i18n";

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

/** 获取翻译后的视频编码器选项 */
function getVideoCodecs(): CodecOption[] {
  const t = i18n.getFixedT(null, "videoTool");
  return [
    {
      value: "copy",
      label: t("codec.copy.label"),
      tooltip: t("codec.copy.tooltip"),
    },
    {
      value: "libx264",
      label: t("codec.libx264.label"),
      tooltip: t("codec.libx264.tooltip"),
    },
    {
      value: "libx265",
      label: t("codec.libx265.label"),
      tooltip: t("codec.libx265.tooltip"),
    },
    {
      value: "ffv1",
      label: t("codec.ffv1.label"),
      tooltip: t("codec.ffv1.tooltip"),
    },
    {
      value: "libvpx-vp9",
      label: t("codec.libvpx-vp9.label"),
      tooltip: t("codec.libvpx-vp9.tooltip"),
    },
    {
      value: "mpeg4",
      label: t("codec.mpeg4.label"),
      tooltip: t("codec.mpeg4.tooltip"),
    },
  ];
}

/** 保持向后兼容的静态编码器列表 */
export const VIDEO_CODECS = getVideoCodecs();

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

/** 获取翻译后的质量预设选项 */
function getQualityPresets(): QualityPresetOption[] {
  const t = i18n.getFixedT(null, "videoTool");
  return [
    {
      value: "high",
      label: t("quality.high.label"),
      tooltip: t("quality.high.tooltip"),
    },
    {
      value: "balanced",
      label: t("quality.balanced.label"),
      tooltip: t("quality.balanced.tooltip"),
    },
    {
      value: "fast",
      label: t("quality.fast.label"),
      tooltip: t("quality.fast.tooltip"),
    },
  ];
}

/** 保持向后兼容的静态质量预设列表 */
export const QUALITY_PRESETS = getQualityPresets();
