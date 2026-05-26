import { useRef, useEffect } from "react";
import { useAsciiArtStore } from "@/stores/asciiArtStore";

export function useCanvasRenderer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const output = useAsciiArtStore((s) => s.output);
  const renderMode = useAsciiArtStore((s) => s.params.renderMode);
  const background = useAsciiArtStore((s) => s.params.background);

  useEffect(() => {
    if (renderMode !== "canvas" || !output || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const charWidth = 8;
    const charHeight = 12;

    if (!output.charColors || output.charColors.length === 0) return;

    const lines = output.plainText.split("\n");
    const gridWidth = lines[0]?.length || 1;
    const gridHeight = lines.length;

    canvas.width = gridWidth * charWidth;
    canvas.height = gridHeight * charHeight;

    ctx.fillStyle = background === "white" ? "#ffffff" : background === "transparent" ? "transparent" : "#000000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.font = "10px monospace";
    ctx.textBaseline = "top";
    ctx.textAlign = "left";

    const colorGroups = new Map<string, { char: string; x: number; y: number }[]>();
    let idx = 0;
    for (let y = 0; y < gridHeight; y++) {
      for (let x = 0; x < gridWidth; x++) {
        if (idx >= output.charColors.length) break;
        const cc = output.charColors[idx];
        const key = `${cc.r},${cc.g},${cc.b}`;
        let group = colorGroups.get(key);
        if (!group) {
          group = [];
          colorGroups.set(key, group);
        }
        group.push({ char: cc.char, x: x * charWidth, y: y * charHeight });
        idx++;
      }
    }

    for (const [color, chars] of colorGroups) {
      ctx.fillStyle = `rgb(${color})`;
      for (const { char, x, y } of chars) {
        ctx.fillText(char, x, y);
      }
    }
  }, [output, renderMode, background]);

  return { canvasRef };
}
