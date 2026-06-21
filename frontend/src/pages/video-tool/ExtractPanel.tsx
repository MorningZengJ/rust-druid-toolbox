import { useEffect, useRef, useState } from "react";
import {
  Box,
  Flex,
  Text,
} from "@mantine/core";
import {
  ResizablePanel,
  ResizablePanelGroup,
  ResizableHandle,
  useDefaultLayout,
} from "@/components/ui/resizable";
import { useTranslation } from "react-i18next";
import { useVideoToolStore } from "@/stores/videoToolStore";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { ExtractParamsPanel } from "./components/ExtractParamsPanel";
import { FrameViewer } from "./components/FrameViewer";

export function ExtractPanel() {
  const { t } = useTranslation("videoTool");
  const extractLogs = useVideoToolStore((s) => s.extractLogs);
  const loadVideo = useVideoToolStore((s) => s.loadVideo);
  const stopExtractWatcher = useVideoToolStore((s) => s.stopExtractWatcher);

  const [isDragOver, setIsDragOver] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);
  const { defaultLayout, onLayoutChanged } = useDefaultLayout({
    id: "video-tool-extract",
    storage: localStorage,
  });

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [extractLogs]);

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

  const logSection = (
    <Box style={{ height: 140, flexShrink: 0, borderTop: "1px solid var(--border-default)" }}>
      <Flex align="center" px="sm" py={6} style={{ borderBottom: "1px solid var(--border-subtle)", backgroundColor: "var(--surface-panel)" }}>
        <Text size="xs" fw={500} c="dimmed" style={{ fontFamily: "var(--font-body)" }}>{t("common.log")}</Text>
      </Flex>
      <Box style={{ height: "calc(100% - 28px)", overflowY: "auto" }} p="xs">
        {extractLogs.length > 0 ? (
          <>
            {extractLogs.map((log, i) => (
              <Text
                key={i}
                size="xs"
                py={2}
                c={log.level === "error" ? "red" : log.level === "warn" ? "yellow" : "dimmed"}
                style={{ fontFamily: "var(--font-mono)" }}
              >
                {log.message}
              </Text>
            ))}
            <div ref={logEndRef} />
          </>
        ) : (
          <Flex h="100%" align="center" justify="center">
            <Text size="xs" c="dimmed">{t("common.logEmpty")}</Text>
          </Flex>
        )}
      </Box>
    </Box>
  );

  return (
    <ResizablePanelGroup
      id="video-tool-extract"
      orientation="horizontal"
      defaultLayout={defaultLayout}
      onLayoutChanged={onLayoutChanged}
      style={{ height: "100%" }}
    >
      <ResizablePanel defaultSize={35} minSize={25}>
        <ExtractParamsPanel logSection={logSection} />
      </ResizablePanel>

      <ResizableHandle withHandle />

      <ResizablePanel defaultSize={65} minSize={40}>
        <FrameViewer isDragOver={isDragOver} />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
