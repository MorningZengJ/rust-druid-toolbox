import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sun, Moon, Monitor, Check } from "lucide-react";
import { useTheme, COLOR_THEMES } from "@/hooks/useTheme";

function hexToHsl(hex: string): string | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;

  const r = parseInt(result[1], 16) / 255;
  const g = parseInt(result[2], 16) / 255;
  const b = parseInt(result[3], 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export default function SettingsPage() {
  const { colorMode, colorTheme, customPrimary, setColorMode, setColorTheme, setCustomPrimary } =
    useTheme();
  const [customColorInput, setCustomColorInput] = useState("");

  const handleCustomColorApply = () => {
    const hsl = hexToHsl(customColorInput);
    if (hsl) {
      setCustomPrimary(hsl);
    }
  };

  const handleClearCustom = () => {
    setCustomPrimary(undefined);
    setCustomColorInput("");
  };

  const isCustomActive = !!customPrimary;

  return (
    <div className="flex h-full flex-col">
      <h1 className="mb-6 text-2xl font-bold">设置</h1>

      <div className="max-w-md space-y-6">
        {/* Color Mode */}
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">显示模式</h2>
          <div className="flex gap-2">
            <Button
              variant={colorMode === "light" ? "default" : "outline"}
              size="sm"
              onClick={() => setColorMode("light")}
            >
              <Sun size={14} className="mr-1" />
              亮色
            </Button>
            <Button
              variant={colorMode === "dark" ? "default" : "outline"}
              size="sm"
              onClick={() => setColorMode("dark")}
            >
              <Moon size={14} className="mr-1" />
              暗色
            </Button>
            <Button
              variant={colorMode === "system" ? "default" : "outline"}
              size="sm"
              onClick={() => setColorMode("system")}
            >
              <Monitor size={14} className="mr-1" />
              跟随系统
            </Button>
          </div>
        </div>

        {/* Color Theme */}
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">颜色主题</h2>
          <div className="flex flex-wrap gap-3">
            {COLOR_THEMES.map((theme) => (
              <button
                key={theme.value}
                className={`relative flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all ${
                  colorTheme === theme.value && !isCustomActive
                    ? "border-primary scale-110 shadow-md"
                    : "border-transparent hover:scale-105"
                }`}
                style={{ backgroundColor: theme.color }}
                onClick={() => setColorTheme(theme.value)}
                title={theme.label}
              >
                {colorTheme === theme.value && !isCustomActive && (
                  <Check size={16} className="text-white drop-shadow" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Color */}
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">自定义颜色</h2>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                type="text"
                placeholder="#3b82f6 (HEX 色值)"
                value={customColorInput}
                onChange={(e) => setCustomColorInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCustomColorApply()}
              />
            </div>
            <Button size="sm" onClick={handleCustomColorApply}>
              应用
            </Button>
            {isCustomActive && (
              <Button size="sm" variant="outline" onClick={handleClearCustom}>
                清除
              </Button>
            )}
          </div>
          {isCustomActive && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div
                className="h-4 w-4 rounded-full"
                style={{ backgroundColor: `hsl(${customPrimary})` }}
              />
              <span>当前自定义: {customPrimary}</span>
            </div>
          )}
        </div>

        {/* About */}
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">关于</h2>
          <div className="rounded-lg border border-border bg-card p-4 text-sm">
            <p className="font-medium">Druid Toolbox</p>
            <p className="text-muted-foreground">批量重命名 / 字符画生成 / 视频抽帧</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Tauri v2 + React + shadcn/ui
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
