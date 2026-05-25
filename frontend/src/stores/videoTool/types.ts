import type {
  MergeVideosResult,
  ImagesToVideoResult,
  BatchConvertResult,
  BatchProgress,
  ConvertFileItem,
  VideoToolLog,
  VideoToolTab,
  VideoInfo,
  ExtractParams,
  ExtractedFrame,
  LogEntry,
  ExtractMode,
  OutputFormat,
} from "@/types";

export type { ExtractMode, OutputFormat };

export interface VideoToolState {
  // Tab
  activeTab: VideoToolTab;
  setActiveTab: (tab: VideoToolTab) => void;

  // Shared
  ffmpegAvailable: boolean;
  checkFfmpeg: () => Promise<void>;
  encoderStatus: Record<string, boolean>;
  checkEncoders: () => Promise<void>;
  isProcessing: boolean;
  progress: number;
  logs: VideoToolLog[];
  errorMessage: string | null;
  clearError: () => void;
  clearLogs: () => void;

  // Merge state
  mergeInputPaths: string[];
  mergeOutputPath: string;
  mergeOutputFormat: string;
  mergeReencode: boolean;
  mergeResult: MergeVideosResult | null;
  mergeProgressDetail: {
    currentFileIndex: number;
    totalFiles: number;
    currentFileName: string;
    speed: number;
    etaMs: number;
    framesProcessed: number;
    totalFrames: number;
  } | null;
  setMergeInputs: (paths: string[]) => void;
  setMergeOutputPath: (path: string) => void;
  setMergeOutputFormat: (fmt: string) => void;
  setMergeReencode: (v: boolean) => void;
  runMerge: () => Promise<void>;

  // Images state
  imagesFolderPath: string;
  imagesInputPaths: string[];
  imagesOutputPath: string;
  imagesFps: number;
  imagesOutputFormat: string;
  imagesResolution: [number, number] | null;
  imagesAudioPath: string | null;
  imagesResult: ImagesToVideoResult | null;
  setImagesFolderPath: (path: string) => void;
  loadImagesFromFolder: (folderPath?: string) => Promise<void>;
  setImagesOutputPath: (path: string) => void;
  setImagesFps: (fps: number) => void;
  setImagesOutputFormat: (fmt: string) => void;
  setImagesResolution: (res: [number, number] | null) => void;
  setImagesAudioPath: (path: string | null) => void;
  runImagesToVideo: () => Promise<void>;

  // Convert state (batch)
  convertFiles: ConvertFileItem[];
  convertTarget: "video" | "audio";
  convertVideoFormat: string;
  convertAudioFormat: string;
  convertAudioBitrate: string;
  convertVideoBitrate: string;
  convertBatchResult: BatchConvertResult | null;
  convertBatchProgress: BatchProgress | null;
  convertCurrentFileProgress: number;
  setConvertInputs: (paths: string[]) => void;
  addConvertInputs: (paths: string[]) => void;
  removeConvertInput: (index: number) => void;
  clearConvertInputs: () => void;
  setConvertTarget: (t: "video" | "audio") => void;
  setConvertVideoFormat: (fmt: string) => void;
  setConvertAudioFormat: (fmt: string) => void;
  setConvertAudioBitrate: (rate: string) => void;
  setConvertVideoBitrate: (rate: string) => void;
  runBatchConvert: () => Promise<void>;

  // Extract (抽帧) state
  extractVideoPath: string;
  extractVideoInfo: VideoInfo | null;
  extractParams: ExtractParams;
  extractFrames: ExtractedFrame[];
  isExtracting: boolean;
  extractProgress: number;
  extractOutputDir: string;
  extractSelectedFrame: number | null;
  extractLogs: LogEntry[];
  extractEstimatedTimeRemaining: number | null;
  _extractWatcherUnlisten: (() => void) | null;
  setExtractVideoPath: (path: string) => void;
  setExtractOutputDir: (dir: string) => void;
  loadVideo: (path?: string) => Promise<void>;
  setExtractParams: (updates: Partial<ExtractParams>) => void;
  runExtractFrames: () => Promise<void>;
  setExtractSelectedFrame: (index: number | null) => void;
  startExtractWatcher: () => Promise<void>;
  stopExtractWatcher: () => void;

  // Event listeners
  _unlisteners: (() => void)[];
  registerEventListeners: () => Promise<void>;
  unregisterEventListeners: () => void;
}
