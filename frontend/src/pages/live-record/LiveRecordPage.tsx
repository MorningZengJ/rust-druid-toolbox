import { useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
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
import { Badge } from "@/components/ui/badge";
import {
  FolderOpen,
  Radio,
  StopCircle,
  Plus,
  Trash2,
  Circle,
  Loader2,
  MonitorPlay,
} from "lucide-react";
import { useLiveRecordStore } from "@/stores/liveRecordStore";
import type { ContainerFormat } from "@/types";

function formatDuration(secs: number): string {
  if (secs < 60) return `${Math.floor(secs)}s`;
  const mins = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  if (mins < 60) return `${mins}:${s.toString().padStart(2, "0")}`;
  const hrs = Math.floor(mins / 60);
  const m = mins % 60;
  return `${hrs}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function statusBadge(status: string) {
  switch (status) {
    case "connecting":
      return (
        <Badge variant="outline" className="text-xs">
          <Loader2 size={10} className="mr-1 animate-spin" />
          连接中
        </Badge>
      );
    case "recording":
      return (
        <Badge variant="default" className="text-xs bg-red-600 hover:bg-red-700">
          <Circle size={8} className="mr-1 fill-current animate-pulse" />
          录制中
        </Badge>
      );
    case "stopping":
      return (
        <Badge variant="outline" className="text-xs">
          <Loader2 size={10} className="mr-1 animate-spin" />
          停止中
        </Badge>
      );
    case "stopped":
      return (
        <Badge variant="secondary" className="text-xs">
          已停止
        </Badge>
      );
    case "error":
      return (
        <Badge variant="destructive" className="text-xs">
          错误
        </Badge>
      );
    default:
      return null;
  }
}

export default function LiveRecordPage() {
  const tasks = useLiveRecordStore((s) => s.tasks);
  const selectedTaskId = useLiveRecordStore((s) => s.selectedTaskId);
  const newRecordParams = useLiveRecordStore((s) => s.newRecordParams);
  const errorMessage = useLiveRecordStore((s) => s.errorMessage);
  const setNewRecordParams = useLiveRecordStore((s) => s.setNewRecordParams);
  const startRecording = useLiveRecordStore((s) => s.startRecording);
  const stopRecording = useLiveRecordStore((s) => s.stopRecording);
  const selectTask = useLiveRecordStore((s) => s.selectTask);
  const removeTask = useLiveRecordStore((s) => s.removeTask);
  const registerEventListeners = useLiveRecordStore(
    (s) => s.registerEventListeners
  );
  const unregisterEventListeners = useLiveRecordStore(
    (s) => s.unregisterEventListeners
  );
  const clearError = useLiveRecordStore((s) => s.clearError);

  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    registerEventListeners();
    return () => {
      unregisterEventListeners();
    };
  }, [registerEventListeners, unregisterEventListeners]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [tasks, selectedTaskId]);

  const handleBrowseOutputDir = useCallback(async () => {
    const { open } = await import("@tauri-apps/plugin-dialog");
    const selected = await open({ directory: true });
    if (selected) {
      setNewRecordParams({ outputDir: selected as string });
    }
  }, [setNewRecordParams]);

  const selectedTask =
    selectedTaskId ? tasks[selectedTaskId] ?? null : null;

  const taskEntries = Object.entries(tasks);
  const hasActiveTasks = taskEntries.some(
    ([, t]) =>
      t.info.status === "recording" || t.info.status === "connecting"
  );

  return (
    <div className="flex h-full gap-3">
      {/* Left Panel */}
      <div className="flex w-[320px] shrink-0 flex-col rounded-lg border border-border bg-panel">
        {/* New Recording Form */}
        <div className="border-b border-border px-3 py-2">
          <span className="text-xs font-medium text-muted-foreground">
            新建录制
          </span>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="space-y-3 p-3">
            {/* URL */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                直播源 URL
              </label>
              <Input
                className="h-8 text-sm"
                placeholder="https://... / rtmp://... / rtsp://..."
                value={newRecordParams.url}
                onChange={(e) => {
                  clearError();
                  setNewRecordParams({ url: e.target.value });
                }}
              />
            </div>

            {/* Output dir */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                输出目录
              </label>
              <div className="flex gap-1">
                <Input
                  className="h-8 text-sm flex-1"
                  value={newRecordParams.outputDir}
                  onChange={(e) =>
                    setNewRecordParams({ outputDir: e.target.value })
                  }
                  placeholder="选择或输入路径"
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0 shrink-0"
                  onClick={handleBrowseOutputDir}
                >
                  <FolderOpen size={14} />
                </Button>
              </div>
            </div>

            {/* Filename prefix */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                文件名前缀
              </label>
              <Input
                className="h-8 text-sm"
                value={newRecordParams.filenamePrefix}
                onChange={(e) =>
                  setNewRecordParams({ filenamePrefix: e.target.value })
                }
                placeholder="recording"
              />
            </div>

            {/* Container format */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                容器格式
              </label>
              <Select
                value={newRecordParams.containerFormat}
                onValueChange={(v) =>
                  setNewRecordParams({ containerFormat: v as ContainerFormat })
                }
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ts">TS（推荐）</SelectItem>
                  <SelectItem value="mkv">MKV</SelectItem>
                  <SelectItem value="mp4">MP4</SelectItem>
                  <SelectItem value="flv">FLV</SelectItem>
                </SelectContent>
              </Select>
              {newRecordParams.containerFormat === "mp4" && (
                <p className="text-[10px] text-amber-500">
                  MP4 格式在异常中断时文件可能不可用，推荐 TS 或 MKV
                </p>
              )}
            </div>

            {/* Stream copy toggle */}
            <div className="flex items-center gap-2">
              <Checkbox
                id="stream-copy"
                checked={newRecordParams.streamCopy}
                onCheckedChange={(checked) =>
                  setNewRecordParams({ streamCopy: !!checked })
                }
              />
              <label
                htmlFor="stream-copy"
                className="text-xs font-medium text-muted-foreground cursor-pointer"
              >
                流复制（不重新编码）
              </label>
            </div>

            {/* Segment duration */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                分段时长（秒，留空不分段）
              </label>
              <Input
                type="number"
                className="h-8 text-sm"
                placeholder="300 = 5分钟"
                value={newRecordParams.segmentDurationSecs ?? ""}
                onChange={(e) => {
                  const val = e.target.value
                    ? parseInt(e.target.value)
                    : null;
                  setNewRecordParams({
                    segmentDurationSecs: val && val > 0 ? val : null,
                  });
                }}
              />
            </div>

            {/* Preview toggle */}
            <div className="flex items-center gap-2">
              <Checkbox
                id="preview-enabled"
                checked={newRecordParams.previewEnabled}
                onCheckedChange={(checked) =>
                  setNewRecordParams({ previewEnabled: !!checked })
                }
              />
              <label
                htmlFor="preview-enabled"
                className="text-xs font-medium text-muted-foreground cursor-pointer"
              >
                实时预览
              </label>
            </div>

            {/* Error message */}
            {errorMessage && (
              <div className="rounded border border-destructive/50 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {errorMessage}
              </div>
            )}

            {/* Start button */}
            <Button
              className="w-full"
              onClick={startRecording}
              disabled={!newRecordParams.url || !newRecordParams.outputDir}
            >
              <Plus size={14} className="mr-1" />
              开始录制
            </Button>
          </div>
        </div>

        {/* Task List */}
        <div className="border-t border-border px-3 py-2">
          <span className="text-xs font-medium text-muted-foreground">
            录制任务 ({taskEntries.length})
          </span>
        </div>

        <div className="h-[200px] shrink-0 border-b border-border">
          <ScrollArea className="h-full">
            <div className="space-y-1 p-2">
              {taskEntries.length > 0 ? (
                taskEntries.map(([id, task]) => (
                  <div
                    key={id}
                    className={`cursor-pointer rounded border p-2 text-xs transition-colors ${
                      selectedTaskId === id
                        ? "border-primary bg-primary/5"
                        : "border-transparent hover:bg-muted/50"
                    }`}
                    onClick={() => selectTask(id)}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="truncate font-medium flex-1">
                        {task.info.url.split(/[/\\]/).pop() || task.info.url}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        {statusBadge(task.info.status)}
                        {(task.info.status === "stopped" ||
                          task.info.status === "error") && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 w-5 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeTask(id);
                            }}
                          >
                            <Trash2 size={10} />
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-muted-foreground">
                      {task.progress && (
                        <>
                          <span>
                            {formatDuration(task.progress.durationSecs)}
                          </span>
                          <span>{formatSize(task.progress.fileSizeBytes)}</span>
                          {task.progress.bitrateKbps > 0 && (
                            <span>
                              {task.progress.bitrateKbps.toFixed(0)} kbps
                            </span>
                          )}
                        </>
                      )}
                      {(task.info.status === "recording" ||
                        task.info.status === "connecting") && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 px-1 ml-auto text-destructive hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            stopRecording(id);
                          }}
                        >
                          <StopCircle size={12} className="mr-0.5" />
                          停止
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex h-full items-center justify-center py-8 text-xs text-muted-foreground">
                  暂无录制任务
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Logs */}
        <div className="h-[140px] shrink-0">
          <div className="flex items-center border-b border-border px-3 py-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              日志
            </span>
          </div>
          <div className="h-[calc(100%-28px)] overflow-y-auto p-2">
            {selectedTask && selectedTask.logs.length > 0 ? (
              <>
                {selectedTask.logs.map((log: { level: string; message: string }, i: number) => (
                  <div key={i} className="text-xs py-0.5">
                    <span
                      className={
                        log.level === "error"
                          ? "text-destructive"
                          : log.level === "warn"
                            ? "text-warning"
                            : "text-muted-foreground"
                      }
                    >
                      {log.message}
                    </span>
                  </div>
                ))}
                <div ref={logEndRef} />
              </>
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                {selectedTask ? "暂无日志" : "选择任务查看日志"}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Panel: Preview */}
      <div className="flex flex-1 flex-col overflow-hidden rounded-lg border border-border bg-panel">
        <div className="flex items-center border-b border-border px-3 py-2">
          <span className="text-xs font-medium text-muted-foreground">
            {selectedTask
              ? `实时预览 - ${selectedTask.info.url}`
              : "实时预览"}
          </span>
          {selectedTask &&
            (selectedTask.info.status === "recording" ||
              selectedTask.info.status === "connecting") && (
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto h-6 text-destructive hover:text-destructive"
                onClick={() => stopRecording(selectedTaskId!)}
              >
                <StopCircle size={12} className="mr-1" />
                停止
              </Button>
            )}
        </div>

        <div className="relative flex-1 overflow-hidden">
          {selectedTask ? (
            <>
              {/* Preview image */}
              {selectedTask.previewObjectUrl ? (
                <img
                  src={selectedTask.previewObjectUrl}
                  alt="Live preview"
                  className="h-full w-full object-contain"
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  {selectedTask.info.status === "connecting" ? (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Loader2
                        size={32}
                        className="animate-spin text-primary"
                      />
                      <span className="text-sm">正在连接...</span>
                    </div>
                  ) : selectedTask.info.status === "recording" ? (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Radio
                        size={32}
                        className="text-red-500 animate-pulse"
                      />
                      <span className="text-sm">
                        录制中，等待预览画面...
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <MonitorPlay size={32} />
                      <span className="text-sm">
                        {selectedTask.info.status === "stopped"
                          ? "录制已停止"
                          : "录制出错"}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Info overlay */}
              {selectedTask.progress && (
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-3 py-1.5 text-xs text-white flex items-center gap-4">
                  <span>
                    时长: {formatDuration(selectedTask.progress.durationSecs)}
                  </span>
                  <span>
                    大小:{" "}
                    {formatSize(selectedTask.progress.fileSizeBytes)}
                  </span>
                  {selectedTask.progress.bitrateKbps > 0 && (
                    <span>
                      码率: {selectedTask.progress.bitrateKbps.toFixed(0)}{" "}
                      kbps
                    </span>
                  )}
                  {selectedTask.progress.currentSegment > 1 && (
                    <span>
                      分段: {selectedTask.progress.currentSegment}
                    </span>
                  )}
                  <span className="ml-auto truncate max-w-[300px]">
                    {selectedTask.progress.outputPath.split(/[/\\]/).pop()}
                  </span>
                </div>
              )}
            </>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              {hasActiveTasks
                ? "从左侧选择任务查看预览"
                : "配置参数后点击「开始录制」"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
