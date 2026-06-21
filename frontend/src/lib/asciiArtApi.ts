import { invoke } from "@tauri-apps/api/core";
import i18n from "@/i18n";
import type { AsciiArtParams } from "@/types";

/**
 * 导出 ASCII art 为 PNG 文件（后端渲染模式）
 */
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

/**
 * 将 Canvas 内容写入二进制文件（前端 Canvas 渲染模式）
 */
export async function writeCanvasToPng(
  canvas: HTMLCanvasElement,
  outputPath: string,
): Promise<void> {
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/png")
  );
  if (!blob) throw new Error(i18n.t("asciiArt:errors.canvasToPngFailed"));
  const buffer = await blob.arrayBuffer();
  const bytes = Array.from(new Uint8Array(buffer));
  await invoke("write_binary_file", { path: outputPath, contents: bytes });
}
