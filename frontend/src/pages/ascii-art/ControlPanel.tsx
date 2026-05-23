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
import { useAsciiArtStore } from "@/stores/asciiArtStore";
import type { CharsetPreset, ColorMode, Background, RenderMode } from "@/types";

export function ControlPanel() {
  const params = useAsciiArtStore((s) => s.params);
  const setParams = useAsciiArtStore((s) => s.setParams);

  return (
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
  );
}
