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
}

export type CharsetPreset = "simple" | "standard" | "complex" | "custom";
export type ColorMode = "monochrome" | "ansi256" | "trueColor" | "html";
export type Background = "black" | "white" | "transparent";

export interface AsciiArtOutput {
  plainText: string;
  htmlText: string;
  ansiText: string;
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
  imageData: number[];
  filename: string;
}
