import { AlertCircle, CheckCircle2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useVideoToolStore } from "@/stores/videoToolStore";

export function ProgressPanel() {
  const isProcessing = useVideoToolStore((s) => s.isProcessing);
  const progress = useVideoToolStore((s) => s.progress);
  const logs = useVideoToolStore((s) => s.logs);
  const errorMessage = useVideoToolStore((s) => s.errorMessage);

  return (
    <div className="flex flex-1 flex-col rounded-lg border border-border bg-panel">
      <div className="border-b border-border px-4 py-2">
        <h3 className="text-sm font-medium">进度</h3>
      </div>
      <div className="p-4">
        {isProcessing && (
          <div className="mb-4">
            <div className="mb-1 flex items-center justify-between text-xs">
              <span>处理中...</span>
              <span>{Math.round(progress * 100)}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="mb-4 flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {errorMessage}
          </div>
        )}

        {!isProcessing && progress >= 1 && !errorMessage && (
          <div className="mb-4 flex items-center gap-2 rounded-md bg-green-500/10 px-3 py-2 text-sm text-green-600">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            处理完成
          </div>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col border-t border-border">
        <div className="px-4 py-2">
          <h3 className="text-sm font-medium">日志</h3>
        </div>
        <ScrollArea className="flex-1 px-4 pb-4">
          <div className="space-y-1 font-mono text-xs">
            {logs.map((log, i) => (
              <div
                key={i}
                className={
                  log.level === "error"
                    ? "text-destructive"
                    : log.level === "warn"
                      ? "text-yellow-500"
                      : "text-muted-foreground"
                }
              >
                {log.message}
              </div>
            ))}
            {logs.length === 0 && (
              <div className="text-muted-foreground">等待操作...</div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
