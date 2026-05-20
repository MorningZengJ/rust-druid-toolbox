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
