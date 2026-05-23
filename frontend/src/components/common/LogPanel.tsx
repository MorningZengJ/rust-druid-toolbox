import { useEffect, useRef } from "react";

interface LogEntry {
  level: string;
  message: string;
}

interface LogPanelProps {
  logs: LogEntry[];
  height?: string;
}

export function LogPanel({ logs, height = "h-[140px]" }: LogPanelProps) {
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  return (
    <div className={`${height} shrink-0 border-t border-border`}>
      <div className="flex items-center border-b border-border px-3 py-1.5">
        <span className="text-xs font-medium text-muted-foreground">日志</span>
      </div>
      <div className="h-[calc(100%-28px)] overflow-y-auto p-2">
        {logs.length > 0 ? (
          <>
            {logs.map((log, i) => (
              <div key={i} className="text-xs py-0.5">
                <span
                  className={
                    log.level === "error"
                      ? "text-destructive"
                      : log.level === "warn"
                        ? "text-yellow-500"
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
            暂无日志
          </div>
        )}
      </div>
    </div>
  );
}
