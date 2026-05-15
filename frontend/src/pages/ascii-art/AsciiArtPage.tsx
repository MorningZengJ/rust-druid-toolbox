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
  FolderOpen,
  Copy,
  Download,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Loader2,
} from "lucide-react";
import { useAsciiArtStore } from "@/stores/asciiArtStore";
import type { CharsetPreset, ColorMode, Background } from "@/types";

export default function AsciiArtPage() {
  const params = useAsciiArtStore((s) => s.params);
  const setParams = useAsciiArtStore((s) => s.setParams);
  const imagePreviewUrl = useAsciiArtStore((s) => s.imagePreviewUrl);
  const output = useAsciiArtStore((s) => s.output);
  const isConverting = useAsciiArtStore((s) => s.isConverting);
  const errorMessage = useAsciiArtStore((s) => s.errorMessage);
  const loadImage = useAsciiArtStore((s) => s.loadImage);
  const copyToClipboard = useAsciiArtStore((s) => s.copyToClipboard);
  const exportOutput = useAsciiArtStore((s) => s.exportOutput);
  const zoom = useAsciiArtStore((s) => s.zoom);
  const setZoom = useAsciiArtStore((s) => s.setZoom);
  const resetView = useAsciiArtStore((s) => s.resetView);

  return (
    <div className="flex h-full gap-3">
      {/* Left: Controls */}
      <div className="flex w-[280px] shrink-0 flex-col rounded-lg border border-border bg-panel">
        <div className="flex items-center gap-2 border-b border-border px-3 py-2">
          <Button variant="outline" size="sm" className="h-7" onClick={loadImage}>
            <FolderOpen size={14} className="mr-1" />
            打开图片
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div className="space-y-4 p-3">
            {/* Image preview */}
            {imagePreviewUrl && (
              <div className="overflow-hidden rounded border border-border">
                <img
                  src={imagePreviewUrl}
                  alt="原始图片"
                  className="max-h-[150px] w-full object-contain"
                />
              </div>
            )}

            {/* Width */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                宽度: {params.width} 字符
              </label>
              <Slider
                value={[params.width]}
                onValueChange={([v]) => setParams({ width: v })}
                min={20}
                max={300}
                step={1}
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
          <div className="flex items-center gap-1">
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
            <span className="ml-2 text-xs text-muted-foreground">
              {Math.round(zoom * 100)}%
            </span>
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
              onClick={() => copyToClipboard("plain")}
            >
              <Copy size={14} className="mr-1" />
              复制
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7"
              disabled={!output}
              onClick={() => exportOutput("html")}
            >
              <Download size={14} className="mr-1" />
              导出
            </Button>
          </div>
        </div>

        {/* Preview area */}
        <div className="flex-1 overflow-hidden">
          {errorMessage && (
            <div className="m-3 rounded border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {errorMessage}
            </div>
          )}

          {output ? (
            <div
              className="h-full overflow-auto p-4"
              style={{
                background: params.background === "white" ? "#fff" : params.background === "transparent" ? "repeating-conic-gradient(#808080 0% 25%, #000 0% 50%) 50% / 20px 20px" : "#000",
              }}
            >
              <pre
                className="inline-block font-mono text-[6px] leading-[6px]"
                style={{
                  transform: `scale(${zoom})`,
                  transformOrigin: "top left",
                }}
                dangerouslySetInnerHTML={{ __html: output.htmlText }}
              />
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              {isConverting ? "正在转换..." : "打开图片开始转换"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
