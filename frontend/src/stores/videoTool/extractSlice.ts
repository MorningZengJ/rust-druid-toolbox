import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import i18n from "@/i18n";
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
            { name: i18n.t("common:fileTypes.video"), extensions: ["mp4", "avi", "mkv", "mov", "wmv", "flv", "webm"] },
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
      set({ errorMessage: i18n.t("videoTool:errors.loadVideoFailed", { error: String(e) }) });
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

    const unlisteners: (() => void)[] = [];
    const MAX_LOGS = 500;
    try {
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
      unlisteners.push(unlistenProgress);

      const unlistenLog = await listen<LogEntry>(
        "video-frame://log",
        (event) => {
          set((s) => {
            const newLogs = s.extractLogs.length >= MAX_LOGS
              ? [...s.extractLogs.slice(s.extractLogs.length - MAX_LOGS + 1), event.payload]
              : [...s.extractLogs, event.payload];
            return { extractLogs: newLogs };
          });
        }
      );
      unlisteners.push(unlistenLog);

      const unlistenFrame = await listen<ExtractedFrame>(
        "video-frame://frame",
        (event) => {
          set((state) => ({ extractFrames: [...state.extractFrames, event.payload] }));
        }
      );
      unlisteners.push(unlistenFrame);

      const frames = await invoke<ExtractedFrame[]>("extract_frames", {
        params: extractParams,
        outputDir: extractOutputDir,
      });
      set({ extractFrames: frames, isExtracting: false, extractProgress: 100, extractEstimatedTimeRemaining: 0 });
      get().startExtractWatcher();
    } catch (e) {
      set({ errorMessage: i18n.t("videoTool:errors.extractFailed", { error: String(e) }), isExtracting: false });
    } finally {
      for (const unlisten of unlisteners) {
        unlisten();
      }
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
