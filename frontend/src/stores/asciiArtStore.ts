import { create } from "zustand";
import { convertFileSrc } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import * as asciiArtApi from "@/lib/asciiArtApi";
import { openFile, saveFile } from "@/lib/tauri/dialog";
import i18n from "@/i18n";
import type { AsciiArtParams, AsciiArtOutput, AsciiArtProgress, CharsetPreset, ColorMode, Background, RenderMode } from "@/types";
import { schedule, cancelDebounce, resetScheduler, isVersionValid } from "@/features/asciiArt/asciiArtScheduler";

// ── Types ──

type PreviewUrlKind = "file" | "blob" | null;

interface AsciiArtState {
  params: AsciiArtParams;
  imagePath: string | null;
  imageBytes: Uint8Array | null;
  imagePreviewUrl: string | null;
  previewUrlKind: PreviewUrlKind;
  output: AsciiArtOutput | null;
  isConverting: boolean;
  errorMessage: string | null;
  progress: number;
  progressStage: string;
  estimatedTimeRemaining: number | null;
  zoom: number;
  panX: number;
  panY: number;
  activeTab: "original" | "ascii";

  setParams: (updates: Partial<AsciiArtParams>) => void;
  loadImageFromFile: () => Promise<void>;
  loadImageFromDrop: (file: File) => Promise<void>;
  loadImageFromPath: (path: string) => Promise<void>;
  loadImageFromPaste: (imageData: ArrayBuffer) => Promise<void>;
  convert: () => void;
  copyToClipboard: () => Promise<void>;
  exportOutput: (format: "png" | "svg" | "txt" | "html") => Promise<void>;
  setZoom: (zoom: number) => void;
  setPan: (x: number, y: number) => void;
  resetView: () => void;
  setActiveTab: (tab: "original" | "ascii") => void;
  clearError: () => void;
  setErrorMessage: (msg: string) => void;
  cleanup: () => void;
}

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

// ── Helpers ──

function safeRevoke(url: string | null, kind: PreviewUrlKind): void {
  if (url && kind === "blob") {
    URL.revokeObjectURL(url);
  }
}

function setPreview(
  set: (updates: Partial<AsciiArtState>) => void,
  kind: PreviewUrlKind,
  url: string,
  imagePath: string | null,
  imageBytes: Uint8Array | null,
) {
  const state = useAsciiArtStore.getState();
  safeRevoke(state.imagePreviewUrl, state.previewUrlKind);
  set({ imagePath, imageBytes, imagePreviewUrl: url, previewUrlKind: kind, output: null, activeTab: "original" });
}

// ── Store ──

export const useAsciiArtStore = create<AsciiArtState>((set, get) => ({
  params: { ...defaultParams },
  imagePath: null,
  imageBytes: null,
  imagePreviewUrl: null,
  previewUrlKind: null,
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

  // ── Param change → debounced convert ──

  setParams: (updates) => {
    set((s) => ({ params: { ...s.params, ...updates } }));
    const { imagePath, imageBytes } = get();
    if (imagePath || imageBytes) {
      scheduleConversion(set, get);
    }
  },

  // ── Image loading ──

  loadImageFromFile: async () => {
    try {
      const path = await openFile([
        { name: i18n.t("common:fileTypes.image"), extensions: ["png", "jpg", "jpeg", "gif", "bmp", "webp"] },
      ]);
      if (!path) return;

      setPreview(set, "file", convertFileSrc(path), path, null);
      startFreshConversion(set, get);
    } catch (e) {
      set({ errorMessage: i18n.t("errors:loadImageFailed", { error: String(e) }) });
    }
  },

  loadImageFromDrop: async (file: File) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const uint8 = new Uint8Array(arrayBuffer);
      const url = URL.createObjectURL(new Blob([uint8 as unknown as BlobPart]));

      setPreview(set, "blob", url, null, uint8);
      startFreshConversion(set, get);
    } catch (e) {
      set({ errorMessage: i18n.t("errors:loadImageFailed", { error: String(e) }) });
    }
  },

  loadImageFromPath: async (path: string) => {
    try {
      setPreview(set, "file", convertFileSrc(path), path, null);
      startFreshConversion(set, get);
    } catch (e) {
      set({ errorMessage: i18n.t("errors:loadImageFailed", { error: String(e) }) });
    }
  },

  loadImageFromPaste: async (imageData: ArrayBuffer) => {
    try {
      const uint8 = new Uint8Array(imageData);
      const url = URL.createObjectURL(new Blob([uint8 as unknown as BlobPart]));

      setPreview(set, "blob", url, null, uint8);
      startFreshConversion(set, get);
    } catch (e) {
      set({ errorMessage: i18n.t("errors:loadImageFailed", { error: String(e) }) });
    }
  },

  convert: () => {
    scheduleConversion(set, get);
  },

  // ── Clipboard ──

  copyToClipboard: async () => {
    const { output } = get();
    if (!output) return;

    try {
      const { writeText } = await import("@tauri-apps/plugin-clipboard-manager");
      await writeText(output.plainText);
    } catch (e) {
      set({ errorMessage: i18n.t("errors:copyFailed", { error: String(e) }) });
    }
  },

  // ── Export ──

  exportOutput: async (format) => {
    const { imagePath, params } = get();
    if (!imagePath) return;

    try {
      const ext = format === "png" ? "png" : format === "svg" ? "svg" : format === "html" ? "html" : "txt";
      const filePath = await saveFile(
        [{ name: i18n.t("common:labels.file"), extensions: [ext] }],
        `ascii_art.${ext}`,
      );
      if (!filePath) return;

      await asciiArtApi.exportAsciiArt(params, imagePath, format, filePath);
    } catch (e) {
      set({ errorMessage: i18n.t("errors:exportFailed", { error: String(e) }) });
    }
  },

  // ── UI controls ──

  setZoom: (zoom) => set({ zoom: Math.max(0.1, Math.min(10, zoom)) }),
  setPan: (x, y) => set({ panX: x, panY: y }),
  resetView: () => set({ zoom: 1, panX: 0, panY: 0 }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  clearError: () => set({ errorMessage: null }),
  setErrorMessage: (msg) => set({ errorMessage: msg }),

  // ── Cleanup ──

  cleanup: () => {
    cancelDebounce();
    resetScheduler();
    const state = get();
    safeRevoke(state.imagePreviewUrl, state.previewUrlKind);
    if (state.output?.outputPath) {
      asciiArtApi.cleanupAsciiArt().catch(() => {});
    }
  },
}));

// ── Conversion orchestration ──

function scheduleConversion(
  set: (u: Partial<AsciiArtState>) => void,
  get: () => AsciiArtState,
): void {
  schedule({
    onStart: () => {
      set({ isConverting: true, errorMessage: null, progress: 0, progressStage: "" });
    },
    execute: (version) => executeConvert(set, get, version),
    onComplete: () => {
      set({ isConverting: false, progress: 100, estimatedTimeRemaining: 0, activeTab: "ascii" });
    },
    onError: (_version, message) => {
      set({ errorMessage: i18n.t("errors:convertFailed", { error: message }), isConverting: false });
    },
  });
}

function startFreshConversion(
  set: (u: Partial<AsciiArtState>) => void,
  get: () => AsciiArtState,
): void {
  resetScheduler();
  scheduleConversion(set, get);
}

async function executeConvert(
  set: (u: Partial<AsciiArtState>) => void,
  get: () => AsciiArtState,
  version: number,
): Promise<void> {
  const { imagePath, imageBytes, params } = get();

  let unlistenProgress: UnlistenFn | null = null;

  try {
    // Subscribe to progress events
    unlistenProgress = await listen<AsciiArtProgress>(
      "ascii-art://progress",
      (event) => {
        if (!isVersionValid(version)) return;
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
      },
    );

    let output: AsciiArtOutput;

    if (imagePath) {
      output = await asciiArtApi.convertAsciiArtFromPath(params, imagePath);
    } else {
      const [tempPath, result] = await asciiArtApi.saveTempImageAndConvert(
        params,
        Array.from(imageBytes!),
      );
      output = result;
      set({ imagePath: tempPath });
    }

    if (!isVersionValid(version)) return;

    set({ output });
  } finally {
    if (unlistenProgress) unlistenProgress();
  }
}
