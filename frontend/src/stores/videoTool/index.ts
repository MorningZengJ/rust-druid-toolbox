import { create } from "zustand";
import * as videoToolApi from "@/lib/videoToolApi";
import { subscribeVideoToolEvents } from "@/features/videoTool/videoEvents";
import { LogBuffer } from "@/features/videoTool/videoLogBuffer";
import type { VideoToolLog } from "@/types";
import type { VideoToolState } from "./types";
import { createMergeSlice } from "./mergeSlice";
import { createImagesSlice } from "./imagesSlice";
import { createConvertSlice } from "./convertSlice";
import { createExtractSlice } from "./extractSlice";

// ── Shared log buffer (avoids per-event array spread) ──

const logBuffer = new LogBuffer<VideoToolLog>(500, 100);

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
      const available = await videoToolApi.checkFfmpeg();
      set({ ffmpegAvailable: available });
    } catch {
      set({ ffmpegAvailable: false });
    }
  },

  checkEncoders: async () => {
    try {
      const result = await videoToolApi.checkVideoEncoders();
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
  clearLogs: () => {
    logBuffer.clear();
    set({ logs: [] });
  },

  // Event listeners
  _unlisteners: [],

  registerEventListeners: async () => {
    get().unregisterEventListeners();

    const unlisten = await subscribeVideoToolEvents({
      onProgress: (p) => {
        const updates: Record<string, unknown> = { progress: p.progress };

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
      },

      onLog: (log) => {
        logBuffer.push(log, (entries) => {
          set((s) => {
            const updates: Partial<VideoToolState> = { logs: entries };
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
        });
      },

      onBatchProgress: (bp) => {
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
      },
    });

    set({ _unlisteners: [unlisten] });
  },

  unregisterEventListeners: () => {
    const { _unlisteners } = get();
    for (const unlisten of _unlisteners) {
      unlisten();
    }
    logBuffer.clear();
    set({ _unlisteners: [] });
  },

  // Spread slices
  ...createMergeSlice(set, get, {} as never),
  ...createImagesSlice(set, get, {} as never),
  ...createConvertSlice(set, get, {} as never),
  ...createExtractSlice(set, get, {} as never),
}));
