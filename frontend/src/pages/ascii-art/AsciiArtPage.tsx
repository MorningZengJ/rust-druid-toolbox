import { useEffect } from "react";
import { Flex } from "@mantine/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useAsciiArtStore } from "@/stores/asciiArtStore";
import { ControlPanel } from "./ControlPanel";
import { PreviewPanel } from "./PreviewPanel";

const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "gif", "bmp", "webp"];

export default function AsciiArtPage() {
  const loadImageFromPath = useAsciiArtStore((s) => s.loadImageFromPath);
  const loadImageFromPaste = useAsciiArtStore((s) => s.loadImageFromPaste);
  const cleanup = useAsciiArtStore((s) => s.cleanup);

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
    <Flex h="100%" gap="sm" onPaste={(e) => e.preventDefault()}>
      <ControlPanel />
      <PreviewPanel />
    </Flex>
  );
}
