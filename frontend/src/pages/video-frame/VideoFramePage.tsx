import { useEffect } from "react";
import { Box, useMantineTheme, useComputedColorScheme } from "@mantine/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useVideoFrameStore } from "@/stores/videoFrameStore";
import { FfmpegWarning } from "@/components/common/FfmpegWarning";
import {
  ResizablePanel,
  ResizablePanelGroup,
  ResizableHandle,
  useDefaultLayout,
} from "@/components/ui/resizable";
import { ParamsPanel } from "./ParamsPanel";
import { FrameGrid } from "./FrameGrid";

const VIDEO_EXTENSIONS = ["mp4", "avi", "mkv", "mov", "wmv", "flv", "webm"];

export default function VideoFramePage() {
  const ffmpegAvailable = useVideoFrameStore((s) => s.ffmpegAvailable);
  const checkFfmpeg = useVideoFrameStore((s) => s.checkFfmpeg);
  const loadVideo = useVideoFrameStore((s) => s.loadVideo);
  const stopWatcher = useVideoFrameStore((s) => s.stopWatcher);
  const theme = useMantineTheme();
  const colorScheme = useComputedColorScheme();
  const isDark = colorScheme === "dark";
  const { defaultLayout, onLayoutChanged } = useDefaultLayout({
    id: "video-frame-page",
    storage: localStorage,
  });

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
    <Box
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
        borderRadius: theme.radius.lg,
        border: `1px solid ${theme.colors.dark[4]}`,
        backgroundColor: isDark ? theme.colors.dark[7] : theme.white,
      }}
    >
      <ResizablePanelGroup
        id="video-frame-page"
        orientation="horizontal"
        defaultLayout={defaultLayout}
        onLayoutChanged={onLayoutChanged}
        style={{ flex: 1, padding: 8 }}
      >
        <ResizablePanel defaultSize={35} minSize={25}>
          <ParamsPanel />
        </ResizablePanel>

        <ResizableHandle withHandle />

        <ResizablePanel defaultSize={65} minSize={40}>
          <FrameGrid />
        </ResizablePanel>
      </ResizablePanelGroup>
    </Box>
  );
}
