import type { RefObject } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { useTranslation } from "react-i18next";
import type { AsciiArtOutput } from "@/types";

interface AsciiContentProps {
  output: AsciiArtOutput;
  renderMode: string;
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
  const child = (() => {
    switch (renderMode) {
      case "svg":
        if (!output.svgData) return null;
        const svgBase64 = btoa(unescape(encodeURIComponent(output.svgData)));
        return (
          <img
            src={`data:image/svg+xml;base64,${svgBase64}`}
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
