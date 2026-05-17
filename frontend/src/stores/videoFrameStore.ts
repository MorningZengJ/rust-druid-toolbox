import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type {
  VideoInfo,
  ExtractParams,
  ExtractMode,
  OutputFormat,
  ExtractedFrame,
  ProgressInfo,
  LogEntry,
} from "@/types";

interface VideoFrameState {
  // Data
  videoPath: string;
  videoInfo: VideoInfo | null;
  ffmpegAvailable: boolean;
  extractParams: ExtractParams;
  frames: ExtractedFrame[];
  isExtracting: boolean;
  progress: number;
  errorMessage: string | null;
  outputDir: string;

  // UI state
  selectedFrame: number | null;

  // Progress state
  logs: LogEntry[];
  estimatedTimeRemaining: number | null;

  // Watcher state
  _watcherUnlisten: (() => void) | null;

  // Actions
  setVideoPath: (path: string) => void;
  setOutputDir: (dir: string) => void;
  checkFfmpeg: () => Promise<void>;
  loadVideo: (path?: string) => Promise<void>;
  setExtractParams: (updates: Partial<ExtractParams>) => void;
  extractFrames: () => Promise<void>;
  setSelectedFrame: (index: number | null) => void;
  clearError: () => void;
  startWatcher: () => Promise<void>;
  stopWatcher: () => void;
  addLog: (entry: LogEntry) => void;
  clearLogs: () => void;
}

const defaultParams: ExtractParams = {
  videoPath: "",
  mode: "byInterval" as ExtractMode,
  intervalSecs: 1.0,
  frameCount: 10,
  timePoints: [],
  outputFormat: "png" as OutputFormat,
  jpegQuality: 90,
  resizeWidth: undefined,
};

export const useVideoFrameStore = create<VideoFrameState>((set, get) => ({
  videoPath: "",
  videoInfo: null,
  ffmpegAvailable: false,
  extractParams: { ...defaultParams },
  frames: [],
  isExtracting: false,
  progress: 0,
  errorMessage: null,
  outputDir: "",
  selectedFrame: null,
  logs: [],
  estimatedTimeRemaining: null,
  _watcherUnlisten: null,

  setVideoPath: (path) => set({ videoPath: path }),
  setOutputDir: (dir) => set({ outputDir: dir }),

  checkFfmpeg: async () => {
    try {
      const available = await invoke<boolean>("check_ffmpeg");
      set({ ffmpegAvailable: available });
    } catch {
      set({ ffmpegAvailable: false });
    }
  },

  loadVideo: async (path?: string) => {
    get().stopWatcher();
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
      // Auto-set output dir to video_dir/frames
      const separator = videoPath.includes("\\") ? "\\" : "/";
      const dir = videoPath.substring(0, videoPath.lastIndexOf(separator));
      const defaultOutputDir = dir + separator + "frames";
      set({
        videoPath,
        videoInfo: info,
        extractParams: { ...get().extractParams, videoPath },
        outputDir: defaultOutputDir,
        frames: [],
        selectedFrame: null,
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

  extractFrames: async () => {
    const { extractParams, isExtracting, outputDir } = get();
    if (!extractParams.videoPath || isExtracting || !outputDir) return;

    get().stopWatcher();
    set({ isExtracting: true, progress: 0, errorMessage: null, frames: [], logs: [], estimatedTimeRemaining: null });

    // Listen for progress events
    const unlistenProgress = await listen<ProgressInfo>(
      "video-frame://progress",
      (event) => {
        const info = event.payload;
        set({ progress: info.progress * 100 });

        // Calculate ETA
        if (info.progress > 0 && info.elapsedMs > 0) {
          const totalEstimatedMs = info.elapsedMs / info.progress;
          const remainingMs = totalEstimatedMs - info.elapsedMs;
          set({ estimatedTimeRemaining: Math.ceil(remainingMs / 1000) });
        }
      }
    );

    // Listen for log events
    const unlistenLog = await listen<LogEntry>(
      "video-frame://log",
      (event) => {
        get().addLog(event.payload);
      }
    );

    try {
      const frames = await invoke<ExtractedFrame[]>("extract_frames", {
        params: extractParams,
        outputDir,
      });
      set({ frames, isExtracting: false, progress: 100, estimatedTimeRemaining: 0 });
      get().startWatcher();
    } catch (e) {
      set({ errorMessage: `提取帧失败: ${e}`, isExtracting: false });
    } finally {
      unlistenProgress();
      unlistenLog();
    }
  },

  setSelectedFrame: (index) => set({ selectedFrame: index }),
  clearError: () => set({ errorMessage: null }),

  addLog: (entry) => {
    set((state) => ({ logs: [...state.logs, entry] }));
  },

  clearLogs: () => set({ logs: [] }),

  startWatcher: async () => {
    const { outputDir, stopWatcher } = get();
    if (!outputDir) return;

    stopWatcher();

    try {
      await invoke("start_frame_watcher", { outputDir });
      const unlisten = await listen("video-frame://frames-deleted", () => {
        set({ frames: [], selectedFrame: null });
      });
      set({ _watcherUnlisten: unlisten });
    } catch (e) {
      console.error("Failed to start frame watcher:", e);
    }
  },

  stopWatcher: () => {
    const { _watcherUnlisten } = get();
    if (_watcherUnlisten) {
      _watcherUnlisten();
      set({ _watcherUnlisten: null });
    }
    invoke("stop_frame_watcher").catch(() => {});
  },
}));
