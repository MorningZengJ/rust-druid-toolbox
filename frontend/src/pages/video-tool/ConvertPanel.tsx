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
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Play,
  FileVideo,
  Music,
  FolderOpen,
  Loader2,
} from "lucide-react";
import { useVideoToolStore } from "@/stores/videoToolStore";
import { getCurrentWindow } from "@tauri-apps/api/window";
import {
  VIDEO_FORMATS,
  AUDIO_FORMATS,
  AUDIO_BITRATES,
  MEDIA_EXTENSIONS,
} from "./constants";
import { ProgressPanel } from "./ProgressPanel";
import { Upload } from "lucide-react";

export function ConvertPanel() {
  const convertInputPath = useVideoToolStore((s) => s.convertInputPath);
  const convertOutputPath = useVideoToolStore((s) => s.convertOutputPath);
  const convertTarget = useVideoToolStore((s) => s.convertTarget);
  const convertVideoFormat = useVideoToolStore((s) => s.convertVideoFormat);
  const convertAudioFormat = useVideoToolStore((s) => s.convertAudioFormat);
  const convertAudioBitrate = useVideoToolStore((s) => s.convertAudioBitrate);
  const convertVideoBitrate = useVideoToolStore((s) => s.convertVideoBitrate);
  const isProcessing = useVideoToolStore((s) => s.isProcessing);
  const setConvertInputPath = useVideoToolStore((s) => s.setConvertInputPath);
  const setConvertOutputPath = useVideoToolStore((s) => s.setConvertOutputPath);
  const setConvertTarget = useVideoToolStore((s) => s.setConvertTarget);
  const setConvertVideoFormat = useVideoToolStore((s) => s.setConvertVideoFormat);
  const setConvertAudioFormat = useVideoToolStore((s) => s.setConvertAudioFormat);
  const setConvertAudioBitrate = useVideoToolStore((s) => s.setConvertAudioBitrate);
  const setConvertVideoBitrate = useVideoToolStore((s) => s.setConvertVideoBitrate);
  const runConvert = useVideoToolStore((s) => s.runConvert);
  const [isDragOver, setIsDragOver] = useState(false);

  useEffect(() => {
    const unlisten = getCurrentWindow().onDragDropEvent((event) => {
      if (event.payload.type === "over") {
        setIsDragOver(true);
      } else if (event.payload.type === "leave") {
        setIsDragOver(false);
      } else if (event.payload.type === "drop") {
        setIsDragOver(false);
        const mediaFile = event.payload.paths.find((p) => {
          const ext = p.split(".").pop()?.toLowerCase() ?? "";
          return MEDIA_EXTENSIONS.includes(ext);
        });
        if (mediaFile) {
          setConvertInputPath(mediaFile);
          const ext =
            convertTarget === "video" ? convertVideoFormat : convertAudioFormat;
          const base = mediaFile.replace(/\.[^.]+$/, "");
          setConvertOutputPath(`${base}_converted.${ext}`);
        }
      }
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, [convertTarget, convertVideoFormat, convertAudioFormat, setConvertInputPath, setConvertOutputPath]);

  const selectInput = async () => {
    const { open } = await import("@tauri-apps/plugin-dialog");
    const selected = await open({
      filters: [
        {
          name: "媒体文件",
          extensions: MEDIA_EXTENSIONS,
        },
      ],
    });
    if (selected) {
      const path = Array.isArray(selected) ? selected[0] : selected;
      setConvertInputPath(path);
      const ext =
        convertTarget === "video" ? convertVideoFormat : convertAudioFormat;
      const base = path.replace(/\.[^.]+$/, "");
      setConvertOutputPath(`${base}_converted.${ext}`);
    }
  };

  const selectOutput = async () => {
    const { save } = await import("@tauri-apps/plugin-dialog");
    const ext =
      convertTarget === "video" ? convertVideoFormat : convertAudioFormat;
    const path = await save({
      filters: [
        {
          name: convertTarget === "video" ? "视频文件" : "音频文件",
          extensions: [ext],
        },
      ],
    });
    if (path) setConvertOutputPath(path);
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
          <h3 className="text-sm font-medium">格式转换</h3>
        </div>

        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">输入文件</label>
              <div className="mt-1 flex gap-2">
                <Input
                  value={convertInputPath}
                  readOnly
                  placeholder="拖拽媒体文件到此处，或点击选择"
                  className="flex-1 text-xs"
                />
                <Button size="icon" variant="outline" onClick={selectInput}>
                  <FileVideo className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">转换目标</label>
              <div className="mt-1 flex gap-2">
                <Button
                  variant={convertTarget === "video" ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => {
                    setConvertTarget("video");
                    if (convertInputPath) {
                      const base = convertInputPath.replace(/\.[^.]+$/, "");
                      setConvertOutputPath(
                        `${base}_converted.${convertVideoFormat}`
                      );
                    }
                  }}
                >
                  <FileVideo className="mr-2 h-4 w-4" />
                  视频格式
                </Button>
                <Button
                  variant={convertTarget === "audio" ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => {
                    setConvertTarget("audio");
                    if (convertInputPath) {
                      const base = convertInputPath.replace(/\.[^.]+$/, "");
                      setConvertOutputPath(
                        `${base}_converted.${convertAudioFormat}`
                      );
                    }
                  }}
                >
                  <Music className="mr-2 h-4 w-4" />
                  提取音频
                </Button>
              </div>
            </div>

            {convertTarget === "video" ? (
              <>
                <div>
                  <label className="text-sm font-medium">输出格式</label>
                  <Select
                    value={convertVideoFormat}
                    onValueChange={(v) => {
                      setConvertVideoFormat(v);
                      if (convertInputPath) {
                        const base = convertInputPath.replace(/\.[^.]+$/, "");
                        setConvertOutputPath(`${base}_converted.${v}`);
                      }
                    }}
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
                <div>
                  <label className="text-sm font-medium">视频码率（可选）</label>
                  <Input
                    value={convertVideoBitrate}
                    onChange={(e) => setConvertVideoBitrate(e.target.value)}
                    placeholder="如 5M, 2000k"
                    className="mt-1"
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="text-sm font-medium">输出格式</label>
                  <Select
                    value={convertAudioFormat}
                    onValueChange={(v) => {
                      setConvertAudioFormat(v);
                      if (convertInputPath) {
                        const base = convertInputPath.replace(/\.[^.]+$/, "");
                        setConvertOutputPath(`${base}_converted.${v}`);
                      }
                    }}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AUDIO_FORMATS.map((fmt) => (
                        <SelectItem key={fmt} value={fmt}>
                          {fmt.toUpperCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">音频码率</label>
                  <Select
                    value={convertAudioBitrate}
                    onValueChange={setConvertAudioBitrate}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AUDIO_BITRATES.map((rate) => (
                        <SelectItem key={rate} value={rate}>
                          {rate}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <div>
              <label className="text-sm font-medium">输出路径</label>
              <div className="mt-1 flex gap-2">
                <Input
                  value={convertOutputPath}
                  onChange={(e) => setConvertOutputPath(e.target.value)}
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
              onClick={runConvert}
              disabled={isProcessing || !convertInputPath}
            >
              {isProcessing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Play className="mr-2 h-4 w-4" />
              )}
              转换
            </Button>
          </div>
        </ScrollArea>
      </div>

      <ProgressPanel />
    </>
  );
}
