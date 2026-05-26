import { useEffect } from "react";
import { Box, useMantineTheme, useComputedColorScheme } from "@mantine/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useAsciiArtStore } from "@/stores/asciiArtStore";
import {
  ResizablePanel,
  ResizablePanelGroup,
  ResizableHandle,
  useDefaultLayout,
} from "@/components/ui/resizable";
import { ControlPanel } from "./ControlPanel";
import { PreviewPanel } from "./PreviewPanel";

const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "gif", "bmp", "webp"];

export default function AsciiArtPage() {
  const loadImageFromPath = useAsciiArtStore((s) => s.loadImageFromPath);
  const loadImageFromPaste = useAsciiArtStore((s) => s.loadImageFromPaste);
  const cleanup = useAsciiArtStore((s) => s.cleanup);
  const theme = useMantineTheme();
  const colorScheme = useComputedColorScheme();
  const isDark = colorScheme === "dark";
  const { defaultLayout, onLayoutChanged } = useDefaultLayout({
    id: "ascii-art-page",
    storage: localStorage,
  });

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  useEffect(() => {
    const unlisten = getCurrentWindow().onDragDropEvent((event) => {
      if (event.payload.type === "drop") {
        const imagePath = event.payload.paths.find((p) => {
          const ext = p.split(".").pop()?.toLowerCase() ?? "";
          return IMAGE_EXTENSIONS.includes(ext);
        });
        if (imagePath) {
          loadImageFromPath(imagePath);
        }
      }
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, [loadImageFromPath]);

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const blob = item.getAsFile();
          if (blob) {
            blob.arrayBuffer().then((buffer) => {
              loadImageFromPaste(buffer);
            });
          }
          break;
        }
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [loadImageFromPaste]);

  return (
    <Box
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
        borderRadius: theme.radius.lg,
        border: `1px solid ${isDark ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.06)"}`,
        backgroundColor: isDark ? theme.colors.dark[7] : theme.white,
      }}
      onPaste={(e) => e.preventDefault()}
    >
      <ResizablePanelGroup
        id="ascii-art-page"
        orientation="horizontal"
        defaultLayout={defaultLayout}
        onLayoutChanged={onLayoutChanged}
        style={{ flex: 1, padding: 8 }}
      >
        <ResizablePanel defaultSize={35} minSize={25}>
          <ControlPanel />
        </ResizablePanel>

        <ResizableHandle withHandle />

        <ResizablePanel defaultSize={65} minSize={40}>
          <PreviewPanel />
        </ResizablePanel>
      </ResizablePanelGroup>
    </Box>
  );
}
