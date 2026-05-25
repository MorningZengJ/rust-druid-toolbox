import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type {
  VideoInfo,
  ExtractParams,
  ExtractedFrame,
  ProgressInfo,
  LogEntry,
  ExtractMode,
  OutputFormat,
} from "@/types";
import type { VideoToolState } from "./types";
import type { StateCreator } from "zustand";

export type { ExtractMode, OutputFormat };

export interface ExtractSlice {
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
}

export const createExtractSlice: StateCreator<VideoToolState, [], [], ExtractSlice> = (set, get) => ({
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
});
