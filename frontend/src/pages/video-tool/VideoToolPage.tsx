import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Merge,
  Images,
  RefreshCw,
  Film,
  AlertCircle,
} from "lucide-react";
import { useVideoToolStore } from "@/stores/videoToolStore";
import { MergePanel } from "./MergePanel";
import { ImagesPanel } from "./ImagesPanel";
import { ConvertPanel } from "./ConvertPanel";
import { ExtractPanel } from "./ExtractPanel";

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
        onValueChange={(v) => setActiveTab(v as "merge" | "images" | "convert" | "extract")}
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
