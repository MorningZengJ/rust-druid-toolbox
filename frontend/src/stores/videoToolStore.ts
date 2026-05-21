import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type {
  MergeVideosParams,
  MergeVideosResult,
  ImagesToVideoParams,
  ImagesToVideoResult,
  ConvertFormatParams,
  ConvertFormatResult,
  VideoToolProgress,
  VideoToolLog,
  VideoToolTab,
  VideoInfo,
  ExtractParams,
  ExtractMode,
  OutputFormat,
  ExtractedFrame,
  ProgressInfo,
  LogEntry,
} from "@/types";

interface VideoToolState {
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
  setMergeInputs: (paths: string[]) => void;
  setMergeOutputPath: (path: string) => void;
  setMergeOutputFormat: (fmt: string) => void;
  setMergeReencode: (v: boolean) => void;
  runMerge: () => Promise<void>;

  // Images state
  imagesInputPaths: string[];
  imagesOutputPath: string;
  imagesFps: number;
  imagesOutputFormat: string;
  imagesResolution: [number, number] | null;
  imagesAudioPath: string | null;
  imagesResult: ImagesToVideoResult | null;
  setImagesInputPaths: (paths: string[]) => void;
  setImagesOutputPath: (path: string) => void;
  setImagesFps: (fps: number) => void;
  setImagesOutputFormat: (fmt: string) => void;
  setImagesResolution: (res: [number, number] | null) => void;
  setImagesAudioPath: (path: string | null) => void;
  runImagesToVideo: () => Promise<void>;

  // Convert state
  convertInputPath: string;
  convertOutputPath: string;
  convertTarget: "video" | "audio";
  convertVideoFormat: string;
  convertAudioFormat: string;
  convertAudioBitrate: string;
  convertVideoBitrate: string;
  convertResult: ConvertFormatResult | null;
  setConvertInputPath: (path: string) => void;
  setConvertOutputPath: (path: string) => void;
  setConvertTarget: (t: "video" | "audio") => void;
  setConvertVideoFormat: (fmt: string) => void;
  setConvertAudioFormat: (fmt: string) => void;
  setConvertAudioBitrate: (rate: string) => void;
  setConvertVideoBitrate: (rate: string) => void;
  runConvert: () => Promise<void>;

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

export const useVideoToolStore = create<VideoToolState>((set, get) => ({
  // Tab
  activeTab: "merge",
  setActiveTab: (tab) => set({ activeTab: tab }),

  // Shared
  ffmpegAvailable: false,
  encoderStatus: {},
  isProcessing: false,
  progress: 0,
  logs: [],
  errorMessage: null,

  checkFfmpeg: async () => {
    try {
      const available = await invoke<boolean>("check_ffmpeg");
      set({ ffmpegAvailable: available });
    } catch {
      set({ ffmpegAvailable: false });
    }
  },

  checkEncoders: async () => {
    try {
      const result = await invoke<[string, boolean][]>("check_video_encoders");
      const status: Record<string, boolean> = {};
      for (const [name, available] of result) {
        status[name] = available;
      }
      set({ encoderStatus: status });
    } catch {
      set({ encoderStatus: {} });
    }
  },

  clearError: () => set({ errorMessage: null }),
  clearLogs: () => set({ logs: [] }),

  // Merge state
  mergeInputPaths: [],
  mergeOutputPath: "",
  mergeOutputFormat: "mp4",
  mergeReencode: false,
  mergeResult: null,

  setMergeInputs: (paths) => set({ mergeInputPaths: paths }),
  setMergeOutputPath: (path) => set({ mergeOutputPath: path }),
  setMergeOutputFormat: (fmt) => set({ mergeOutputFormat: fmt }),
  setMergeReencode: (v) => set({ mergeReencode: v }),

  runMerge: async () => {
    const state = get();
    if (state.mergeInputPaths.length < 2) {
      set({ errorMessage: "至少需要选择两个视频文件" });
      return;
    }
    if (!state.mergeOutputPath) {
      set({ errorMessage: "请设置输出路径" });
      return;
    }

    set({ isProcessing: true, progress: 0, logs: [], errorMessage: null, mergeResult: null });
    await get().registerEventListeners();

    try {
      const params: MergeVideosParams = {
        inputPaths: state.mergeInputPaths,
        outputPath: state.mergeOutputPath,
        outputFormat: state.mergeOutputFormat,
        reencode: state.mergeReencode,
      };
      const result = await invoke<MergeVideosResult>("merge_videos", { params });
      set({ mergeResult: result });
    } catch (e) {
      set({ errorMessage: `合并失败: ${e}` });
    } finally {
      set({ isProcessing: false });
      get().unregisterEventListeners();
    }
  },

  // Images state
  imagesInputPaths: [],
  imagesOutputPath: "",
  imagesFps: 24,
  imagesOutputFormat: "mp4",
  imagesResolution: null,
  imagesAudioPath: null,
  imagesResult: null,

  setImagesInputPaths: (paths) => set({ imagesInputPaths: paths }),
  setImagesOutputPath: (path) => set({ imagesOutputPath: path }),
  setImagesFps: (fps) => set({ imagesFps: fps }),
  setImagesOutputFormat: (fmt) => set({ imagesOutputFormat: fmt }),
  setImagesResolution: (res) => set({ imagesResolution: res }),
  setImagesAudioPath: (path) => set({ imagesAudioPath: path }),

  runImagesToVideo: async () => {
    const state = get();
    if (state.imagesInputPaths.length === 0) {
      set({ errorMessage: "至少需要选择一张图片" });
      return;
    }
    if (!state.imagesOutputPath) {
      set({ errorMessage: "请设置输出路径" });
      return;
    }

    set({ isProcessing: true, progress: 0, logs: [], errorMessage: null, imagesResult: null });
    await get().registerEventListeners();

    try {
      const params: ImagesToVideoParams = {
        imagePaths: state.imagesInputPaths,
        outputPath: state.imagesOutputPath,
        fps: state.imagesFps,
        outputFormat: state.imagesOutputFormat,
        resolution: state.imagesResolution,
        audioPath: state.imagesAudioPath,
        loopCount: null,
      };
      const result = await invoke<ImagesToVideoResult>("images_to_video", { params });
      set({ imagesResult: result });
    } catch (e) {
      set({ errorMessage: `生成失败: ${e}` });
    } finally {
      set({ isProcessing: false });
      get().unregisterEventListeners();
    }
  },

  // Convert state
  convertInputPath: "",
  convertOutputPath: "",
  convertTarget: "video",
  convertVideoFormat: "mp4",
  convertAudioFormat: "mp3",
  convertAudioBitrate: "192k",
  convertVideoBitrate: "",
  convertResult: null,

  setConvertInputPath: (path) => set({ convertInputPath: path }),
  setConvertOutputPath: (path) => set({ convertOutputPath: path }),
  setConvertTarget: (t) => set({ convertTarget: t }),
  setConvertVideoFormat: (fmt) => set({ convertVideoFormat: fmt }),
  setConvertAudioFormat: (fmt) => set({ convertAudioFormat: fmt }),
  setConvertAudioBitrate: (rate) => set({ convertAudioBitrate: rate }),
  setConvertVideoBitrate: (rate) => set({ convertVideoBitrate: rate }),

  runConvert: async () => {
    const state = get();
    if (!state.convertInputPath) {
      set({ errorMessage: "请选择输入文件" });
      return;
    }
    if (!state.convertOutputPath) {
      set({ errorMessage: "请设置输出路径" });
      return;
    }

    set({ isProcessing: true, progress: 0, logs: [], errorMessage: null, convertResult: null });
    await get().registerEventListeners();

    try {
      const target =
        state.convertTarget === "video"
          ? { videoFormat: state.convertVideoFormat }
          : { audioFormat: state.convertAudioFormat };

      const params: ConvertFormatParams = {
        inputPath: state.convertInputPath,
        outputPath: state.convertOutputPath,
        target,
        audioBitrate: state.convertTarget === "audio" ? state.convertAudioBitrate : null,
        videoBitrate:
          state.convertTarget === "video" && state.convertVideoBitrate
            ? state.convertVideoBitrate
            : null,
        resolution: null,
      };
      const result = await invoke<ConvertFormatResult>("convert_format", { params });
      set({ convertResult: result });
    } catch (e) {
      set({ errorMessage: `转换失败: ${e}` });
    } finally {
      set({ isProcessing: false });
      get().unregisterEventListeners();
    }
  },

  // Extract (抽帧) state
  extractVideoPath: "",
  extractVideoInfo: null,
  extractParams: {
    videoPath: "",
    mode: "byInterval" as ExtractMode,
    intervalSecs: 1.0,
    frameCount: 10,
    timePoints: [],
    outputFormat: "png" as OutputFormat,
    jpegQuality: 90,
    resizeWidth: undefined,
  },
  extractFrames: [],
  isExtracting: false,
  extractProgress: 0,
  extractOutputDir: "",
  extractSelectedFrame: null,
  extractLogs: [],
  extractEstimatedTimeRemaining: null,
  _extractWatcherUnlisten: null,

  setExtractVideoPath: (path) => set({ extractVideoPath: path }),
  setExtractOutputDir: (dir) => set({ extractOutputDir: dir }),

  loadVideo: async (path?: string) => {
    get().stopExtractWatcher();
    try {
      let videoPath = path;
      if (!videoPath) {
        const { open } = await import("@tauri-apps/plugin-dialog");
        const selected = await open({
          filters: [
            { name: "视频文件", extensions: ["mp4", "avi", "mkv", "mov", "wmv", "flv", "webm"] },
          ],
        });
        if (!selected) return;
        videoPath = selected as string;
      }

      const info = await invoke<VideoInfo>("probe_video", { path: videoPath });
      const separator = videoPath.includes("\\") ? "\\" : "/";
      const dir = videoPath.substring(0, videoPath.lastIndexOf(separator));
      const defaultOutputDir = dir + separator + "frames";
      set({
        extractVideoPath: videoPath,
        extractVideoInfo: info,
        extractParams: { ...get().extractParams, videoPath },
        extractOutputDir: defaultOutputDir,
        extractFrames: [],
        extractSelectedFrame: null,
        errorMessage: null,
      });
    } catch (e) {
      set({ errorMessage: `加载视频失败: ${e}` });
    }
  },

  setExtractParams: (updates) => {
    set((s) => ({
      extractParams: { ...s.extractParams, ...updates },
    }));
  },

  runExtractFrames: async () => {
    const { extractParams, isExtracting, extractOutputDir } = get();
    if (!extractParams.videoPath || isExtracting || !extractOutputDir) return;

    get().stopExtractWatcher();
    set({ isExtracting: true, extractProgress: 0, errorMessage: null, extractFrames: [], extractLogs: [], extractEstimatedTimeRemaining: null });

    const unlistenProgress = await listen<ProgressInfo>(
      "video-frame://progress",
      (event) => {
        const info = event.payload;
        set({ extractProgress: info.progress * 100 });
        if (info.progress > 0 && info.elapsedMs > 0) {
          const totalEstimatedMs = info.elapsedMs / info.progress;
          const remainingMs = totalEstimatedMs - info.elapsedMs;
          set({ extractEstimatedTimeRemaining: Math.ceil(remainingMs / 1000) });
        }
      }
    );

    const unlistenLog = await listen<LogEntry>(
      "video-frame://log",
      (event) => {
        set((s) => ({ extractLogs: [...s.extractLogs, event.payload] }));
      }
    );

    const unlistenFrame = await listen<ExtractedFrame>(
      "video-frame://frame",
      (event) => {
        set((state) => ({ extractFrames: [...state.extractFrames, event.payload] }));
      }
    );

    try {
      const frames = await invoke<ExtractedFrame[]>("extract_frames", {
        params: extractParams,
        outputDir: extractOutputDir,
      });
      set({ extractFrames: frames, isExtracting: false, extractProgress: 100, extractEstimatedTimeRemaining: 0 });
      get().startExtractWatcher();
    } catch (e) {
      set({ errorMessage: `提取帧失败: ${e}`, isExtracting: false });
    } finally {
      unlistenProgress();
      unlistenLog();
      unlistenFrame();
    }
  },

  setExtractSelectedFrame: (index) => set({ extractSelectedFrame: index }),

  startExtractWatcher: async () => {
    const { extractOutputDir, stopExtractWatcher } = get();
    if (!extractOutputDir) return;

    stopExtractWatcher();

    try {
      await invoke("start_frame_watcher", { outputDir: extractOutputDir });
      const unlisten = await listen("video-frame://frames-deleted", () => {
        set({ extractFrames: [], extractSelectedFrame: null });
      });
      set({ _extractWatcherUnlisten: unlisten });
    } catch (e) {
      console.error("Failed to start frame watcher:", e);
    }
  },

  stopExtractWatcher: () => {
    const { _extractWatcherUnlisten } = get();
    if (_extractWatcherUnlisten) {
      _extractWatcherUnlisten();
      set({ _extractWatcherUnlisten: null });
    }
    invoke("stop_frame_watcher").catch(() => {});
  },

  // Event listeners
  _unlisteners: [],

  registerEventListeners: async () => {
    get().unregisterEventListeners();
    const unlisteners: (() => void)[] = [];

    const unlistenProgress = await listen<VideoToolProgress>(
      "video-tool://progress",
      (event) => {
        set({ progress: event.payload.progress });
      }
    );
    unlisteners.push(unlistenProgress);

    const unlistenLog = await listen<VideoToolLog>(
      "video-tool://log",
      (event) => {
        set((s) => ({ logs: [...s.logs, event.payload] }));
      }
    );
    unlisteners.push(unlistenLog);

    set({ _unlisteners: unlisteners });
  },

  unregisterEventListeners: () => {
    const { _unlisteners } = get();
    for (const unlisten of _unlisteners) {
      unlisten();
    }
    set({ _unlisteners: [] });
  },
}));
