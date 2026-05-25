import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type {
  VideoToolProgress,
  VideoToolLog,
  BatchProgress,
} from "@/types";
import type { VideoToolState } from "./types";
import { createMergeSlice } from "./mergeSlice";
import { createImagesSlice } from "./imagesSlice";
import { createConvertSlice } from "./convertSlice";
import { createExtractSlice } from "./extractSlice";

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

  // Event listeners
  _unlisteners: [],

  registerEventListeners: async () => {
    get().unregisterEventListeners();
    const unlisteners: (() => void)[] = [];

    const unlistenProgress = await listen<VideoToolProgress>(
      "video-tool://progress",
      (event) => {
        const p = event.payload;
        const updates: Record<string, unknown> = {
          progress: p.progress,
        };

        if (p.taskId.startsWith("batch-")) {
          updates.convertCurrentFileProgress = p.progress;
        }

        if (p.currentFileIndex !== undefined && p.totalFiles !== undefined) {
          updates.mergeProgressDetail = {
            currentFileIndex: p.currentFileIndex,
            totalFiles: p.totalFiles,
            currentFileName: p.currentFileName ?? "",
            speed: p.speed ?? 0,
            etaMs: p.etaMs ?? 0,
            framesProcessed: p.framesProcessed ?? 0,
            totalFrames: p.totalFrames ?? 0,
          };
        }

        set(updates);
      }
    );
    unlisteners.push(unlistenProgress);

    const MAX_LOGS = 500;
    const unlistenLog = await listen<VideoToolLog>(
      "video-tool://log",
      (event) => {
        const log = event.payload;
        set((s) => {
          const newLogs = s.logs.length >= MAX_LOGS
            ? [...s.logs.slice(s.logs.length - MAX_LOGS + 1), log]
            : [...s.logs, log];
          const updates: Partial<VideoToolState> = { logs: newLogs };
          if (log.taskId.startsWith("batch-") && log.level === "error") {
            const index = parseInt(log.taskId.replace("batch-", ""), 10);
            if (!isNaN(index) && index < s.convertFiles.length) {
              const newFiles = [...s.convertFiles];
              newFiles[index] = { ...newFiles[index], status: "error", error: log.message };
              updates.convertFiles = newFiles;
            }
          }
          return updates;
        });
      }
    );
    unlisteners.push(unlistenLog);

    const unlistenBatchProgress = await listen<BatchProgress>(
      "video-tool://batch-progress",
      (event) => {
        const bp = event.payload;
        set((s) => {
          const newFiles = [...s.convertFiles];
          for (let i = 0; i < bp.currentIndex && i < newFiles.length; i++) {
            if (newFiles[i].status === "pending") {
              newFiles[i] = { ...newFiles[i], status: "done" };
            }
          }
          if (bp.currentIndex < newFiles.length && newFiles[bp.currentIndex].status !== "error") {
            newFiles[bp.currentIndex] = { ...newFiles[bp.currentIndex], status: "converting" };
          }
          return {
            convertBatchProgress: bp,
            convertFiles: newFiles,
          };
        });
      }
    );
    unlisteners.push(unlistenBatchProgress);

    set({ _unlisteners: unlisteners });
  },

  unregisterEventListeners: () => {
    const { _unlisteners } = get();
    for (const unlisten of _unlisteners) {
      unlisten();
    }
    set({ _unlisteners: [] });
  },

  // Spread slices
  ...createMergeSlice(set, get, {} as never),
  ...createImagesSlice(set, get, {} as never),
  ...createConvertSlice(set, get, {} as never),
  ...createExtractSlice(set, get, {} as never),
}));
