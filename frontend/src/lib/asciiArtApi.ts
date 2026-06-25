import { invoke } from "./tauri/client";
import i18n from "@/i18n";
import type { AsciiArtParams, AsciiArtOutput } from "@/types";

// ── Conversion ──

export async function convertAsciiArtFromPath(
  params: AsciiArtParams,
  imagePath: string,
): Promise<AsciiArtOutput> {
  return invoke<AsciiArtOutput>("convert_ascii_art_from_path", { params, imagePath });
}

export async function saveTempImageAndConvert(
  params: AsciiArtParams,
  imageBytes: number[],
): Promise<[string, AsciiArtOutput]> {
  return invoke<[string, AsciiArtOutput]>("save_temp_image_and_convert", { params, imageBytes });
}

export async function loadImageFromFile(): Promise<[string, Uint8Array]> {
  return invoke<[string, Uint8Array]>("load_image_from_file");
}

// ── Export ──

export async function exportAsciiArtPng(
  params: AsciiArtParams,
  imagePath: string,
  outputPath: string,
): Promise<void> {
  await invoke("export_ascii_art", {
    params,
    imagePath,
    format: "png",
    path: outputPath,
  });
}

export async function exportAsciiArt(
  params: AsciiArtParams,
  imagePath: string,
  format: "png" | "svg" | "txt" | "html",
  path: string,
): Promise<void> {
  await invoke("export_ascii_art", { params, imagePath, format, path });
}

// ── Canvas PNG export ──

export async function writeCanvasToPng(
  canvas: HTMLCanvasElement,
  outputPath: string,
): Promise<void> {
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/png"),
  );
  if (!blob) throw new Error(i18n.t("asciiArt:errors.canvasToPngFailed"));
  const buffer = await blob.arrayBuffer();
  const bytes = Array.from(new Uint8Array(buffer));
  await invoke("write_binary_file", { path: outputPath, contents: bytes });
}

// ── Cleanup ──

export async function cleanupAsciiArt(): Promise<void> {
  await invoke("cleanup_ascii_art");
}
