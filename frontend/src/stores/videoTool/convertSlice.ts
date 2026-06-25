import * as videoToolApi from "@/lib/videoToolApi";
import i18n from "@/i18n";
import type {
  ConvertFormatParams,
  BatchConvertParams,
  BatchConvertResult,
  BatchProgress,
  ConvertFileItem,
} from "@/types";
import type { VideoToolState } from "./types";
import type { StateCreator } from "zustand";
import { VIDEO_AUDIO_CODECS } from "@/pages/video-tool/constants";

export interface ConvertSlice {
  convertFiles: ConvertFileItem[];
  convertTarget: "video" | "audio";
  convertVideoFormat: string;
  convertAudioFormat: string;
  convertAudioCodec: string;
  convertAudioBitrate: string;
  convertVideoBitrate: string;
  convertVideoCodec: string;
  convertQualityPreset: string;
  convertBatchResult: BatchConvertResult | null;
  convertBatchProgress: BatchProgress | null;
  convertCurrentFileProgress: number;
  setConvertInputs: (paths: string[]) => void;
  addConvertInputs: (paths: string[]) => void;
  removeConvertInput: (index: number) => void;
  clearConvertInputs: () => void;
  setConvertTarget: (t: "video" | "audio") => void;
  setConvertVideoFormat: (fmt: string) => void;
  setConvertAudioFormat: (fmt: string) => void;
  setConvertAudioCodec: (codec: string) => void;
  setConvertAudioBitrate: (rate: string) => void;
  setConvertVideoBitrate: (rate: string) => void;
  setConvertVideoCodec: (codec: string) => void;
  setConvertQualityPreset: (preset: string) => void;
  runBatchConvert: () => Promise<void>;
}

export const createConvertSlice: StateCreator<VideoToolState, [], [], ConvertSlice> = (set, get) => ({
  convertFiles: [],
  convertTarget: "video",
  convertVideoFormat: "mp4",
  convertAudioFormat: "mp3",
  convertAudioCodec: "aac",
  convertAudioBitrate: "192k",
  convertVideoBitrate: "",
  convertVideoCodec: "libx264",
  convertQualityPreset: "balanced",
  convertBatchResult: null,
  convertBatchProgress: null,
  convertCurrentFileProgress: 0,

  setConvertInputs: (paths) => {
    const state = get();
    const ext = state.convertTarget === "video" ? state.convertVideoFormat : state.convertAudioFormat;
    const files: ConvertFileItem[] = paths.map((p) => ({
      inputPath: p,
      outputPath: `${p.replace(/\.[^.]+$/, "")}_converted.${ext}`,
      status: "pending" as const,
    }));
    set({ convertFiles: files });
  },

  addConvertInputs: (paths) => {
    const state = get();
    const existing = new Set(state.convertFiles.map((f) => f.inputPath));
    const ext = state.convertTarget === "video" ? state.convertVideoFormat : state.convertAudioFormat;
    const newFiles: ConvertFileItem[] = paths
      .filter((p) => !existing.has(p))
      .map((p) => ({
        inputPath: p,
        outputPath: `${p.replace(/\.[^.]+$/, "")}_converted.${ext}`,
        status: "pending" as const,
      }));
    set({ convertFiles: [...state.convertFiles, ...newFiles] });
  },

  removeConvertInput: (index) => {
    set((s) => ({ convertFiles: s.convertFiles.filter((_, i) => i !== index) }));
  },

  clearConvertInputs: () => set({ convertFiles: [], convertBatchResult: null, convertBatchProgress: null, convertCurrentFileProgress: 0 }),

  setConvertTarget: (t) => {
    set({ convertTarget: t });
    const state = get();
    const ext = t === "video" ? state.convertVideoFormat : state.convertAudioFormat;
    set({
      convertFiles: state.convertFiles.map((f) => ({
        ...f,
        outputPath: `${f.inputPath.replace(/\.[^.]+$/, "")}_converted.${ext}`,
      })),
    });
  },

  setConvertVideoFormat: (fmt) => {
    const state = get();
    const codecs = VIDEO_AUDIO_CODECS[fmt] ?? ["aac"];
    const newAudioCodec = codecs.includes(state.convertAudioCodec)
      ? state.convertAudioCodec
      : codecs[0];
    const updates: Partial<ConvertSlice> = { convertVideoFormat: fmt, convertAudioCodec: newAudioCodec };
    if (state.convertTarget === "video") {
      updates.convertFiles = state.convertFiles.map((f) => ({
        ...f,
        outputPath: `${f.inputPath.replace(/\.[^.]+$/, "")}_converted.${fmt}`,
      }));
    }
    set(updates);
  },

  setConvertAudioCodec: (codec) => set({ convertAudioCodec: codec }),

  setConvertAudioFormat: (fmt) => {
    const state = get();
    const updates: Partial<ConvertSlice> = { convertAudioFormat: fmt };
    if (state.convertTarget === "audio") {
      updates.convertFiles = state.convertFiles.map((f) => ({
        ...f,
        outputPath: `${f.inputPath.replace(/\.[^.]+$/, "")}_converted.${fmt}`,
      }));
    }
    set(updates);
  },

  setConvertAudioBitrate: (rate) => set({ convertAudioBitrate: rate }),
  setConvertVideoBitrate: (rate) => set({ convertVideoBitrate: rate }),
  setConvertVideoCodec: (codec) => set({ convertVideoCodec: codec }),
  setConvertQualityPreset: (preset) => set({ convertQualityPreset: preset }),

  runBatchConvert: async () => {
    const state = get();
    if (state.convertFiles.length === 0) {
      set({ errorMessage: i18n.t("videoTool:errors.addFilesFirst") });
      return;
    }

    set({
      isProcessing: true,
      progress: 0,
      logs: [],
      errorMessage: null,
      convertBatchResult: null,
      convertBatchProgress: null,
      convertCurrentFileProgress: 0,
      convertFiles: state.convertFiles.map((f) => ({ ...f, status: "pending" as const, error: undefined })),
    });
    await get().registerEventListeners();

    try {
      const target =
        state.convertTarget === "video"
          ? { videoFormat: state.convertVideoFormat }
          : { audioFormat: state.convertAudioFormat };

      const items: ConvertFormatParams[] = state.convertFiles.map((f) => ({
        inputPath: f.inputPath,
        outputPath: f.outputPath,
        target,
        audioBitrate: state.convertTarget === "audio" ? state.convertAudioBitrate : null,
        videoBitrate:
          state.convertTarget === "video" && state.convertVideoBitrate
            ? state.convertVideoBitrate
            : null,
        resolution: null,
        audioCodec: state.convertTarget === "video" ? state.convertAudioCodec : null,
        videoCodec: state.convertTarget === "video" ? state.convertVideoCodec : undefined,
        qualityPreset: state.convertTarget === "video" ? state.convertQualityPreset : undefined,
      }));

      const params: BatchConvertParams = { items };
      const result = await videoToolApi.batchConvertFormat(params);
      set({ convertBatchResult: result });
    } catch (e) {
      set({ errorMessage: i18n.t("videoTool:errors.batchConvertFailed", { error: String(e) }) });
    } finally {
      set({ isProcessing: false });
      get().unregisterEventListeners();
    }
  },
});
