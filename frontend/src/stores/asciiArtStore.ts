import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import type { AsciiArtParams, AsciiArtOutput, CharsetPreset, ColorMode, Background } from "@/types";

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

  // Actions
  setParams: (updates: Partial<AsciiArtParams>) => void;
  loadImage: () => Promise<void>;
  loadImageFromBytes: (bytes: Uint8Array) => void;
  pasteFromClipboard: () => Promise<void>;
  convert: () => Promise<void>;
  copyToClipboard: (format: "plain" | "html" | "ansi") => Promise<void>;
  exportOutput: (format: "plain" | "html" | "ansi") => Promise<void>;
  setZoom: (zoom: number) => void;
  setPan: (x: number, y: number) => void;
  resetView: () => void;
  clearError: () => void;
}

const defaultParams: AsciiArtParams = {
  width: 100,
  charset: "standard" as CharsetPreset,
  customCharset: "",
  contrast: 1.0,
  brightness: 0.0,
  saturation: 1.0,
  invert: false,
  colorMode: "html" as ColorMode,
  background: "black" as Background,
  charAspectRatio: 0.5,
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

  setParams: (updates) => {
    set((s) => ({ params: { ...s.params, ...updates } }));
    // Auto-convert if image is loaded
    const { imageBytes } = get();
    if (imageBytes) {
      get().convert();
    }
  },

  loadImage: async () => {
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

      // Revoke old URL
      const oldUrl = get().imagePreviewUrl;
      if (oldUrl) URL.revokeObjectURL(oldUrl);

      set({ imageBytes: uint8, imagePreviewUrl: url, output: null });
      get().convert();
    } catch (e) {
      set({ errorMessage: `加载图片失败: ${e}` });
    }
  },

  loadImageFromBytes: (bytes) => {
    const blob = new Blob([bytes as unknown as BlobPart]);
    const url = URL.createObjectURL(blob);

    const oldUrl = get().imagePreviewUrl;
    if (oldUrl) URL.revokeObjectURL(oldUrl);

    set({ imageBytes: bytes, imagePreviewUrl: url, output: null });
    get().convert();
  },

  pasteFromClipboard: async () => {
    set({ errorMessage: "剪贴板图片粘贴功能暂不支持，请使用打开文件" });
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
      set({ output, isConverting: false });
    } catch (e) {
      set({ errorMessage: `转换失败: ${e}`, isConverting: false });
    }
  },

  copyToClipboard: async (format) => {
    const { output } = get();
    if (!output) return;

    try {
      const { writeText } = await import("@tauri-apps/plugin-clipboard-manager");
      let text: string;
      if (format === "plain") text = output.plainText;
      else if (format === "html") text = output.htmlText;
      else text = output.ansiText;

      await writeText(text);
    } catch (e) {
      set({ errorMessage: `复制失败: ${e}` });
    }
  },

  exportOutput: async (format) => {
    const { output } = get();
    if (!output) return;

    try {
      const { save } = await import("@tauri-apps/plugin-dialog");
      const ext = format === "html" ? "html" : "txt";
      const filePath = await save({
        filters: [{ name: "文件", extensions: [ext] }],
        defaultPath: `ascii_art.${ext}`,
      });
      if (!filePath) return;

      // Use Tauri fs write via invoke
      let text: string;
      if (format === "plain") text = output.plainText;
      else if (format === "html") text = output.htmlText;
      else text = output.ansiText;

      // Write via a Tauri command or use the FS plugin
      // For now we'll copy to clipboard as fallback
      const { writeText } = await import("@tauri-apps/plugin-clipboard-manager");
      await writeText(text);
      set({ errorMessage: null });
    } catch (e) {
      set({ errorMessage: `导出失败: ${e}` });
    }
  },

  setZoom: (zoom) => set({ zoom: Math.max(0.1, Math.min(5, zoom)) }),
  setPan: (x, y) => set({ panX: x, panY: y }),
  resetView: () => set({ zoom: 1, panX: 0, panY: 0 }),
  clearError: () => set({ errorMessage: null }),
}));
