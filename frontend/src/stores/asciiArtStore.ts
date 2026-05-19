import { create } from "zustand";
import { invoke, convertFileSrc } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { AsciiArtParams, AsciiArtOutput, AsciiArtProgress, CharsetPreset, ColorMode, Background, RenderMode } from "@/types";

interface AsciiArtState {
  // Data
  params: AsciiArtParams;
  imagePath: string | null;
  imageBytes: Uint8Array | null;
  imagePreviewUrl: string | null;
  output: AsciiArtOutput | null;
  isConverting: boolean;
  errorMessage: string | null;

  // Progress state
  progress: number;
  progressStage: string;
  estimatedTimeRemaining: number | null;

  // UI state
  zoom: number;
  panX: number;
  panY: number;
  activeTab: "original" | "ascii";

  // Actions
  setParams: (updates: Partial<AsciiArtParams>) => void;
  loadImageFromFile: () => Promise<void>;
  loadImageFromDrop: (file: File) => Promise<void>;
  loadImageFromPath: (path: string) => Promise<void>;
  loadImageFromPaste: (imageData: ArrayBuffer) => Promise<void>;
  convert: () => Promise<void>;
  copyToClipboard: () => Promise<void>;
  exportOutput: (format: "png" | "svg" | "txt" | "html") => Promise<void>;
  setZoom: (zoom: number) => void;
  setPan: (x: number, y: number) => void;
  resetView: () => void;
  setActiveTab: (tab: "original" | "ascii") => void;
  clearError: () => void;
  setErrorMessage: (msg: string) => void;
  cleanup: () => Promise<void>;
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

const defaultParams: AsciiArtParams = {
  width: 800,
  charset: "standard" as CharsetPreset,
  customCharset: "",
  contrast: 1.0,
  brightness: 0.0,
  saturation: 1.0,
  invert: false,
  colorMode: "html" as ColorMode,
  background: "black" as Background,
  charAspectRatio: 0.5,
  renderMode: "png" as RenderMode,
};

export const useAsciiArtStore = create<AsciiArtState>((set, get) => ({
  params: { ...defaultParams },
  imagePath: null,
  imageBytes: null,
  imagePreviewUrl: null,
  output: null,
  isConverting: false,
  errorMessage: null,
  progress: 0,
  progressStage: "",
  estimatedTimeRemaining: null,
  zoom: 1,
  panX: 0,
  panY: 0,
  activeTab: "original",

  setParams: (updates) => {
    set((s) => ({ params: { ...s.params, ...updates } }));
    const { imagePath, imageBytes } = get();
    if (imagePath || imageBytes) {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        get().convert();
      }, 500);
    }
  },

  loadImageFromFile: async () => {
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const selected = await open({
        filters: [
          { name: "图片文件", extensions: ["png", "jpg", "jpeg", "gif", "bmp", "webp"] },
        ],
      });
      if (!selected) return;

      const path = selected as string;
      const url = convertFileSrc(path);

      const oldUrl = get().imagePreviewUrl;
      if (oldUrl) URL.revokeObjectURL(oldUrl);

      set({ imagePath: path, imageBytes: null, imagePreviewUrl: url, output: null, activeTab: "original" });
      get().convert();
    } catch (e) {
      set({ errorMessage: `加载图片失败: ${e}` });
    }
  },

  loadImageFromDrop: async (file: File) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const uint8 = new Uint8Array(arrayBuffer);
      const blob = new Blob([uint8 as unknown as BlobPart]);
      const url = URL.createObjectURL(blob);

      const oldUrl = get().imagePreviewUrl;
      if (oldUrl) URL.revokeObjectURL(oldUrl);

      set({ imageBytes: uint8, imagePath: null, imagePreviewUrl: url, output: null, activeTab: "original" });
      get().convert();
    } catch (e) {
      set({ errorMessage: `加载图片失败: ${e}` });
    }
  },

  loadImageFromPath: async (path: string) => {
    try {
      const url = convertFileSrc(path);

      const oldUrl = get().imagePreviewUrl;
      if (oldUrl) URL.revokeObjectURL(oldUrl);

      set({ imagePath: path, imageBytes: null, imagePreviewUrl: url, output: null, activeTab: "original" });
      get().convert();
    } catch (e) {
      set({ errorMessage: `加载图片失败: ${e}` });
    }
  },

  loadImageFromPaste: async (imageData: ArrayBuffer) => {
    try {
      const uint8 = new Uint8Array(imageData);
      const blob = new Blob([uint8 as unknown as BlobPart]);
      const url = URL.createObjectURL(blob);

      const oldUrl = get().imagePreviewUrl;
      if (oldUrl) URL.revokeObjectURL(oldUrl);

      set({ imageBytes: uint8, imagePath: null, imagePreviewUrl: url, output: null, activeTab: "original" });
      get().convert();
    } catch (e) {
      set({ errorMessage: `加载图片失败: ${e}` });
    }
  },

  convert: async () => {
    const { imagePath, imageBytes, params, isConverting } = get();
    if ((!imagePath && !imageBytes) || isConverting) return;

    set({ isConverting: true, errorMessage: null, progress: 0, progressStage: "" });

    const unlistenProgress = await listen<AsciiArtProgress>(
      "ascii-art://progress",
      (event) => {
        const info = event.payload;
        set({
          progress: info.progress * 100,
          progressStage: info.stage,
        });
        if (info.progress > 0 && info.elapsedMs > 0) {
          const totalEstimatedMs = info.elapsedMs / info.progress;
          const remainingMs = totalEstimatedMs - info.elapsedMs;
          set({ estimatedTimeRemaining: Math.ceil(remainingMs / 1000) });
        }
      }
    );

    try {
      let output: AsciiArtOutput;
      if (imagePath) {
        output = await invoke<AsciiArtOutput>("convert_ascii_art_from_path", {
          params,
          imagePath,
        });
      } else {
        const [tempPath, result] = await invoke<[string, AsciiArtOutput]>(
          "save_temp_image_and_convert",
          { params, imageBytes: Array.from(imageBytes!) }
        );
        output = result;
        set({ imagePath: tempPath });
      }
      set({ output, isConverting: false, progress: 100, estimatedTimeRemaining: 0, activeTab: "ascii" });
    } catch (e) {
      set({ errorMessage: `转换失败: ${e}`, isConverting: false });
    } finally {
      unlistenProgress();
    }
  },

  copyToClipboard: async () => {
    const { output } = get();
    if (!output) return;

    try {
      const { writeText } = await import("@tauri-apps/plugin-clipboard-manager");
      await writeText(output.plainText);
    } catch (e) {
      set({ errorMessage: `复制失败: ${e}` });
    }
  },

  exportOutput: async (format) => {
    const { imagePath, params } = get();
    if (!imagePath) return;

    try {
      const { save } = await import("@tauri-apps/plugin-dialog");
      const ext = format === "png" ? "png" : format === "svg" ? "svg" : format === "html" ? "html" : "txt";
      const filePath = await save({
        filters: [{ name: "文件", extensions: [ext] }],
        defaultPath: `ascii_art.${ext}`,
      });
      if (!filePath) return;

      await invoke("export_ascii_art", {
        params,
        imagePath,
        format,
        path: filePath,
      });
    } catch (e) {
      set({ errorMessage: `导出失败: ${e}` });
    }
  },

  setZoom: (zoom) => set({ zoom: Math.max(0.1, Math.min(10, zoom)) }),
  setPan: (x, y) => set({ panX: x, panY: y }),
  resetView: () => set({ zoom: 1, panX: 0, panY: 0 }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  clearError: () => set({ errorMessage: null }),
  setErrorMessage: (msg) => set({ errorMessage: msg }),

  cleanup: async () => {
    const { output } = get();
    if (output?.outputPath) {
      try {
        await invoke("cleanup_ascii_art_file", { path: output.outputPath });
      } catch {
        // ignore cleanup errors
      }
    }
  },
}));
