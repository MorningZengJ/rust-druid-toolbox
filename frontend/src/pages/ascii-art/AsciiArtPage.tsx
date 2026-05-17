import { useRef, useCallback, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Copy,
  Download,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Loader2,
  Image as ImageIcon,
  FileDown,
} from "lucide-react";
import { useAsciiArtStore } from "@/stores/asciiArtStore";
import type { CharsetPreset, ColorMode, Background, RenderMode } from "@/types";

export default function AsciiArtPage() {
  const params = useAsciiArtStore((s) => s.params);
  const setParams = useAsciiArtStore((s) => s.setParams);
  const imagePreviewUrl = useAsciiArtStore((s) => s.imagePreviewUrl);
  const output = useAsciiArtStore((s) => s.output);
  const isConverting = useAsciiArtStore((s) => s.isConverting);
  const errorMessage = useAsciiArtStore((s) => s.errorMessage);
  const loadImageFromFile = useAsciiArtStore((s) => s.loadImageFromFile);
  const loadImageFromPath = useAsciiArtStore((s) => s.loadImageFromPath);
  const loadImageFromPaste = useAsciiArtStore((s) => s.loadImageFromPaste);

  const [isDragOver, setIsDragOver] = useState(false);
  const copyToClipboard = useAsciiArtStore((s) => s.copyToClipboard);
  const exportOutput = useAsciiArtStore((s) => s.exportOutput);
  const zoom = useAsciiArtStore((s) => s.zoom);
  const setZoom = useAsciiArtStore((s) => s.setZoom);
  const panX = useAsciiArtStore((s) => s.panX);
  const panY = useAsciiArtStore((s) => s.panY);
  const setPan = useAsciiArtStore((s) => s.setPan);
  const resetView = useAsciiArtStore((s) => s.resetView);
  const activeTab = useAsciiArtStore((s) => s.activeTab);
  const setActiveTab = useAsciiArtStore((s) => s.setActiveTab);

  const displayRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  // Draw canvas when output changes (canvas render mode only; PNG uses <img>)
  useEffect(() => {
    if (params.renderMode !== "canvas" || !output || !canvasRef.current) return;

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

    // Clear canvas
    ctx.fillStyle = params.background === "white" ? "#ffffff" : params.background === "transparent" ? "transparent" : "#000000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw characters grouped by color to minimize fillStyle changes
    ctx.font = "10px monospace";
    ctx.textBaseline = "top";
    ctx.textAlign = "left";

    const colorGroups = new Map<string, {char: string, x: number, y: number}[]>();
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
  }, [output, params.renderMode, params.background]);

  // Wheel zoom
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const rect = displayRef.current?.getBoundingClientRect();
      if (!rect) return;

      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const delta = e.deltaY < 0 ? 1.1 : 1 / 1.1;
      const newZoom = Math.max(0.1, Math.min(10, zoom * delta));

      // Adjust pan to zoom towards mouse position
      const scale = newZoom / zoom;
      const newPanX = mouseX - scale * (mouseX - panX);
      const newPanY = mouseY - scale * (mouseY - panY);

      setZoom(newZoom);
      setPan(newPanX, newPanY);
    },
    [zoom, panX, panY, setZoom, setPan]
  );

  // Right-click drag
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button === 2) {
        e.preventDefault();
        isDragging.current = true;
        dragStart.current = { x: e.clientX, y: e.clientY, panX, panY };
      }
    },
    [panX, panY]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging.current) return;
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      setPan(dragStart.current.panX + dx, dragStart.current.panY + dy);
    },
    [setPan]
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      if (e.button === 2) {
        isDragging.current = false;
      }
    },
    []
  );

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);

  // Export PNG
  const handleExportPng = useCallback(async () => {
    const { output, params } = useAsciiArtStore.getState();
    if (!output) return;
    try {
      const { save } = await import("@tauri-apps/plugin-dialog");
      const filePath = await save({
        filters: [{ name: "图片", extensions: ["png"] }],
        defaultPath: "ascii_art.png",
      });
      if (!filePath) return;

      if (params.renderMode === "png" && output.imageData) {
        // PNG mode: use backend-generated bytes directly
        await invoke("write_binary_file", { path: filePath, contents: output.imageData });
      } else if (canvasRef.current) {
        // Canvas mode: screenshot the canvas
        const blob = await new Promise<Blob | null>((resolve) =>
          canvasRef.current!.toBlob(resolve, "image/png")
        );
        if (!blob) return;
        const buffer = await blob.arrayBuffer();
        const bytes = Array.from(new Uint8Array(buffer));
        await invoke("write_binary_file", { path: filePath, contents: bytes });
      }
    } catch (e) {
      useAsciiArtStore.getState().setErrorMessage(`导出PNG失败: ${e}`);
    }
  }, []);

  // Double-click to select image
  const handleDoubleClick = useCallback(() => {
    loadImageFromFile();
  }, [loadImageFromFile]);

  // Tauri native file drag & drop
  useEffect(() => {
    const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "gif", "bmp", "webp"];
    const unlisten = getCurrentWindow().onDragDropEvent((event) => {
      if (event.payload.type === "over") {
        setIsDragOver(true);
      } else if (event.payload.type === "leave") {
        setIsDragOver(false);
      } else if (event.payload.type === "drop") {
        setIsDragOver(false);
        const paths = event.payload.paths;
        const imagePath = paths.find((p) => {
          const ext = p.split(".").pop()?.toLowerCase() ?? "";
          return IMAGE_EXTENSIONS.includes(ext);
        });
        if (imagePath) {
          loadImageFromPath(imagePath);
        }
      }
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, [loadImageFromPath]);

  // Paste handler
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const blob = item.getAsFile();
          if (blob) {
            blob.arrayBuffer().then((buffer) => {
              loadImageFromPaste(buffer);
            });
          }
          break;
        }
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [loadImageFromPaste]);

  const renderAsciiContent = () => {
    if (!output) return null;

    const transformStyle = {
      transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
      transformOrigin: "0 0",
    };

    switch (params.renderMode) {
      case "svg":
        if (!output.svgData) return null;
        const svgBase64 = btoa(unescape(encodeURIComponent(output.svgData)));
        return (
          <img
            src={`data:image/svg+xml;base64,${svgBase64}`}
            alt="ASCII Art"
            style={transformStyle}
            className="block"
          />
        );

      case "png":
        if (!output.imageData) return null;
        {
          const bytes = new Uint8Array(output.imageData);
          let binary = "";
          for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          const base64 = btoa(binary);
          return (
            <img
              src={`data:image/png;base64,${base64}`}
              alt="ASCII Art"
              style={transformStyle}
              className="block"
            />
          );
        }

      case "canvas":
        return (
          <canvas
            ref={canvasRef}
            style={transformStyle}
            className="block"
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex h-full gap-3" onPaste={(e) => e.preventDefault()}>
      {/* Left: Controls */}
      <div className="flex w-[280px] shrink-0 flex-col rounded-lg border border-border bg-panel">
        <ScrollArea className="flex-1">
          <div className="space-y-4 p-3">
            {/* Render Mode */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">渲染模式</label>
              <Select
                value={params.renderMode}
                onValueChange={(v) => setParams({ renderMode: v as RenderMode })}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="png">PNG - 快速，适合大图</SelectItem>
                  <SelectItem value="svg">SVG - 矢量，缩放不失真</SelectItem>
                  <SelectItem value="canvas">Canvas - 灵活，支持交互</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Width */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                宽度: {params.width} 字符
              </label>
              <Slider
                value={[params.width]}
                onValueChange={([v]) => setParams({ width: v })}
                min={300}
                max={2000}
                step={10}
              />
            </div>

            {/* Charset */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">字符集</label>
              <Select
                value={params.charset}
                onValueChange={(v) => setParams({ charset: v as CharsetPreset })}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="simple">简单</SelectItem>
                  <SelectItem value="standard">标准</SelectItem>
                  <SelectItem value="complex">复杂</SelectItem>
                  <SelectItem value="custom">自定义</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Custom charset */}
            {params.charset === "custom" && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">自定义字符</label>
                <Input
                  className="h-8 font-mono text-sm"
                  value={params.customCharset}
                  onChange={(e) => setParams({ customCharset: e.target.value })}
                  placeholder="从暗到亮排列字符"
                />
              </div>
            )}

            {/* Contrast */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                对比度: {params.contrast.toFixed(1)}
              </label>
              <Slider
                value={[params.contrast]}
                onValueChange={([v]) => setParams({ contrast: v })}
                min={0.1}
                max={3.0}
                step={0.1}
              />
            </div>

            {/* Brightness */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                亮度: {params.brightness.toFixed(1)}
              </label>
              <Slider
                value={[params.brightness]}
                onValueChange={([v]) => setParams({ brightness: v })}
                min={-1.0}
                max={1.0}
                step={0.1}
              />
            </div>

            {/* Saturation */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                饱和度: {params.saturation.toFixed(1)}
              </label>
              <Slider
                value={[params.saturation]}
                onValueChange={([v]) => setParams({ saturation: v })}
                min={0.0}
                max={2.0}
                step={0.1}
              />
            </div>

            {/* Char aspect ratio */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                字符宽高比: {params.charAspectRatio.toFixed(2)}
              </label>
              <Slider
                value={[params.charAspectRatio]}
                onValueChange={([v]) => setParams({ charAspectRatio: v })}
                min={0.3}
                max={1.0}
                step={0.05}
              />
            </div>

            {/* Invert */}
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={params.invert}
                onCheckedChange={(checked) => setParams({ invert: !!checked })}
              />
              <span className="text-muted-foreground">反转明暗</span>
            </label>

            {/* Color mode */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">颜色模式</label>
              <Select
                value={params.colorMode}
                onValueChange={(v) => setParams({ colorMode: v as ColorMode })}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monochrome">单色</SelectItem>
                  <SelectItem value="ansi256">ANSI 256色</SelectItem>
                  <SelectItem value="trueColor">真彩色</SelectItem>
                  <SelectItem value="html">HTML</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Background */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">背景</label>
              <Select
                value={params.background}
                onValueChange={(v) => setParams({ background: v as Background })}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="black">黑色</SelectItem>
                  <SelectItem value="white">白色</SelectItem>
                  <SelectItem value="transparent">透明</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </ScrollArea>
      </div>

      {/* Right: Preview */}
      <div className="flex flex-1 flex-col overflow-hidden rounded-lg border border-border bg-panel">
        {/* Toolbar */}
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <div className="flex items-center gap-2">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "original" | "ascii")}>
              <TabsList className="h-7">
                <TabsTrigger value="original" className="h-5 px-2 text-xs">
                  <ImageIcon size={12} className="mr-1" />
                  原图
                </TabsTrigger>
                <TabsTrigger value="ascii" className="h-5 px-2 text-xs" disabled={!output}>
                  字符画
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex items-center gap-1 ml-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setZoom(zoom * 1.2)}
              >
                <ZoomIn size={14} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setZoom(zoom / 1.2)}
              >
                <ZoomOut size={14} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={resetView}
              >
                <RotateCcw size={14} />
              </Button>
              <span className="text-xs text-muted-foreground">
                {Math.round(zoom * 100)}%
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {isConverting && (
              <Loader2 size={14} className="animate-spin text-muted-foreground" />
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-7"
              disabled={!output}
              onClick={copyToClipboard}
            >
              <Copy size={14} className="mr-1" />
              复制
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7"
                  disabled={!output}
                >
                  <Download size={14} className="mr-1" />
                  导出
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleExportPng}>
                  <FileDown size={14} className="mr-2" />
                  导出为 PNG
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportOutput("svg")}>
                  <FileDown size={14} className="mr-2" />
                  导出为 SVG
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportOutput("txt")}>
                  <FileDown size={14} className="mr-2" />
                  导出为 TXT
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportOutput("html")}>
                  <FileDown size={14} className="mr-2" />
                  导出为 HTML
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Display area */}
        <div
          ref={displayRef}
          className={`flex-1 overflow-hidden relative ${isDragOver ? "ring-2 ring-primary ring-inset" : ""}`}
          style={{
            background: params.background === "white" ? "#fff" : params.background === "transparent" ? "repeating-conic-gradient(#808080 0% 25%, #000 0% 50%) 50% / 20px 20px" : "#000",
          }}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onContextMenu={handleContextMenu}
        >
          {isDragOver && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-primary/10 pointer-events-none">
              <div className="rounded-lg border-2 border-dashed border-primary bg-background/80 px-8 py-4 text-sm font-medium text-primary">
                释放以加载图片
              </div>
            </div>
          )}
          {errorMessage && (
            <div className="absolute top-2 left-2 right-2 rounded border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive z-10">
              {errorMessage}
            </div>
          )}

          {activeTab === "original" ? (
            <div
              className="flex h-full items-center justify-center"
              onDoubleClick={handleDoubleClick}
            >
              {imagePreviewUrl ? (
                <img
                  src={imagePreviewUrl}
                  alt="原始图片"
                  style={{
                    transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
                    transformOrigin: "0 0",
                    maxWidth: "100%",
                    maxHeight: "100%",
                    objectFit: "contain",
                  }}
                />
              ) : (
                <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
                  <ImageIcon size={48} />
                  <p>双击选择图片</p>
                  <p className="text-xs">支持拖拽或 Ctrl+V 粘贴</p>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full overflow-hidden p-4">
              {isConverting ? (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  <Loader2 size={24} className="animate-spin mr-2" />
                  正在转换...
                </div>
              ) : output ? (
                renderAsciiContent()
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  请先加载图片
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
