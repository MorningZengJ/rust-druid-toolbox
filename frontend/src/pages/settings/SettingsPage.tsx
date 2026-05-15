import { Button } from "@/components/ui/button";
import { Sun, Moon, Monitor } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex h-full flex-col">
      <h1 className="mb-6 text-2xl font-bold">设置</h1>

      <div className="max-w-md space-y-6">
        {/* Theme */}
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">主题</h2>
          <div className="flex gap-2">
            <Button
              variant={theme === "light" ? "default" : "outline"}
              size="sm"
              onClick={() => setTheme("light")}
            >
              <Sun size={14} className="mr-1" />
              亮色
            </Button>
            <Button
              variant={theme === "dark" ? "default" : "outline"}
              size="sm"
              onClick={() => setTheme("dark")}
            >
              <Moon size={14} className="mr-1" />
              暗色
            </Button>
            <Button
              variant={theme === "system" ? "default" : "outline"}
              size="sm"
              onClick={() => setTheme("system")}
            >
              <Monitor size={14} className="mr-1" />
              跟随系统
            </Button>
          </div>
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
