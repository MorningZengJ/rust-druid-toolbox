import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  StopCircle,
  Trash2,
  Circle,
  Loader2,
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

export function TaskList() {
  const tasks = useLiveRecordStore((s) => s.tasks);
  const selectedTaskId = useLiveRecordStore((s) => s.selectedTaskId);
  const stopRecording = useLiveRecordStore((s) => s.stopRecording);
  const selectTask = useLiveRecordStore((s) => s.selectTask);
  const removeTask = useLiveRecordStore((s) => s.removeTask);

  const taskEntries = Object.entries(tasks);

  return (
    <>
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
    </>
  );
}
