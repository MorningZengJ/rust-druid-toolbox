// Model types matching Rust backend structures

export interface FileInfo {
  name: string;
  path: string;
  parentPath: string;
  isDir: boolean;
  extension: string;
  size: string;
  createdTime: number;
  modifiedTime: number;
}

export interface ReplaceInfo {
  id: string;
  content: string;
  target: string;
  enable: boolean;
  isRegex: boolean;
  isError: boolean;
}

export interface FilterItem {
  keyword: string;
  isRegex: boolean;
}

export type QuickFilter =
  | "all"
  | "folder"
  | "file"
  | { extension: string };

export interface ConflictInfo {
  targetName: string;
  sourceIndices: number[];
}

export interface RenameResult {
  total: number;
  success: number;
  errors: RenameError[];
}

export interface RenameError {
  fileName: string;
  error: string;
}

export type RuleTemplate =
  | "addPrefixNumber"
  | "addSuffixNumber"
  | "spaceToUnderscore"
  | "toLowercase"
  | "removeDigitsBeforeExt"
  | "custom";

// ASCII Art types

export type RenderMode = "png" | "svg" | "canvas";

export interface CharColor {
  char: string;
  r: number;
  g: number;
  b: number;
}

export interface AsciiArtParams {
  width: number;
  charset: CharsetPreset;
  customCharset: string;
  contrast: number;
  brightness: number;
  saturation: number;
  invert: boolean;
  colorMode: ColorMode;
  background: Background;
  charAspectRatio: number;
  renderMode: RenderMode;
}

export type CharsetPreset = "simple" | "standard" | "complex" | "custom";
export type ColorMode = "monochrome" | "ansi256" | "trueColor" | "html";
export type Background = "black" | "white" | "transparent";

export interface AsciiArtOutput {
  plainText: string;
  imageData?: number[];
  svgData?: string;
  charColors?: CharColor[];
  outputPath?: string;
}

// Video Frame types

export interface VideoInfo {
  width: number;
  height: number;
  fps: number;
  duration: number;
  totalFrames: number;
}

export type ExtractMode =
  | "allFrames"
  | "byInterval"
  | "byCount"
  | "byTimePoints";

export type OutputFormat = "png" | "jpeg";

export interface ExtractParams {
  videoPath: string;
  mode: ExtractMode;
  intervalSecs: number;
  frameCount: number;
  timePoints: number[];
  outputFormat: OutputFormat;
  jpegQuality: number;
  resizeWidth?: number;
}

export interface ExtractedFrame {
  index: number;
  timestamp: number;
  filename: string;
  filePath: string;
}

export interface ProgressInfo {
  progress: number;
  currentFrame: number;
  totalFrames: number;
  elapsedMs: number;
}

export interface LogEntry {
  level: string;
  message: string;
  timestamp: number;
}

export interface AsciiArtProgress {
  stage: string;
  progress: number;
  elapsedMs: number;
}

// Live Record types

export type RecordingStatus = "connecting" | "recording" | "stopping" | "stopped" | "error";

export type ContainerFormat = "mp4" | "mkv" | "flv" | "ts";

export interface RecordParams {
  url: string;
  outputDir: string;
  filenamePrefix: string;
  containerFormat: ContainerFormat;
  streamCopy: boolean;
  segmentDurationSecs: number | null;
  previewEnabled: boolean;
  previewIntervalMs: number;
}

export interface RecordProgressInfo {
  taskId: string;
  status: RecordingStatus;
  durationSecs: number;
  fileSizeBytes: number;
  bitrateKbps: number;
  currentSegment: number;
  outputPath: string;
}

export interface PreviewFrame {
  taskId: string;
  jpegData: number[];
  width: number;
  height: number;
  timestamp: number;
}

export interface LiveRecordLogEntry {
  taskId: string;
  level: string;
  message: string;
  timestamp: number;
}

export interface RecordingTaskInfo {
  taskId: string;
  url: string;
  status: RecordingStatus;
  params: RecordParams;
  durationSecs: number;
  fileSizeBytes: number;
  outputPath: string;
  currentSegment: number;
  startTimeMs: number;
}
