import { Button } from "@/components/ui/button";
import { AlertCircle, AlertTriangle } from "lucide-react";

interface FfmpegWarningProps {
  onRetry: () => void;
  variant?: "default" | "warning";
}

export function FfmpegWarning({ onRetry, variant = "default" }: FfmpegWarningProps) {
  const Icon = variant === "warning" ? AlertTriangle : AlertCircle;

  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center">
        <Icon className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
        <h2 className="mb-2 text-lg font-semibold">FFmpeg 未安装</h2>
        <p className="text-sm text-muted-foreground">
          此功能需要 FFmpeg 支持，请先安装 FFmpeg 并确保其在系统 PATH 中。
        </p>
        <Button className="mt-4" onClick={onRetry}>
          重新检测
        </Button>
      </div>
    </div>
  );
}
