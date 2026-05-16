import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type {
  VideoInfo,
  ExtractParams,
  ExtractMode,
  OutputFormat,
  ExtractedFrame,
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

  // Actions
  setVideoPath: (path: string) => void;
  setOutputDir: (dir: string) => void;
  checkFfmpeg: () => Promise<void>;
  loadVideo: (path?: string) => Promise<void>;
  setExtractParams: (updates: Partial<ExtractParams>) => void;
  extractFrames: () => Promise<void>;
  exportFrames: () => Promise<void>;
  setSelectedFrame: (index: number | null) => void;
  clearError: () => void;
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
    const { extractParams, isExtracting } = get();
    if (!extractParams.videoPath || isExtracting) return;

    set({ isExtracting: true, progress: 0, errorMessage: null, frames: [] });

    // Listen for progress events
    const unlisten = await listen<{ current: number; total: number }>(
      "video-frame://progress",
      (event) => {
        const { current, total } = event.payload;
        set({ progress: total > 0 ? (current / total) * 100 : 0 });
      }
    );

    try {
      const frames = await invoke<ExtractedFrame[]>("extract_frames", {
        params: extractParams,
        outputDir: get().outputDir || undefined,
      });
      set({ frames, isExtracting: false, progress: 100 });
    } catch (e) {
      set({ errorMessage: `提取帧失败: ${e}`, isExtracting: false });
    } finally {
      unlisten();
    }
  },

  exportFrames: async () => {
    const { frames } = get();
    if (frames.length === 0) return;

    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const selected = await open({ directory: true });
      if (!selected) return;

      await invoke<string>("export_frames", {
        frames,
        outputDir: selected as string,
      });
      set({ errorMessage: null });
      // Could show success message
    } catch (e) {
      set({ errorMessage: `导出失败: ${e}` });
    }
  },

  setSelectedFrame: (index) => set({ selectedFrame: index }),
  clearError: () => set({ errorMessage: null }),
}));
