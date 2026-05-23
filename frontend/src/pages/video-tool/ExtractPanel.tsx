import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Play,
  FolderOpen,
  Loader2,
  Upload,
  Film,
} from "lucide-react";
import {
  ResizablePanel,
  ResizablePanelGroup,
  ResizableHandle,
} from "@/components/ui/resizable";
import { useVideoToolStore } from "@/stores/videoToolStore";
import { convertFileSrc } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import type { ExtractMode, OutputFormat } from "@/types";

export function ExtractPanel() {
  const extractVideoPath = useVideoToolStore((s) => s.extractVideoPath);
  const extractVideoInfo = useVideoToolStore((s) => s.extractVideoInfo);
  const extractParams = useVideoToolStore((s) => s.extractParams);
  const setExtractParams = useVideoToolStore((s) => s.setExtractParams);
  const extractFrames = useVideoToolStore((s) => s.extractFrames);
  const isExtracting = useVideoToolStore((s) => s.isExtracting);
  const extractProgress = useVideoToolStore((s) => s.extractProgress);
  const errorMessage = useVideoToolStore((s) => s.errorMessage);
  const extractSelectedFrame = useVideoToolStore((s) => s.extractSelectedFrame);
  const setExtractSelectedFrame = useVideoToolStore((s) => s.setExtractSelectedFrame);
  const loadVideo = useVideoToolStore((s) => s.loadVideo);
  const runExtractFrames = useVideoToolStore((s) => s.runExtractFrames);
  const extractOutputDir = useVideoToolStore((s) => s.extractOutputDir);
  const setExtractOutputDir = useVideoToolStore((s) => s.setExtractOutputDir);
  const stopExtractWatcher = useVideoToolStore((s) => s.stopExtractWatcher);
  const extractLogs = useVideoToolStore((s) => s.extractLogs);
  const extractEstimatedTimeRemaining = useVideoToolStore((s) => s.extractEstimatedTimeRemaining);

  const [isDragOver, setIsDragOver] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [extractLogs]);

  const handleBrowseOutputDir = async () => {
    const { open } = await import("@tauri-apps/plugin-dialog");
    const selected = await open({ directory: true });
    if (selected) {
      setExtractOutputDir(selected as string);
    }
  };

  useEffect(() => {
    const unlisten = getCurrentWindow().onDragDropEvent((event) => {
      if (event.payload.type === "over") {
        setIsDragOver(true);
      } else if (event.payload.type === "leave") {
        setIsDragOver(false);
      } else if (event.payload.type === "drop") {
        setIsDragOver(false);
        const paths = event.payload.paths;
        const videoPath = paths.find((p) => {
          const ext = p.split(".").pop()?.toLowerCase() ?? "";
          return ["mp4", "avi", "mkv", "mov", "wmv", "flv", "webm"].includes(ext);
        });
        if (videoPath) {
          loadVideo(videoPath);
        }
      }
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, [loadVideo]);

  useEffect(() => {
    return () => {
      stopExtractWatcher();
    };
  }, [stopExtractWatcher]);

  function formatTime(seconds: number): string {
    if (seconds < 60) return `${seconds}秒`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${mins}分${secs}秒` : `${mins}分`;
  }

  return (
    <>
      {/* Left: Controls */}
      <div className="flex w-[280px] shrink-0 flex-col rounded-lg border border-border bg-panel">
        <div className="flex items-center border-b border-border px-3 py-2">
          <span className="text-xs font-medium text-muted-foreground">参数设置</span>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="space-y-4 p-3">
            {extractVideoInfo && (
              <div className="rounded border border-border bg-muted/30 p-2 text-xs">
                <div className="flex items-center gap-1 mb-1">
                  <Film size={12} className="text-muted-foreground" />
                  <span className="font-medium truncate">{extractVideoPath.split(/[/\\]/).pop()}</span>
                </div>
                <div className="grid grid-cols-2 gap-1 text-muted-foreground">
                  <span>分辨率: {extractVideoInfo.width}x{extractVideoInfo.height}</span>
                  <span>帧率: {extractVideoInfo.fps.toFixed(1)} fps</span>
                  <span>时长: {extractVideoInfo.duration.toFixed(1)}s</span>
                  <span>总帧数: {extractVideoInfo.totalFrames}</span>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">帧图存放路径</label>
              <div className="flex gap-1">
                <Input
                  className="h-8 text-sm flex-1"
                  value={extractOutputDir}
                  onChange={(e) => setExtractOutputDir(e.target.value)}
                  placeholder="选择或输入路径"
                />
                <Button variant="outline" size="sm" className="h-8 w-8 p-0 shrink-0" onClick={handleBrowseOutputDir}>
                  <FolderOpen size={14} />
                </Button>
              </div>
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
              disabled={!extractVideoPath || isExtracting}
              onClick={runExtractFrames}
            >
              {isExtracting ? (
                <>
                  <Loader2 size={14} className="mr-1 animate-spin" />
                  提取中 {extractProgress.toFixed(0)}%
                  {extractEstimatedTimeRemaining !== null && extractEstimatedTimeRemaining > 0 && (
                    <span className="ml-1">· 剩余 {formatTime(extractEstimatedTimeRemaining)}</span>
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
                  style={{ width: `${extractProgress}%` }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Logs */}
        <div className="h-[140px] shrink-0 border-t border-border">
          <div className="flex items-center border-b border-border px-3 py-1.5">
            <span className="text-xs font-medium text-muted-foreground">日志</span>
          </div>
          <div className="h-[calc(100%-28px)] overflow-y-auto p-2">
            {extractLogs.length > 0 ? (
              <>
                {extractLogs.map((log, i) => (
                  <div key={i} className="text-xs py-0.5">
                    <span className={log.level === 'error' ? 'text-destructive' : log.level === 'warn' ? 'text-yellow-500' : 'text-muted-foreground'}>
                      {log.message}
                    </span>
                  </div>
                ))}
                <div ref={logEndRef} />
              </>
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                暂无日志
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right: Frame grid */}
      <div className="flex flex-1 flex-col overflow-hidden rounded-lg border border-border bg-panel">
        <div className="flex items-center border-b border-border px-3 py-2">
          <span className="text-xs font-medium text-muted-foreground">
            {extractFrames.length > 0 ? `提取的帧 (${extractFrames.length})` : "视频抽帧"}
          </span>
        </div>

        <div
          className="relative flex-1 overflow-hidden"
          onDoubleClick={() => loadVideo()}
        >
          {errorMessage && (
            <div className="m-3 rounded border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {errorMessage}
            </div>
          )}

          {isDragOver && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-primary/10 border-2 border-dashed border-primary rounded-lg">
              <div className="flex flex-col items-center gap-2 text-primary">
                <Upload size={48} />
                <span className="text-sm font-medium">松开以加载视频</span>
              </div>
            </div>
          )}

          {extractFrames.length > 0 ? (
            extractSelectedFrame !== null && extractFrames[extractSelectedFrame] ? (
              <ResizablePanelGroup orientation="horizontal" className="h-full">
                <ResizablePanel defaultSize={60} minSize={30}>
                  <ScrollArea className="h-full">
                    <div className="flex flex-wrap justify-center gap-2 p-3">
                      {extractFrames.map((frame, i) => (
                        <div
                          key={frame.index}
                          className={`w-[100px] shrink-0 cursor-pointer overflow-hidden rounded border-2 transition-colors ${
                            extractSelectedFrame === i
                              ? "border-primary"
                              : "border-transparent hover:border-muted-foreground/30"
                          }`}
                          onClick={() => setExtractSelectedFrame(i)}
                        >
                          <img
                            src={convertFileSrc(frame.filePath)}
                            alt={`Frame ${frame.index}`}
                            className="aspect-video w-full object-cover"
                          />
                          <div className="bg-muted px-1 py-0.5 text-center text-[10px] text-muted-foreground">
                            {frame.timestamp.toFixed(2)}s
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </ResizablePanel>

                <ResizableHandle withHandle />

                <ResizablePanel defaultSize={40} minSize={20}>
                  <ScrollArea className="h-full">
                    <div className="p-3">
                      <img
                        src={convertFileSrc(extractFrames[extractSelectedFrame].filePath)}
                        alt={`Frame ${extractFrames[extractSelectedFrame].index}`}
                        className="w-full rounded border border-border"
                      />
                      <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                        <div>帧索引: {extractFrames[extractSelectedFrame].index}</div>
                        <div>时间戳: {extractFrames[extractSelectedFrame].timestamp.toFixed(3)}s</div>
                        <div>文件名: {extractFrames[extractSelectedFrame].filename}</div>
                      </div>
                    </div>
                  </ScrollArea>
                </ResizablePanel>
              </ResizablePanelGroup>
            ) : (
              <ScrollArea className="h-full">
                <div className="flex flex-wrap gap-2 p-3">
                  {extractFrames.map((frame, i) => (
                    <div
                      key={frame.index}
                      className={`w-[100px] shrink-0 cursor-pointer overflow-hidden rounded border-2 transition-colors ${
                        extractSelectedFrame === i
                          ? "border-primary"
                          : "border-transparent hover:border-muted-foreground/30"
                      }`}
                      onClick={() => setExtractSelectedFrame(i)}
                    >
                      <img
                        src={convertFileSrc(frame.filePath)}
                        alt={`Frame ${frame.index}`}
                        className="aspect-video w-full object-cover"
                      />
                      <div className="bg-muted px-1 py-0.5 text-center text-[10px] text-muted-foreground">
                        {frame.timestamp.toFixed(2)}s
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              {extractVideoPath ? "设置参数后点击\"提取帧\"" : "双击或拖拽视频文件到此处"}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
