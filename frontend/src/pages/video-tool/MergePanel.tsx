import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Plus,
  Trash2,
  Play,
  FolderOpen,
  Loader2,
} from "lucide-react";
import { useVideoToolStore } from "@/stores/videoToolStore";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { VIDEO_EXTENSIONS, VIDEO_FORMATS } from "./constants";
import { ProgressPanel } from "./ProgressPanel";
import { Upload } from "lucide-react";

export function MergePanel() {
  const mergeInputPaths = useVideoToolStore((s) => s.mergeInputPaths);
  const mergeOutputPath = useVideoToolStore((s) => s.mergeOutputPath);
  const mergeOutputFormat = useVideoToolStore((s) => s.mergeOutputFormat);
  const mergeReencode = useVideoToolStore((s) => s.mergeReencode);
  const isProcessing = useVideoToolStore((s) => s.isProcessing);
  const setMergeInputs = useVideoToolStore((s) => s.setMergeInputs);
  const setMergeOutputPath = useVideoToolStore((s) => s.setMergeOutputPath);
  const setMergeOutputFormat = useVideoToolStore((s) => s.setMergeOutputFormat);
  const setMergeReencode = useVideoToolStore((s) => s.setMergeReencode);
  const runMerge = useVideoToolStore((s) => s.runMerge);
  const [isDragOver, setIsDragOver] = useState(false);

  useEffect(() => {
    const unlisten = getCurrentWindow().onDragDropEvent((event) => {
      if (event.payload.type === "over") {
        setIsDragOver(true);
      } else if (event.payload.type === "leave") {
        setIsDragOver(false);
      } else if (event.payload.type === "drop") {
        setIsDragOver(false);
        const videoFiles = event.payload.paths.filter((p) => {
          const ext = p.split(".").pop()?.toLowerCase() ?? "";
          return VIDEO_EXTENSIONS.includes(ext);
        });
        if (videoFiles.length > 0) {
          setMergeInputs([...mergeInputPaths, ...videoFiles]);
        }
      }
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, [mergeInputPaths, setMergeInputs]);

  const addFiles = async () => {
    const { open } = await import("@tauri-apps/plugin-dialog");
    const selected = await open({
      multiple: true,
      filters: [
        {
          name: "视频文件",
          extensions: VIDEO_EXTENSIONS,
        },
      ],
    });
    if (selected) {
      const paths = Array.isArray(selected) ? selected : [selected];
      setMergeInputs([...mergeInputPaths, ...paths]);
    }
  };

  const removeFile = (index: number) => {
    setMergeInputs(mergeInputPaths.filter((_, i) => i !== index));
  };

  const moveFile = (from: number, to: number) => {
    const newPaths = [...mergeInputPaths];
    const [item] = newPaths.splice(from, 1);
    newPaths.splice(to, 0, item);
    setMergeInputs(newPaths);
  };

  const selectOutput = async () => {
    const { save } = await import("@tauri-apps/plugin-dialog");
    const path = await save({
      filters: [
        {
          name: "视频文件",
          extensions: [mergeOutputFormat],
        },
      ],
    });
    if (path) setMergeOutputPath(path);
  };

  return (
    <>
      <div className="relative flex w-[320px] flex-col rounded-lg border border-border bg-panel">
        {isDragOver && (
          <div className="absolute inset-0 z-50 flex items-center justify-center rounded-lg border-2 border-dashed border-primary bg-primary/10">
            <div className="flex flex-col items-center gap-2 text-primary">
              <Upload className="h-8 w-8" />
              <span className="text-sm font-medium">释放文件以添加</span>
            </div>
          </div>
        )}
        <div className="border-b border-border px-4 py-2">
          <h3 className="text-sm font-medium">合并视频</h3>
        </div>

        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm font-medium">输入文件 ({mergeInputPaths.length})</label>
                <Button size="sm" variant="outline" onClick={addFiles}>
                  <Plus className="mr-1 h-3 w-3" />
                  添加
                </Button>
              </div>
              <ScrollArea className="max-h-[240px]">
                <div className="space-y-1 pr-3">
                  {mergeInputPaths.map((path, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-1 rounded bg-muted px-2 py-1 text-xs"
                    >
                      <span className="flex-1 truncate">
                        {path.split(/[/\\]/).pop()}
                      </span>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-5 w-5 shrink-0"
                        onClick={() => i > 0 && moveFile(i, i - 1)}
                        disabled={i === 0}
                      >
                        ↑
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-5 w-5 shrink-0"
                        onClick={() =>
                          i < mergeInputPaths.length - 1 && moveFile(i, i + 1)
                        }
                        disabled={i === mergeInputPaths.length - 1}
                      >
                        ↓
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-5 w-5 shrink-0 text-destructive"
                        onClick={() => removeFile(i)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                  {mergeInputPaths.length === 0 && (
                    <div className="rounded border border-dashed border-muted-foreground/30 px-4 py-8 text-center text-xs text-muted-foreground">
                      拖拽视频文件到此处，或点击"添加"
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>

            <div>
              <label className="text-sm font-medium">输出格式</label>
              <Select
                value={mergeOutputFormat}
                onValueChange={setMergeOutputFormat}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VIDEO_FORMATS.map((fmt) => (
                    <SelectItem key={fmt} value={fmt}>
                      {fmt.toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                checked={mergeReencode}
                onCheckedChange={(v) => setMergeReencode(v === true)}
              />
              <label className="text-xs">重编码模式（处理不同编码格式，速度较慢）</label>
            </div>

            <div>
              <label className="text-sm font-medium">输出路径</label>
              <div className="mt-1 flex gap-2">
                <Input
                  value={mergeOutputPath}
                  onChange={(e) => setMergeOutputPath(e.target.value)}
                  placeholder="选择输出文件路径"
                  className="flex-1 text-xs"
                />
                <Button size="icon" variant="outline" onClick={selectOutput}>
                  <FolderOpen className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <Button
              className="w-full"
              onClick={runMerge}
              disabled={isProcessing || mergeInputPaths.length < 2}
            >
              {isProcessing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Play className="mr-2 h-4 w-4" />
              )}
              合并
            </Button>
          </div>
        </ScrollArea>
      </div>

      <ProgressPanel />
    </>
  );
}
