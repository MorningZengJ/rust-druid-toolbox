import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import type { AsciiArtParams, AsciiArtOutput, CharsetPreset, ColorMode, Background, RenderMode } from "@/types";

interface AsciiArtState {
  // Data
  params: AsciiArtParams;
  imageBytes: Uint8Array | null;
  imagePreviewUrl: string | null;
  output: AsciiArtOutput | null;
  isConverting: boolean;
  errorMessage: string | null;

  // UI state
  zoom: number;
  panX: number;
  panY: number;
  activeTab: "original" | "ascii";

  // Actions
  setParams: (updates: Partial<AsciiArtParams>) => void;
  loadImageFromFile: () => Promise<void>;
  loadImageFromDrop: (file: File) => Promise<void>;
  loadImageFromPaste: (imageData: ArrayBuffer) => Promise<void>;
  convert: () => Promise<void>;
  copyToClipboard: () => Promise<void>;
  exportOutput: (format: "png" | "svg" | "txt" | "html") => Promise<void>;
  setZoom: (zoom: number) => void;
  setPan: (x: number, y: number) => void;
  resetView: () => void;
  setActiveTab: (tab: "original" | "ascii") => void;
  clearError: () => void;
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
  imageBytes: null,
  imagePreviewUrl: null,
  output: null,
  isConverting: false,
  errorMessage: null,
  zoom: 1,
  panX: 0,
  panY: 0,
  activeTab: "original",

  setParams: (updates) => {
    set((s) => ({ params: { ...s.params, ...updates } }));
    // Debounce auto-convert
    const { imageBytes } = get();
    if (imageBytes) {
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

      const bytes = await invoke<number[]>("load_image_from_file", { path: selected as string });
      const uint8 = new Uint8Array(bytes);
      const blob = new Blob([uint8 as unknown as BlobPart]);
      const url = URL.createObjectURL(blob);

      const oldUrl = get().imagePreviewUrl;
      if (oldUrl) URL.revokeObjectURL(oldUrl);

      set({ imageBytes: uint8, imagePreviewUrl: url, output: null, activeTab: "original" });
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

      set({ imageBytes: uint8, imagePreviewUrl: url, output: null, activeTab: "original" });
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

      set({ imageBytes: uint8, imagePreviewUrl: url, output: null, activeTab: "original" });
      get().convert();
    } catch (e) {
      set({ errorMessage: `加载图片失败: ${e}` });
    }
  },

  convert: async () => {
    const { imageBytes, params, isConverting } = get();
    if (!imageBytes || isConverting) return;

    set({ isConverting: true, errorMessage: null });
    try {
      const output = await invoke<AsciiArtOutput>("convert_ascii_art", {
        params,
        imageBytes: Array.from(imageBytes),
      });
      set({ output, isConverting: false, activeTab: "ascii" });
    } catch (e) {
      set({ errorMessage: `转换失败: ${e}`, isConverting: false });
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
    const { imageBytes, params } = get();
    if (!imageBytes) return;

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
        imageBytes: Array.from(imageBytes),
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
}));
