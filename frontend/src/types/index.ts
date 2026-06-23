// Model types matching Rust backend structures

export interface FileInfo {
  name: string;
  path: string;
  parentPath: string;
  isDir: boolean;
  extension: string;
  size: string;
  sizeBytes: number;
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

interface RenameError {
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

type SortDirection = "asc" | "desc";

export type SortField = "name" | "size" | "extension";

export interface SortColumn {
  field: SortField;
  direction: SortDirection;
}

// ASCII Art types

export type RenderMode = "png" | "svg" | "canvas";

interface CharColor {
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

// Video Tool types

export interface MergeVideosParams {
  inputPaths: string[];
  outputPath: string;
  outputFormat: string;
  reencode: boolean;
  videoCodec?: string;
  videoBitrate?: string;
  qualityPreset?: string;
}

export interface MergeVideosResult {
  outputPath: string;
  durationSecs: number;
  fileSizeBytes: number;
}

export interface ImagesToVideoParams {
  imagePaths: string[];
  outputPath: string;
  fps: number;
  outputFormat: string;
  resolution: [number, number] | null;
  audioPath: string | null;
  loopCount: number | null;
  videoCodec?: string;
  videoBitrate?: string;
  qualityPreset?: string;
}

export interface ImagesToVideoResult {
  outputPath: string;
  durationSecs: number;
  frameCount: number;
  fileSizeBytes: number;
}

type ConversionTarget =
  | { videoFormat: string }
  | { audioFormat: string };

export interface ConvertFormatParams {
  inputPath: string;
  outputPath: string;
  target: ConversionTarget;
  audioBitrate: string | null;
  videoBitrate: string | null;
  resolution: [number, number] | null;
  audioCodec: string | null;
  videoCodec?: string;
  qualityPreset?: string;
}

export interface ConvertFormatResult {
  outputPath: string;
  fileSizeBytes: number;
}

// ── Batch Format Conversion ──

export interface BatchConvertParams {
  items: ConvertFormatParams[];
}

export interface BatchConvertResult {
  results: BatchConvertItemResult[];
  totalFiles: number;
  successCount: number;
  failCount: number;
}

interface BatchConvertItemResult {
  inputPath: string;
  outputPath: string;
  fileSizeBytes: number;
  success: boolean;
  error: string | null;
}

export interface BatchProgress {
  currentIndex: number;
  totalCount: number;
  overallProgress: number;
  currentFileName: string;
}

type ConvertFileStatus = "pending" | "converting" | "done" | "error";

export interface ConvertFileItem {
  inputPath: string;
  outputPath: string;
  status: ConvertFileStatus;
  error?: string;
}

export interface VideoToolProgress {
  taskId: string;
  progress: number;
  currentStep: string;
  elapsedMs: number;
  currentFileIndex?: number;
  totalFiles?: number;
  currentFileName?: string;
  speed?: number;
  etaMs?: number;
  framesProcessed?: number;
  totalFrames?: number;
}

export interface VideoToolLog {
  taskId: string;
  level: string;
  message: string;
  timestamp: number;
}

export type VideoToolTab = "merge" | "images" | "convert" | "extract";

// Update types

export type UpdateStatus = "idle" | "checking" | "available" | "downloading" | "downloaded" | "installing" | "error" | "no-update";

export interface UpdateProgress {
  downloadedBytes: number;
  totalBytes: number | null;
  percentage: number;
}

/** Machine-readable error classification for update failures */
export type UpdateErrorCode =
  | "offline"
  | "network"
  | "timeout"
  | "signature"
  | "parse"
  | null;
