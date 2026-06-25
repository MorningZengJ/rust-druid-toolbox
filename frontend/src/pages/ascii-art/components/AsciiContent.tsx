import { useMemo, type RefObject } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { useTranslation } from "react-i18next";
import type { AsciiArtOutput, RenderMode } from "@/types";

// ── Helper: UTF-8 string → base64 (replaces deprecated unescape) ──

function svgToDataUrl(svg: string): string {
  // Convert JS string (UTF-16) to UTF-8 bytes, then to binary string for btoa
  const utf8Bytes = new TextEncoder().encode(svg);
  const binary = String.fromCharCode(...utf8Bytes);
  return `data:image/svg+xml;base64,${btoa(binary)}`;
}

// ── Component ──

interface AsciiContentProps {
  output: AsciiArtOutput;
  renderMode: RenderMode;
  panX: number;
  panY: number;
  zoom: number;
  contentRef: RefObject<HTMLDivElement | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
}

export function AsciiContent({
  output,
  renderMode,
  panX,
  panY,
  zoom,
  contentRef,
  canvasRef,
}: AsciiContentProps) {
  const { t } = useTranslation("asciiArt");

  // Memoize SVG data URL — avoid base64-encoding large strings on every render
  const svgDataUrl = useMemo(() => {
    if (renderMode !== "svg" || !output.svgData) return null;
    return svgToDataUrl(output.svgData);
  }, [renderMode, output.svgData]);

  const child = (() => {
    switch (renderMode) {
      case "svg":
        if (!svgDataUrl) return null;
        return (
          <img
            src={svgDataUrl}
            alt={t("preview.asciiArtAlt")}
            style={{ display: "block" }}
          />
        );

      case "png":
        if (!output.outputPath) return null;
        return (
          <img
            src={convertFileSrc(output.outputPath)}
            alt={t("preview.asciiArtAlt")}
            style={{ display: "block" }}
          />
        );

      case "canvas":
        return (
          <canvas
            ref={canvasRef}
            style={{ display: "block" }}
          />
        );

      default:
        return null;
    }
  })();

  if (!child) return null;

  return (
    <div
      ref={contentRef}
      style={{
        transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
        transformOrigin: "0 0",
      }}
    >
      {child}
    </div>
  );
}
