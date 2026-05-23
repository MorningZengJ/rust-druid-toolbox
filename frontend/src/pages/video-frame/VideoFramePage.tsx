import { useEffect } from "react";
import { Flex } from "@mantine/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useVideoFrameStore } from "@/stores/videoFrameStore";
import { FfmpegWarning } from "@/components/common/FfmpegWarning";
import { ParamsPanel } from "./ParamsPanel";
import { FrameGrid } from "./FrameGrid";

const VIDEO_EXTENSIONS = ["mp4", "avi", "mkv", "mov", "wmv", "flv", "webm"];

export default function VideoFramePage() {
  const ffmpegAvailable = useVideoFrameStore((s) => s.ffmpegAvailable);
  const checkFfmpeg = useVideoFrameStore((s) => s.checkFfmpeg);
  const loadVideo = useVideoFrameStore((s) => s.loadVideo);
  const stopWatcher = useVideoFrameStore((s) => s.stopWatcher);

  useEffect(() => {
    checkFfmpeg();
  }, [checkFfmpeg]);

  useEffect(() => {
    return () => {
      stopWatcher();
    };
  }, [stopWatcher]);

  useEffect(() => {
    const unlisten = getCurrentWindow().onDragDropEvent((event) => {
      if (event.payload.type === "drop") {
        const videoPath = event.payload.paths.find((p) => {
          const ext = p.split(".").pop()?.toLowerCase() ?? "";
          return VIDEO_EXTENSIONS.includes(ext);
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

  if (!ffmpegAvailable) {
    return <FfmpegWarning onRetry={checkFfmpeg} variant="warning" />;
  }

  return (
    <Flex h="100%" gap="sm">
      <ParamsPanel />
      <FrameGrid />
    </Flex>
  );
}
