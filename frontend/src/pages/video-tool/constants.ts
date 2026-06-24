import type { TFunction } from "i18next";

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

/** 获取翻译后的视频编码器选项（响应式，由调用方传入 t 函数） */
export function getVideoCodecs(t: TFunction): CodecOption[] {
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

/** 质量预设选项 */
export interface QualityPresetOption {
  value: string;
  label: string;
  tooltip: string;
}

/** 获取翻译后的质量预设选项（响应式，由调用方传入 t 函数） */
export function getQualityPresets(t: TFunction): QualityPresetOption[] {
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
