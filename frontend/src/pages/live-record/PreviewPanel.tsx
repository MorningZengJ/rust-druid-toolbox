import { Button } from "@/components/ui/button";
import {
  Radio,
  Loader2,
  MonitorPlay,
  StopCircle,
} from "lucide-react";
import { useLiveRecordStore } from "@/stores/liveRecordStore";

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

export function PreviewPanel() {
  const tasks = useLiveRecordStore((s) => s.tasks);
  const selectedTaskId = useLiveRecordStore((s) => s.selectedTaskId);
  const stopRecording = useLiveRecordStore((s) => s.stopRecording);

  const selectedTask =
    selectedTaskId ? tasks[selectedTaskId] ?? null : null;

  const taskEntries = Object.entries(tasks);
  const hasActiveTasks = taskEntries.some(
    ([, t]) =>
      t.info.status === "recording" || t.info.status === "connecting"
  );

  return (
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
  );
}
