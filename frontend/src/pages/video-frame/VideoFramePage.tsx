import { useCallback, useEffect, useMemo, useState } from "react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  FolderOpen,
  Play,
  Download,
  Loader2,
  AlertTriangle,
  Film,
  Upload,
} from "lucide-react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useVideoFrameStore } from "@/stores/videoFrameStore";
import type { ExtractMode, OutputFormat } from "@/types";

const VIDEO_EXTENSIONS = ["mp4", "avi", "mkv", "mov", "wmv", "flv", "webm"];

export default function VideoFramePage() {
  const videoPath = useVideoFrameStore((s) => s.videoPath);
  const videoInfo = useVideoFrameStore((s) => s.videoInfo);
  const ffmpegAvailable = useVideoFrameStore((s) => s.ffmpegAvailable);
  const extractParams = useVideoFrameStore((s) => s.extractParams);
  const setExtractParams = useVideoFrameStore((s) => s.setExtractParams);
  const frames = useVideoFrameStore((s) => s.frames);
  const isExtracting = useVideoFrameStore((s) => s.isExtracting);
  const progress = useVideoFrameStore((s) => s.progress);
  const errorMessage = useVideoFrameStore((s) => s.errorMessage);
  const selectedFrame = useVideoFrameStore((s) => s.selectedFrame);
  const setSelectedFrame = useVideoFrameStore((s) => s.setSelectedFrame);
  const checkFfmpeg = useVideoFrameStore((s) => s.checkFfmpeg);
  const loadVideo = useVideoFrameStore((s) => s.loadVideo);
  const extractFrames = useVideoFrameStore((s) => s.extractFrames);
  const exportFrames = useVideoFrameStore((s) => s.exportFrames);
  const outputDir = useVideoFrameStore((s) => s.outputDir);
  const setOutputDir = useVideoFrameStore((s) => s.setOutputDir);

  const [isDragOver, setIsDragOver] = useState(false);

  const handleBrowseOutputDir = useCallback(async () => {
    const { open } = await import("@tauri-apps/plugin-dialog");
    const selected = await open({ directory: true });
    if (selected) {
      setOutputDir(selected as string);
    }
  }, [setOutputDir]);

  // Tauri native file drag & drop
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
          return VIDEO_EXTENSIONS.includes(ext);
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

  const handleDoubleClick = useCallback(async () => {
    await loadVideo();
  }, [loadVideo]);

  useEffect(() => {
    checkFfmpeg();
  }, [checkFfmpeg]);

  // Create blob URLs for frame thumbnails
  const frameUrls = useMemo(() => {
    return frames.map((frame) => {
      const blob = new Blob([new Uint8Array(frame.imageData) as unknown as BlobPart], {
        type: "image/png",
      });
      return URL.createObjectURL(blob);
    });
  }, [frames]);

  // Cleanup blob URLs
  useEffect(() => {
    return () => {
      frameUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [frameUrls]);

  if (!ffmpegAvailable) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <AlertTriangle size={48} className="text-warning" />
        <h2 className="text-lg font-semibold">FFmpeg 未安装</h2>
        <p className="text-sm text-muted-foreground">
          视频抽帧功能需要 FFmpeg，请先安装 FFmpeg 并确保其在系统 PATH 中。
        </p>
        <Button variant="outline" onClick={checkFfmpeg}>
          重新检测
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-full gap-3">
      {/* Left: Controls */}
      <div className="flex w-[280px] shrink-0 flex-col rounded-lg border border-border bg-panel">
        <div className="flex items-center border-b border-border px-3 py-2">
          <span className="text-xs font-medium text-muted-foreground">参数设置</span>
        </div>

        <ScrollArea className="flex-1">
          <div className="space-y-4 p-3">
            {/* Video info */}
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

            {/* Output dir */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">帧图存放路径</label>
              <div className="flex gap-1">
                <Input
                  className="h-8 text-sm flex-1"
                  value={outputDir}
                  onChange={(e) => setOutputDir(e.target.value)}
                  placeholder="选择或输入路径"
                />
                <Button variant="outline" size="sm" className="h-8 w-8 p-0 shrink-0" onClick={handleBrowseOutputDir}>
                  <FolderOpen size={14} />
                </Button>
              </div>
            </div>

            {/* Extract mode */}
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

            {/* Mode-specific params */}
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

            {/* Output format */}
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

            {/* JPEG quality */}
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

            {/* Resize width */}
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

            {/* Extract button */}
            <Button
              className="w-full"
              disabled={!videoPath || isExtracting}
              onClick={extractFrames}
            >
              {isExtracting ? (
                <>
                  <Loader2 size={14} className="mr-1 animate-spin" />
                  提取中 {progress.toFixed(0)}%
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
        </ScrollArea>
      </div>

      {/* Right: Frame grid */}
      <div className="flex flex-1 flex-col overflow-hidden rounded-lg border border-border bg-panel">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <span className="text-xs font-medium text-muted-foreground">
            {frames.length > 0 ? `提取的帧 (${frames.length})` : "视频抽帧"}
          </span>
          {frames.length > 0 && (
            <Button variant="ghost" size="sm" className="h-7" onClick={exportFrames}>
              <Download size={14} className="mr-1" />
              导出全部
            </Button>
          )}
        </div>

        {/* Content */}
        <div
          className="relative flex-1 overflow-hidden"
          onDoubleClick={handleDoubleClick}
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

          {frames.length > 0 ? (
            <div className="flex h-full">
              {/* Frame grid */}
              <ScrollArea className="flex-1">
                <div className="grid grid-cols-4 gap-2 p-3 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8">
                  {frames.map((frame, i) => (
                    <div
                      key={frame.index}
                      className={`cursor-pointer overflow-hidden rounded border-2 transition-colors ${
                        selectedFrame === i
                          ? "border-primary"
                          : "border-transparent hover:border-muted-foreground/30"
                      }`}
                      onClick={() => setSelectedFrame(i)}
                    >
                      <img
                        src={frameUrls[i]}
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

              {/* Selected frame preview */}
              {selectedFrame !== null && frames[selectedFrame] && (
                <div className="w-[300px] shrink-0 border-l border-border p-3">
                  <img
                    src={frameUrls[selectedFrame]}
                    alt={`Frame ${frames[selectedFrame].index}`}
                    className="w-full rounded border border-border"
                  />
                  <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                    <div>帧索引: {frames[selectedFrame].index}</div>
                    <div>时间戳: {frames[selectedFrame].timestamp.toFixed(3)}s</div>
                    <div>文件名: {frames[selectedFrame].filename}</div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              {videoPath ? "设置参数后点击\"提取帧\"" : "双击或拖拽视频文件到此处"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
