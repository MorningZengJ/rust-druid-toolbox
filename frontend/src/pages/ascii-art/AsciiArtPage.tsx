import { useEffect } from "react";
import { Box } from "@mantine/core";
import { useAsciiArtStore } from "@/stores/asciiArtStore";
import { useActiveTauriDrop } from "@/hooks/useActiveTauriDrop";
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
  const { defaultLayout, onLayoutChanged } = useDefaultLayout({
    id: "ascii-art-page",
    storage: localStorage,
  });

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  // 使用统一拖放 hook —— PageContainer 条件挂载保证只有 active 页面注册
  useActiveTauriDrop({
    enabled: true,
    extensions: IMAGE_EXTENSIONS,
    onDrop: (paths) => {
      if (paths.length > 0) loadImageFromPath(paths[0]);
    },
  });

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
        borderRadius: 12,
        border: "1px solid var(--border-default)",
        backgroundColor: "var(--surface-overlay)",
        position: "relative",
      }}
      onPaste={(e) => e.preventDefault()}
    >
      {/* 顶部高光线 */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 1,
          background: "linear-gradient(90deg, transparent, var(--accent-glow), transparent)",
          pointerEvents: "none",
          zIndex: 1,
        }}
      />

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
