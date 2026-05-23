import { useEffect } from "react";
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
  Trash2,
  Play,
  FolderOpen,
  Music,
  Loader2,
} from "lucide-react";
import { useVideoToolStore } from "@/stores/videoToolStore";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { ProgressPanel } from "./ProgressPanel";

export function ImagesPanel() {
  const imagesFolderPath = useVideoToolStore((s) => s.imagesFolderPath);
  const imagesInputPaths = useVideoToolStore((s) => s.imagesInputPaths);
  const imagesOutputPath = useVideoToolStore((s) => s.imagesOutputPath);
  const imagesFps = useVideoToolStore((s) => s.imagesFps);
  const imagesOutputFormat = useVideoToolStore((s) => s.imagesOutputFormat);
  const imagesResolution = useVideoToolStore((s) => s.imagesResolution);
  const imagesAudioPath = useVideoToolStore((s) => s.imagesAudioPath);
  const isProcessing = useVideoToolStore((s) => s.isProcessing);
  const loadImagesFromFolder = useVideoToolStore((s) => s.loadImagesFromFolder);
  const setImagesOutputPath = useVideoToolStore((s) => s.setImagesOutputPath);
  const setImagesFps = useVideoToolStore((s) => s.setImagesFps);
  const setImagesOutputFormat = useVideoToolStore((s) => s.setImagesOutputFormat);
  const setImagesResolution = useVideoToolStore((s) => s.setImagesResolution);
  const setImagesAudioPath = useVideoToolStore((s) => s.setImagesAudioPath);
  const runImagesToVideo = useVideoToolStore((s) => s.runImagesToVideo);
  useEffect(() => {
    const unlisten = getCurrentWindow().onDragDropEvent((event) => {
      if (event.payload.type === "drop") {
        const droppedPath = event.payload.paths[0];
        if (droppedPath) {
          loadImagesFromFolder(droppedPath);
        }
      }
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, [loadImagesFromFolder]);

  const selectFolder = async () => {
    await loadImagesFromFolder();
  };

  const selectAudio = async () => {
    const { open } = await import("@tauri-apps/plugin-dialog");
    const selected = await open({
      filters: [
        {
          name: "音频文件",
          extensions: ["mp3", "aac", "wav", "flac", "ogg", "opus"],
        },
      ],
    });
    if (selected) {
      setImagesAudioPath(Array.isArray(selected) ? selected[0] : selected);
    }
  };

  const selectOutput = async () => {
    const { save } = await import("@tauri-apps/plugin-dialog");
    const path = await save({
      filters: [
        {
          name: "视频文件",
          extensions: [imagesOutputFormat],
        },
      ],
    });
    if (path) setImagesOutputPath(path);
  };

  return (
    <>
      <div className="relative flex w-[320px] flex-col rounded-lg border border-border bg-panel">
        <div className="border-b border-border px-4 py-2">
          <h3 className="text-sm font-medium">图片转视频</h3>
        </div>

        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">图片文件夹</label>
              <div className="mt-1">
                {imagesFolderPath ? (
                  <div className="rounded-md border border-border bg-muted/30 p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <FolderOpen className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-xs truncate flex-1" title={imagesFolderPath}>
                        {imagesFolderPath.split(/[/\\]/).pop() || imagesFolderPath}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      已加载 {imagesInputPaths.length} 张图片
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-2 w-full"
                      onClick={selectFolder}
                    >
                      更换文件夹
                    </Button>
                  </div>
                ) : (
                  <div
                    className="rounded border border-dashed border-muted-foreground/30 px-4 py-8 text-center text-xs text-muted-foreground cursor-pointer hover:border-muted-foreground/50 transition-colors"
                    onClick={selectFolder}
                  >
                    拖拽文件夹到此处，或点击选择
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">FPS</label>
              <Input
                type="number"
                value={imagesFps}
                onChange={(e) => setImagesFps(Number(e.target.value) || 24)}
                min={1}
                max={60}
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-medium">输出格式</label>
              <Select
                value={imagesOutputFormat}
                onValueChange={setImagesOutputFormat}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mp4">MP4</SelectItem>
                  <SelectItem value="mkv">MKV</SelectItem>
                  <SelectItem value="gif">GIF</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <div className="mb-2 flex items-center gap-2">
                <Checkbox
                  checked={imagesResolution !== null}
                  onCheckedChange={(v) =>
                    setImagesResolution(v ? [1920, 1080] : null)
                  }
                />
                <label className="text-sm font-medium">自定义分辨率</label>
              </div>
              {imagesResolution && (
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={imagesResolution[0]}
                    onChange={(e) =>
                      setImagesResolution([
                        Number(e.target.value) || 1920,
                        imagesResolution[1],
                      ])
                    }
                    placeholder="宽"
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    value={imagesResolution[1]}
                    onChange={(e) =>
                      setImagesResolution([
                        imagesResolution[0],
                        Number(e.target.value) || 1080,
                      ])
                    }
                    placeholder="高"
                    className="flex-1"
                  />
                </div>
              )}
            </div>

            <div>
              <label className="text-sm font-medium">背景音频（可选）</label>
              <div className="mt-1 flex gap-2">
                <Input
                  value={imagesAudioPath || ""}
                  readOnly
                  placeholder="选择音频文件"
                  className="flex-1 text-xs"
                />
                <Button size="icon" variant="outline" onClick={selectAudio}>
                  <Music className="h-4 w-4" />
                </Button>
                {imagesAudioPath && (
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => setImagesAudioPath(null)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">输出路径</label>
              <div className="mt-1 flex gap-2">
                <Input
                  value={imagesOutputPath}
                  onChange={(e) => setImagesOutputPath(e.target.value)}
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
              onClick={runImagesToVideo}
              disabled={isProcessing || imagesInputPaths.length === 0}
            >
              {isProcessing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Play className="mr-2 h-4 w-4" />
              )}
              生成视频
            </Button>
          </div>
        </ScrollArea>
      </div>

      <ProgressPanel />
    </>
  );
}
