import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Play, Loader2, Film } from "lucide-react";
import { useVideoFrameStore } from "@/stores/videoFrameStore";
import { DirectoryPicker } from "@/components/common/DirectoryPicker";
import type { ExtractMode, OutputFormat } from "@/types";

function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds}秒`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs > 0 ? `${mins}分${secs}秒` : `${mins}分`;
}

export function ParamsPanel() {
  const videoPath = useVideoFrameStore((s) => s.videoPath);
  const videoInfo = useVideoFrameStore((s) => s.videoInfo);
  const extractParams = useVideoFrameStore((s) => s.extractParams);
  const setExtractParams = useVideoFrameStore((s) => s.setExtractParams);
  const isExtracting = useVideoFrameStore((s) => s.isExtracting);
  const progress = useVideoFrameStore((s) => s.progress);
  const extractFrames = useVideoFrameStore((s) => s.extractFrames);
  const outputDir = useVideoFrameStore((s) => s.outputDir);
  const setOutputDir = useVideoFrameStore((s) => s.setOutputDir);
  const logs = useVideoFrameStore((s) => s.logs);
  const estimatedTimeRemaining = useVideoFrameStore((s) => s.estimatedTimeRemaining);

  return (
    <div className="flex w-[280px] shrink-0 flex-col rounded-lg border border-border bg-panel">
      <div className="flex items-center border-b border-border px-3 py-2">
        <span className="text-xs font-medium text-muted-foreground">参数设置</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="space-y-4 p-3">
          {videoInfo && (
            <div className="rounded border border-border bg-muted/30 p-2 text-xs">
              <div className="flex items-center gap-1 mb-1">
                <Film size={12} className="text-muted-foreground" />
                <span className="font-medium truncate">{videoPath.split(/[/\\]/).pop()}</span>
              </div>
              <div className="grid grid-cols-2 gap-1 text-muted-foreground">
                <span>分辨率: {videoInfo.width}x{videoInfo.height}</span>
                <span>帧率: {videoInfo.fps.toFixed(1)} fps</span>
                <span>时长: {videoInfo.duration.toFixed(1)}s</span>
                <span>总帧数: {videoInfo.totalFrames}</span>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">帧图存放路径</label>
            <DirectoryPicker value={outputDir} onChange={setOutputDir} />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">提取模式</label>
            <Select
              value={extractParams.mode}
              onValueChange={(v) => setExtractParams({ mode: v as ExtractMode })}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="allFrames">全部帧</SelectItem>
                <SelectItem value="byInterval">按间隔</SelectItem>
                <SelectItem value="byCount">按数量</SelectItem>
                <SelectItem value="byTimePoints">按时间点</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {extractParams.mode === "byInterval" && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                间隔: {extractParams.intervalSecs.toFixed(1)} 秒
              </label>
              <Slider
                value={[extractParams.intervalSecs]}
                onValueChange={([v]) => setExtractParams({ intervalSecs: v })}
                min={0.1}
                max={30}
                step={0.1}
              />
            </div>
          )}

          {extractParams.mode === "byCount" && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">帧数量</label>
              <Input
                type="number"
                className="h-8 text-sm"
                value={extractParams.frameCount}
                onChange={(e) => setExtractParams({ frameCount: parseInt(e.target.value) || 10 })}
                min={1}
                max={1000}
              />
            </div>
          )}

          {extractParams.mode === "byTimePoints" && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                时间点（秒，逗号分隔）
              </label>
              <Input
                className="h-8 text-sm"
                placeholder="1.0, 5.0, 10.0"
                onChange={(e) => {
                  const points = e.target.value
                    .split(",")
                    .map((s) => parseFloat(s.trim()))
                    .filter((n) => !isNaN(n));
                  setExtractParams({ timePoints: points });
                }}
              />
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">输出格式</label>
            <Select
              value={extractParams.outputFormat}
              onValueChange={(v) => setExtractParams({ outputFormat: v as OutputFormat })}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="png">PNG</SelectItem>
                <SelectItem value="jpeg">JPEG</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {extractParams.outputFormat === "jpeg" && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                JPEG 质量: {extractParams.jpegQuality}
              </label>
              <Slider
                value={[extractParams.jpegQuality]}
                onValueChange={([v]) => setExtractParams({ jpegQuality: v })}
                min={1}
                max={100}
                step={1}
              />
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              缩放宽度（留空不缩放）
            </label>
            <Input
              type="number"
              className="h-8 text-sm"
              placeholder="原始宽度"
              value={extractParams.resizeWidth ?? ""}
              onChange={(e) => {
                const val = e.target.value ? parseInt(e.target.value) : undefined;
                setExtractParams({ resizeWidth: val });
              }}
            />
          </div>

          <Button
            className="w-full"
            disabled={!videoPath || isExtracting}
            onClick={extractFrames}
          >
            {isExtracting ? (
              <>
                <Loader2 size={14} className="mr-1 animate-spin" />
                提取中 {progress.toFixed(0)}%
                {estimatedTimeRemaining !== null && estimatedTimeRemaining > 0 && (
                  <span className="ml-1">· 剩余 {formatTime(estimatedTimeRemaining)}</span>
                )}
              </>
            ) : (
              <>
                <Play size={14} className="mr-1" />
                提取帧
              </>
            )}
          </Button>

          {isExtracting && (
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>
      </div>

      <div className="h-[140px] shrink-0 border-t border-border">
        <div className="flex items-center border-b border-border px-3 py-1.5">
          <span className="text-xs font-medium text-muted-foreground">日志</span>
        </div>
        <div className="h-[calc(100%-28px)] overflow-y-auto p-2">
          {logs.length > 0 ? (
            <>
              {logs.map((log, i) => (
                <div key={i} className="text-xs py-0.5">
                  <span className={log.level === 'error' ? 'text-destructive' : log.level === 'warn' ? 'text-yellow-500' : 'text-muted-foreground'}>
                    {log.message}
                  </span>
                </div>
              ))}
            </>
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
              暂无日志
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
