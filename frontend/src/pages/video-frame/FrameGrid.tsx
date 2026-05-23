import { useCallback } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ResizablePanel,
  ResizablePanelGroup,
  ResizableHandle,
} from "@/components/ui/resizable";
import { convertFileSrc } from "@tauri-apps/api/core";
import { useVideoFrameStore } from "@/stores/videoFrameStore";

export function FrameGrid() {
  const videoPath = useVideoFrameStore((s) => s.videoPath);
  const frames = useVideoFrameStore((s) => s.frames);
  const errorMessage = useVideoFrameStore((s) => s.errorMessage);
  const selectedFrame = useVideoFrameStore((s) => s.selectedFrame);
  const setSelectedFrame = useVideoFrameStore((s) => s.setSelectedFrame);
  const loadVideo = useVideoFrameStore((s) => s.loadVideo);

  const handleDoubleClick = useCallback(async () => {
    await loadVideo();
  }, [loadVideo]);

  return (
    <div className="flex flex-1 flex-col overflow-hidden rounded-lg border border-border bg-panel">
      <div className="flex items-center border-b border-border px-3 py-2">
        <span className="text-xs font-medium text-muted-foreground">
          {frames.length > 0 ? `提取的帧 (${frames.length})` : "视频抽帧"}
        </span>
      </div>

      <div
        className="relative flex-1 overflow-hidden"
        onDoubleClick={handleDoubleClick}
      >
        {errorMessage && (
          <div className="m-3 rounded border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {errorMessage}
          </div>
        )}

        {frames.length > 0 ? (
          selectedFrame !== null && frames[selectedFrame] ? (
            <ResizablePanelGroup orientation="horizontal" className="h-full">
              <ResizablePanel defaultSize={60} minSize={30}>
                <ScrollArea className="h-full">
                  <div className="flex flex-wrap justify-center gap-2 p-3">
                    {frames.map((frame, i) => (
                      <FrameThumbnail
                        key={frame.index}
                        frame={frame}
                        isSelected={selectedFrame === i}
                        onClick={() => setSelectedFrame(i)}
                      />
                    ))}
                  </div>
                </ScrollArea>
              </ResizablePanel>

              <ResizableHandle withHandle />

              <ResizablePanel defaultSize={40} minSize={20}>
                <ScrollArea className="h-full">
                  <div className="p-3">
                    <img
                      src={convertFileSrc(frames[selectedFrame].filePath)}
                      alt={`Frame ${frames[selectedFrame].index}`}
                      className="w-full rounded border border-border"
                    />
                    <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                      <div>帧索引: {frames[selectedFrame].index}</div>
                      <div>时间戳: {frames[selectedFrame].timestamp.toFixed(3)}s</div>
                      <div>文件名: {frames[selectedFrame].filename}</div>
                    </div>
                  </div>
                </ScrollArea>
              </ResizablePanel>
            </ResizablePanelGroup>
          ) : (
            <ScrollArea className="h-full">
              <div className="flex flex-wrap gap-2 p-3">
                {frames.map((frame, i) => (
                  <FrameThumbnail
                    key={frame.index}
                    frame={frame}
                    isSelected={selectedFrame === i}
                    onClick={() => setSelectedFrame(i)}
                  />
                ))}
              </div>
            </ScrollArea>
          )
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            {videoPath ? "设置参数后点击\"提取帧\"" : "双击或拖拽视频文件到此处"}
          </div>
        )}
      </div>
    </div>
  );
}

interface FrameThumbnailProps {
  frame: { index: number; filePath: string; timestamp: number };
  isSelected: boolean;
  onClick: () => void;
}

function FrameThumbnail({ frame, isSelected, onClick }: FrameThumbnailProps) {
  return (
    <div
      className={`w-[100px] shrink-0 cursor-pointer overflow-hidden rounded border-2 transition-colors ${
        isSelected
          ? "border-primary"
          : "border-transparent hover:border-muted-foreground/30"
      }`}
      onClick={onClick}
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
  );
}
