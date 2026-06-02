import { invoke } from "@tauri-apps/api/core";
import type { MergeVideosParams, MergeVideosResult } from "@/types";
import type { VideoToolState } from "./types";
import type { StateCreator } from "zustand";

export interface MergeSlice {
  mergeInputPaths: string[];
  mergeOutputPath: string;
  mergeOutputFormat: string;
  mergeReencode: boolean;
  mergeVideoCodec: string;
  mergeVideoBitrate: string;
  mergeQualityPreset: string;
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
  setMergeVideoCodec: (v: string) => void;
  setMergeVideoBitrate: (v: string) => void;
  setMergeQualityPreset: (v: string) => void;
  runMerge: () => Promise<void>;
}

export const createMergeSlice: StateCreator<VideoToolState, [], [], MergeSlice> = (set, get) => ({
  mergeInputPaths: [],
  mergeOutputPath: "",
  mergeOutputFormat: "mp4",
  mergeReencode: false,
  mergeVideoCodec: "libx264",
  mergeVideoBitrate: "",
  mergeQualityPreset: "balanced",
  mergeResult: null,
  mergeProgressDetail: null,

  setMergeInputs: (paths) => set({ mergeInputPaths: paths }),
  setMergeOutputPath: (path) => set({ mergeOutputPath: path }),
  setMergeOutputFormat: (fmt) => set({ mergeOutputFormat: fmt }),
  setMergeReencode: (v) => set({ mergeReencode: v }),
  setMergeVideoCodec: (v) => set({ mergeVideoCodec: v }),
  setMergeVideoBitrate: (v) => set({ mergeVideoBitrate: v }),
  setMergeQualityPreset: (v) => set({ mergeQualityPreset: v }),

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

    set({ isProcessing: true, progress: 0, logs: [], errorMessage: null, mergeResult: null, mergeProgressDetail: null });
    await get().registerEventListeners();

    try {
      const params: MergeVideosParams = {
        inputPaths: state.mergeInputPaths,
        outputPath: state.mergeOutputPath,
        outputFormat: state.mergeOutputFormat,
        reencode: state.mergeReencode,
        videoCodec: state.mergeVideoCodec || undefined,
        videoBitrate: state.mergeVideoBitrate || undefined,
        qualityPreset: state.mergeQualityPreset || undefined,
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
});
