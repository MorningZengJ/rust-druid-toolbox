import { invoke } from "@tauri-apps/api/core";
import type { ImagesToVideoParams, ImagesToVideoResult } from "@/types";
import type { VideoToolState } from "./types";
import type { StateCreator } from "zustand";

export interface ImagesSlice {
  imagesFolderPath: string;
  imagesInputPaths: string[];
  imagesOutputPath: string;
  imagesFps: number;
  imagesOutputFormat: string;
  imagesResolution: [number, number] | null;
  imagesAudioPath: string | null;
  imagesVideoCodec: string;
  imagesVideoBitrate: string;
  imagesQualityPreset: string;
  imagesResult: ImagesToVideoResult | null;
  setImagesFolderPath: (path: string) => void;
  loadImagesFromFolder: (folderPath?: string) => Promise<void>;
  setImagesOutputPath: (path: string) => void;
  setImagesFps: (fps: number) => void;
  setImagesOutputFormat: (fmt: string) => void;
  setImagesResolution: (res: [number, number] | null) => void;
  setImagesAudioPath: (path: string | null) => void;
  setImagesVideoCodec: (codec: string) => void;
  setImagesVideoBitrate: (rate: string) => void;
  setImagesQualityPreset: (preset: string) => void;
  runImagesToVideo: () => Promise<void>;
}

export const createImagesSlice: StateCreator<VideoToolState, [], [], ImagesSlice> = (set, get) => ({
  imagesFolderPath: "",
  imagesInputPaths: [],
  imagesOutputPath: "",
  imagesFps: 24,
  imagesOutputFormat: "mp4",
  imagesResolution: null,
  imagesAudioPath: null,
  imagesVideoCodec: "libx264",
  imagesVideoBitrate: "",
  imagesQualityPreset: "balanced",
  imagesResult: null,

  setImagesFolderPath: (path) => set({ imagesFolderPath: path }),
  loadImagesFromFolder: async (folderPath?: string) => {
    const targetPath = folderPath || get().imagesFolderPath;
    if (!targetPath) {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const selected = await open({ directory: true });
      if (!selected) return;
      const selectedPath = selected as string;
      set({ imagesFolderPath: selectedPath });
      try {
        const paths = await invoke<string[]>("list_images_in_folder", { folderPath: selectedPath });
        set({ imagesInputPaths: paths, errorMessage: null });
      } catch (e) {
        set({ errorMessage: `读取文件夹失败: ${e}` });
      }
    } else {
      set({ imagesFolderPath: targetPath });
      try {
        const paths = await invoke<string[]>("list_images_in_folder", { folderPath: targetPath });
        set({ imagesInputPaths: paths, errorMessage: null });
      } catch (e) {
        set({ errorMessage: `读取文件夹失败: ${e}` });
      }
    }
  },
  setImagesOutputPath: (path) => set({ imagesOutputPath: path }),
  setImagesFps: (fps) => set({ imagesFps: fps }),
  setImagesOutputFormat: (fmt) => set({ imagesOutputFormat: fmt }),
  setImagesResolution: (res) => set({ imagesResolution: res }),
  setImagesAudioPath: (path) => set({ imagesAudioPath: path }),
  setImagesVideoCodec: (codec) => set({ imagesVideoCodec: codec }),
  setImagesVideoBitrate: (rate) => set({ imagesVideoBitrate: rate }),
  setImagesQualityPreset: (preset) => set({ imagesQualityPreset: preset }),

  runImagesToVideo: async () => {
    const state = get();
    if (!state.imagesFolderPath) {
      set({ errorMessage: "请先选择图片文件夹" });
      return;
    }
    if (state.imagesInputPaths.length === 0) {
      set({ errorMessage: "文件夹中未找到图片文件" });
      return;
    }
    if (!state.imagesOutputPath) {
      set({ errorMessage: "请设置输出路径" });
      return;
    }

    set({ isProcessing: true, progress: 0, logs: [], errorMessage: null, imagesResult: null });
    await get().registerEventListeners();

    try {
      const params: ImagesToVideoParams = {
        imagePaths: state.imagesInputPaths,
        outputPath: state.imagesOutputPath,
        fps: state.imagesFps,
        outputFormat: state.imagesOutputFormat,
        resolution: state.imagesResolution,
        audioPath: state.imagesAudioPath,
        loopCount: null,
        videoCodec: state.imagesVideoCodec || undefined,
        videoBitrate: state.imagesVideoBitrate || undefined,
        qualityPreset: state.imagesQualityPreset || undefined,
      };
      const result = await invoke<ImagesToVideoResult>("images_to_video", { params });
      set({ imagesResult: result });
    } catch (e) {
      set({ errorMessage: `生成失败: ${e}` });
    } finally {
      set({ isProcessing: false });
      get().unregisterEventListeners();
    }
  },
});
