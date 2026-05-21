import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Merge,
  Images,
  RefreshCw,
  FolderOpen,
  Plus,
  Trash2,
  Play,
  FileVideo,
  Music,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Upload,
  Film,
} from "lucide-react";
import {
  ResizablePanel,
  ResizablePanelGroup,
  ResizableHandle,
} from "@/components/ui/resizable";
import { useVideoToolStore } from "@/stores/videoToolStore";
import { convertFileSrc } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import type { ExtractMode, OutputFormat } from "@/types";

const VIDEO_FORMATS = ["mp4", "mkv", "avi", "webm", "mov", "flv"];
const AUDIO_FORMATS = ["mp3", "aac", "wav", "flac", "ogg", "opus"];
const AUDIO_BITRATES = ["128k", "192k", "256k", "320k"];

const VIDEO_EXTENSIONS = ["mp4", "mkv", "avi", "webm", "mov", "flv", "ts"];
const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "bmp", "gif", "webp"];
const MEDIA_EXTENSIONS = [
  "mp4", "mkv", "avi", "webm", "mov", "flv", "ts",
  "mp3", "aac", "wav", "flac", "ogg", "opus",
];

export default function VideoToolPage() {
  const ffmpegAvailable = useVideoToolStore((s) => s.ffmpegAvailable);
  const checkFfmpeg = useVideoToolStore((s) => s.checkFfmpeg);
  const encoderStatus = useVideoToolStore((s) => s.encoderStatus);
  const checkEncoders = useVideoToolStore((s) => s.checkEncoders);
  const activeTab = useVideoToolStore((s) => s.activeTab);
  const setActiveTab = useVideoToolStore((s) => s.setActiveTab);

  useEffect(() => {
    checkFfmpeg();
    checkEncoders();
  }, [checkFfmpeg, checkEncoders]);

  if (!ffmpegAvailable) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <h2 className="mb-2 text-lg font-semibold">FFmpeg 未安装</h2>
          <p className="text-sm text-muted-foreground">
            视频工具需要 FFmpeg 支持，请先安装 FFmpeg 并确保其在系统 PATH 中。
          </p>
          <Button className="mt-4" onClick={checkFfmpeg}>
            重新检测
          </Button>
        </div>
      </div>
    );
  }

  const hasX264 = encoderStatus["libx264"] || encoderStatus["libx264rgb"];
  const hasX265 = encoderStatus["libx265"];
  const hasMpeg4 = encoderStatus["mpeg4"];
  const hasGif = encoderStatus["gif"];
  const hasAnyVideoEncoder = hasX264 || hasX265 || hasMpeg4 || hasGif;

  if (!hasAnyVideoEncoder) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <h2 className="mb-2 text-lg font-semibold">缺少视频编码器</h2>
          <p className="text-sm text-muted-foreground">
            FFmpeg 已安装，但未找到可用的视频编码器（libx264/libx265/mpeg4）。
            <br />
            请安装包含完整编码器的 FFmpeg 版本。
          </p>
          <div className="mt-4 space-y-2 text-left text-xs">
            <p className="font-medium">编码器状态：</p>
            {Object.entries(encoderStatus).map(([name, available]) => (
              <div key={name} className="flex items-center gap-2">
                <span className={available ? "text-green-500" : "text-destructive"}>
                  {available ? "✓" : "✗"}
                </span>
                <span>{name}</span>
              </div>
            ))}
          </div>
          <Button className="mt-4" onClick={checkEncoders}>
            重新检测
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as "merge" | "images" | "convert")}
        className="flex h-full flex-col"
      >
        <TabsList variant="line">
          <TabsTrigger value="merge">
            <Merge className="h-4 w-4" />
            合并视频
          </TabsTrigger>
          <TabsTrigger value="images">
            <Images className="h-4 w-4" />
            图片转视频
          </TabsTrigger>
          <TabsTrigger value="convert">
            <RefreshCw className="h-4 w-4" />
            格式转换
          </TabsTrigger>
          <TabsTrigger value="extract">
            <Film className="h-4 w-4" />
            抽帧
          </TabsTrigger>
        </TabsList>

        <div className="mt-2 flex min-h-0 flex-1 gap-4">
          <TabsContent value="merge" className="mt-0 flex min-h-0 flex-1 gap-4">
            <MergePanel />
          </TabsContent>
          <TabsContent value="images" className="mt-0 flex min-h-0 flex-1 gap-4">
            <ImagesPanel />
          </TabsContent>
          <TabsContent value="convert" className="mt-0 flex min-h-0 flex-1 gap-4">
            <ConvertPanel />
          </TabsContent>
          <TabsContent value="extract" className="mt-0 flex min-h-0 flex-1 gap-4">
            <ExtractPanel />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

function ProgressPanel() {
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

function DragOverlay({ isDragOver }: { isDragOver: boolean }) {
  if (!isDragOver) return null;
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center rounded-lg border-2 border-dashed border-primary bg-primary/10">
      <div className="flex flex-col items-center gap-2 text-primary">
        <Upload className="h-8 w-8" />
        <span className="text-sm font-medium">释放文件以添加</span>
      </div>
    </div>
  );
}

function MergePanel() {
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
        <DragOverlay isDragOver={isDragOver} />
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

function ImagesPanel() {
  const imagesInputPaths = useVideoToolStore((s) => s.imagesInputPaths);
  const imagesOutputPath = useVideoToolStore((s) => s.imagesOutputPath);
  const imagesFps = useVideoToolStore((s) => s.imagesFps);
  const imagesOutputFormat = useVideoToolStore((s) => s.imagesOutputFormat);
  const imagesResolution = useVideoToolStore((s) => s.imagesResolution);
  const imagesAudioPath = useVideoToolStore((s) => s.imagesAudioPath);
  const isProcessing = useVideoToolStore((s) => s.isProcessing);
  const setImagesInputPaths = useVideoToolStore((s) => s.setImagesInputPaths);
  const setImagesOutputPath = useVideoToolStore((s) => s.setImagesOutputPath);
  const setImagesFps = useVideoToolStore((s) => s.setImagesFps);
  const setImagesOutputFormat = useVideoToolStore((s) => s.setImagesOutputFormat);
  const setImagesResolution = useVideoToolStore((s) => s.setImagesResolution);
  const setImagesAudioPath = useVideoToolStore((s) => s.setImagesAudioPath);
  const runImagesToVideo = useVideoToolStore((s) => s.runImagesToVideo);
  const [isDragOver, setIsDragOver] = useState(false);

  useEffect(() => {
    const unlisten = getCurrentWindow().onDragDropEvent((event) => {
      if (event.payload.type === "over") {
        setIsDragOver(true);
      } else if (event.payload.type === "leave") {
        setIsDragOver(false);
      } else if (event.payload.type === "drop") {
        setIsDragOver(false);
        const imageFiles = event.payload.paths.filter((p) => {
          const ext = p.split(".").pop()?.toLowerCase() ?? "";
          return IMAGE_EXTENSIONS.includes(ext);
        });
        if (imageFiles.length > 0) {
          setImagesInputPaths([...imagesInputPaths, ...imageFiles]);
        }
      }
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, [imagesInputPaths, setImagesInputPaths]);

  const addImages = async () => {
    const { open } = await import("@tauri-apps/plugin-dialog");
    const selected = await open({
      multiple: true,
      filters: [
        {
          name: "图片文件",
          extensions: IMAGE_EXTENSIONS,
        },
      ],
    });
    if (selected) {
      const paths = Array.isArray(selected) ? selected : [selected];
      setImagesInputPaths([...imagesInputPaths, ...paths]);
    }
  };

  const removeImage = (index: number) => {
    setImagesInputPaths(imagesInputPaths.filter((_, i) => i !== index));
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
        <DragOverlay isDragOver={isDragOver} />
        <div className="border-b border-border px-4 py-2">
          <h3 className="text-sm font-medium">图片转视频</h3>
        </div>

        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm font-medium">图片列表 ({imagesInputPaths.length})</label>
                <Button size="sm" variant="outline" onClick={addImages}>
                  <Plus className="mr-1 h-3 w-3" />
                  添加
                </Button>
              </div>
              <div className="grid max-h-[200px] grid-cols-3 gap-1 overflow-auto">
                {imagesInputPaths.map((path, i) => (
                  <div key={i} className="group relative">
                    <img
                      src={convertFileSrc(path)}
                      alt=""
                      className="h-16 w-full rounded object-cover"
                    />
                    <Button
                      size="icon"
                      variant="destructive"
                      className="absolute right-0 top-0 h-5 w-5 opacity-0 transition-opacity group-hover:opacity-100"
                      onClick={() => removeImage(i)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                {imagesInputPaths.length === 0 && (
                  <div className="col-span-3 rounded border border-dashed border-muted-foreground/30 px-4 py-8 text-center text-xs text-muted-foreground">
                    拖拽图片到此处，或点击"添加"
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

function ConvertPanel() {
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
        <DragOverlay isDragOver={isDragOver} />
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

function ExtractPanel() {
  const extractVideoPath = useVideoToolStore((s) => s.extractVideoPath);
  const extractVideoInfo = useVideoToolStore((s) => s.extractVideoInfo);
  const extractParams = useVideoToolStore((s) => s.extractParams);
  const setExtractParams = useVideoToolStore((s) => s.setExtractParams);
  const extractFrames = useVideoToolStore((s) => s.extractFrames);
  const isExtracting = useVideoToolStore((s) => s.isExtracting);
  const extractProgress = useVideoToolStore((s) => s.extractProgress);
  const errorMessage = useVideoToolStore((s) => s.errorMessage);
  const extractSelectedFrame = useVideoToolStore((s) => s.extractSelectedFrame);
  const setExtractSelectedFrame = useVideoToolStore((s) => s.setExtractSelectedFrame);
  const loadVideo = useVideoToolStore((s) => s.loadVideo);
  const runExtractFrames = useVideoToolStore((s) => s.runExtractFrames);
  const extractOutputDir = useVideoToolStore((s) => s.extractOutputDir);
  const setExtractOutputDir = useVideoToolStore((s) => s.setExtractOutputDir);
  const stopExtractWatcher = useVideoToolStore((s) => s.stopExtractWatcher);
  const extractLogs = useVideoToolStore((s) => s.extractLogs);
  const extractEstimatedTimeRemaining = useVideoToolStore((s) => s.extractEstimatedTimeRemaining);

  const [isDragOver, setIsDragOver] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [extractLogs]);

  const handleBrowseOutputDir = async () => {
    const { open } = await import("@tauri-apps/plugin-dialog");
    const selected = await open({ directory: true });
    if (selected) {
      setExtractOutputDir(selected as string);
    }
  };

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
          return ["mp4", "avi", "mkv", "mov", "wmv", "flv", "webm"].includes(ext);
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

  useEffect(() => {
    return () => {
      stopExtractWatcher();
    };
  }, [stopExtractWatcher]);

  function formatTime(seconds: number): string {
    if (seconds < 60) return `${seconds}秒`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${mins}分${secs}秒` : `${mins}分`;
  }

  return (
    <>
      {/* Left: Controls */}
      <div className="flex w-[280px] shrink-0 flex-col rounded-lg border border-border bg-panel">
        <div className="flex items-center border-b border-border px-3 py-2">
          <span className="text-xs font-medium text-muted-foreground">参数设置</span>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="space-y-4 p-3">
            {extractVideoInfo && (
              <div className="rounded border border-border bg-muted/30 p-2 text-xs">
                <div className="flex items-center gap-1 mb-1">
                  <Film size={12} className="text-muted-foreground" />
                  <span className="font-medium truncate">{extractVideoPath.split(/[/\\]/).pop()}</span>
                </div>
                <div className="grid grid-cols-2 gap-1 text-muted-foreground">
                  <span>分辨率: {extractVideoInfo.width}x{extractVideoInfo.height}</span>
                  <span>帧率: {extractVideoInfo.fps.toFixed(1)} fps</span>
                  <span>时长: {extractVideoInfo.duration.toFixed(1)}s</span>
                  <span>总帧数: {extractVideoInfo.totalFrames}</span>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">帧图存放路径</label>
              <div className="flex gap-1">
                <Input
                  className="h-8 text-sm flex-1"
                  value={extractOutputDir}
                  onChange={(e) => setExtractOutputDir(e.target.value)}
                  placeholder="选择或输入路径"
                />
                <Button variant="outline" size="sm" className="h-8 w-8 p-0 shrink-0" onClick={handleBrowseOutputDir}>
                  <FolderOpen size={14} />
                </Button>
              </div>
            </div>

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

            <Button
              className="w-full"
              disabled={!extractVideoPath || isExtracting}
              onClick={runExtractFrames}
            >
              {isExtracting ? (
                <>
                  <Loader2 size={14} className="mr-1 animate-spin" />
                  提取中 {extractProgress.toFixed(0)}%
                  {extractEstimatedTimeRemaining !== null && extractEstimatedTimeRemaining > 0 && (
                    <span className="ml-1">· 剩余 {formatTime(extractEstimatedTimeRemaining)}</span>
                  )}
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
                  style={{ width: `${extractProgress}%` }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Logs */}
        <div className="h-[140px] shrink-0 border-t border-border">
          <div className="flex items-center border-b border-border px-3 py-1.5">
            <span className="text-xs font-medium text-muted-foreground">日志</span>
          </div>
          <div className="h-[calc(100%-28px)] overflow-y-auto p-2">
            {extractLogs.length > 0 ? (
              <>
                {extractLogs.map((log, i) => (
                  <div key={i} className="text-xs py-0.5">
                    <span className={log.level === 'error' ? 'text-destructive' : log.level === 'warn' ? 'text-yellow-500' : 'text-muted-foreground'}>
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
      </div>

      {/* Right: Frame grid */}
      <div className="flex flex-1 flex-col overflow-hidden rounded-lg border border-border bg-panel">
        <div className="flex items-center border-b border-border px-3 py-2">
          <span className="text-xs font-medium text-muted-foreground">
            {extractFrames.length > 0 ? `提取的帧 (${extractFrames.length})` : "视频抽帧"}
          </span>
        </div>

        <div
          className="relative flex-1 overflow-hidden"
          onDoubleClick={() => loadVideo()}
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

          {extractFrames.length > 0 ? (
            extractSelectedFrame !== null && extractFrames[extractSelectedFrame] ? (
              <ResizablePanelGroup orientation="horizontal" className="h-full">
                <ResizablePanel defaultSize={60} minSize={30}>
                  <ScrollArea className="h-full">
                    <div className="flex flex-wrap justify-center gap-2 p-3">
                      {extractFrames.map((frame, i) => (
                        <div
                          key={frame.index}
                          className={`w-[100px] shrink-0 cursor-pointer overflow-hidden rounded border-2 transition-colors ${
                            extractSelectedFrame === i
                              ? "border-primary"
                              : "border-transparent hover:border-muted-foreground/30"
                          }`}
                          onClick={() => setExtractSelectedFrame(i)}
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
                      ))}
                    </div>
                  </ScrollArea>
                </ResizablePanel>

                <ResizableHandle withHandle />

                <ResizablePanel defaultSize={40} minSize={20}>
                  <ScrollArea className="h-full">
                    <div className="p-3">
                      <img
                        src={convertFileSrc(extractFrames[extractSelectedFrame].filePath)}
                        alt={`Frame ${extractFrames[extractSelectedFrame].index}`}
                        className="w-full rounded border border-border"
                      />
                      <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                        <div>帧索引: {extractFrames[extractSelectedFrame].index}</div>
                        <div>时间戳: {extractFrames[extractSelectedFrame].timestamp.toFixed(3)}s</div>
                        <div>文件名: {extractFrames[extractSelectedFrame].filename}</div>
                      </div>
                    </div>
                  </ScrollArea>
                </ResizablePanel>
              </ResizablePanelGroup>
            ) : (
              <ScrollArea className="h-full">
                <div className="flex flex-wrap gap-2 p-3">
                  {extractFrames.map((frame, i) => (
                    <div
                      key={frame.index}
                      className={`w-[100px] shrink-0 cursor-pointer overflow-hidden rounded border-2 transition-colors ${
                        extractSelectedFrame === i
                          ? "border-primary"
                          : "border-transparent hover:border-muted-foreground/30"
                      }`}
                      onClick={() => setExtractSelectedFrame(i)}
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
                  ))}
                </div>
              </ScrollArea>
            )
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              {extractVideoPath ? "设置参数后点击\"提取帧\"" : "双击或拖拽视频文件到此处"}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
