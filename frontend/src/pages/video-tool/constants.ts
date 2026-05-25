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
