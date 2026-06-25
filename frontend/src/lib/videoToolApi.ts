import { invoke } from "./tauri/client";
import type {
  MergeVideosParams,
  MergeVideosResult,
  ImagesToVideoParams,
  ImagesToVideoResult,
  ConvertFormatParams,
  BatchConvertParams,
  BatchConvertResult,
  ExtractParams,
  ExtractedFrame,
  VideoInfo,
} from "@/types";

// ── FFmpeg / encoder checks ──

export async function checkFfmpeg(): Promise<boolean> {
  return invoke<boolean>("check_ffmpeg");
}

export async function checkVideoEncoders(): Promise<[string, boolean][]> {
  return invoke<[string, boolean][]>("check_video_encoders");
}

// ── Merge ──

export async function mergeVideos(params: MergeVideosParams): Promise<MergeVideosResult> {
  return invoke<MergeVideosResult>("merge_videos", { params });
}

// ── Images to video ──

export async function imagesToVideo(params: ImagesToVideoParams): Promise<ImagesToVideoResult> {
  return invoke<ImagesToVideoResult>("images_to_video", { params });
}

// ── Convert ──

export async function convertFormat(params: ConvertFormatParams): Promise<void> {
  return invoke<void>("convert_format", { params });
}

export async function batchConvertFormat(params: BatchConvertParams): Promise<BatchConvertResult> {
  return invoke<BatchConvertResult>("batch_convert_format", { params });
}

// ── Extract frames ──

export async function probeVideo(path: string): Promise<VideoInfo> {
  return invoke<VideoInfo>("probe_video", { path });
}

export async function extractFrames(
  params: ExtractParams,
  outputDir: string,
): Promise<ExtractedFrame[]> {
  return invoke<ExtractedFrame[]>("extract_frames", { params, outputDir });
}

export async function startFrameWatcher(outputDir: string): Promise<void> {
  return invoke<void>("start_frame_watcher", { outputDir });
}

export async function stopFrameWatcher(): Promise<void> {
  return invoke<void>("stop_frame_watcher");
}

// ── Media file listing ──

export async function listImagesInFolder(folder: string): Promise<string[]> {
  return invoke<string[]>("list_images_in_folder", { folder });
}

export async function listMediaFilesInFolder(folder: string): Promise<string[]> {
  return invoke<string[]>("list_media_files_in_folder", { folder });
}
