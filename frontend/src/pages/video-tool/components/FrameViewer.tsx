import { useMemo, useCallback } from "react";
import {
  Box,
  Flex,
  Stack,
  Text,
  ScrollArea,
} from "@mantine/core";
import {
  ResizablePanel,
  ResizablePanelGroup,
  ResizableHandle,
} from "@/components/ui/resizable";
import { Upload } from "lucide-react";
import { useTranslation } from "react-i18next";
import { VirtuosoGrid } from "react-virtuoso";
import { useVideoToolStore } from "@/stores/videoToolStore";
import { convertFileSrc } from "@tauri-apps/api/core";

// ── Thumbnail item component ──

function ThumbItem({
  frame,
  isSelected,
  onClick,
}: {
  frame: { filePath: string; index: number; timestamp: number };
  isSelected: boolean;
  onClick: () => void;
}) {
  const { t } = useTranslation("videoTool");
  const src = useMemo(() => convertFileSrc(frame.filePath), [frame.filePath]);

  return (
    <Box
      w={100}
      style={{
        flexShrink: 0,
        cursor: "pointer",
        overflow: "hidden",
        borderRadius: 6,
        border: `2px solid ${isSelected ? "var(--accent-primary)" : "transparent"}`,
        transition: "border-color 0.15s",
      }}
      onClick={onClick}
    >
      <img
        src={src}
        alt={t("extract.frameAlt", { index: frame.index })}
        style={{ width: "100%", aspectRatio: "16/9", objectFit: "cover", display: "block" }}
      />
      <Box px={4} py={2} ta="center" style={{ backgroundColor: "var(--surface-panel)" }}>
        <Text size="xs" c="dimmed" style={{ fontFamily: "var(--font-mono)" }}>{frame.timestamp.toFixed(2)}s</Text>
      </Box>
    </Box>
  );
}

// ── Virtuoso grid wrapper ──

function ThumbnailGrid({
  frames,
  selectedIndex,
  onSelect,
}: {
  frames: Array<{ filePath: string; index: number; timestamp: number }>;
  selectedIndex: number | null;
  onSelect: (i: number) => void;
}) {
  // VirtuosoGrid requires a list container + item container for CSS grid
  return (
    <VirtuosoGrid
      data={frames}
      listClassName="thumb-grid-list"
      itemClassName="thumb-grid-item"
      totalCount={frames.length}
      style={{ height: "100%" }}
      increaseViewportBy={300}
      itemContent={(_i, frame) => (
        <ThumbItem
          frame={frame}
          isSelected={selectedIndex === _i}
          onClick={() => onSelect(_i)}
        />
      )}
    />
  );
}

// ── Main component ──

export function FrameViewer({ isDragOver }: { isDragOver: boolean }) {
  const { t } = useTranslation("videoTool");
  const extractVideoPath = useVideoToolStore((s) => s.extractVideoPath);
  const extractFrames = useVideoToolStore((s) => s.extractFrames);
  const extractSelectedFrame = useVideoToolStore((s) => s.extractSelectedFrame);
  const setExtractSelectedFrame = useVideoToolStore((s) => s.setExtractSelectedFrame);
  const errorMessage = useVideoToolStore((s) => s.errorMessage);
  const loadVideo = useVideoToolStore((s) => s.loadVideo);

  const handleSelect = useCallback(
    (i: number) => setExtractSelectedFrame(i),
    [setExtractSelectedFrame],
  );

  const selectedSrc = useMemo(
    () =>
      extractSelectedFrame !== null && extractFrames[extractSelectedFrame]
        ? convertFileSrc(extractFrames[extractSelectedFrame].filePath)
        : null,
    [extractFrames, extractSelectedFrame],
  );

  return (
    <Box
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
        borderRadius: 10,
        border: "1px solid var(--border-default)",
        backgroundColor: "var(--surface-raised)",
        position: "relative",
      }}
    >
      {/* Top glow line */}
      <div
        style={{
          position: "absolute",
          top: 0, left: 0, right: 0, height: 1,
          background: "linear-gradient(90deg, transparent, var(--accent-glow), transparent)",
          pointerEvents: "none", zIndex: 1,
        }}
      />

      <Flex align="center" px="sm" py="xs" style={{ borderBottom: "1px solid var(--border-subtle)", backgroundColor: "var(--surface-panel)" }}>
        <Text size="xs" fw={500} c="dimmed" style={{ fontFamily: "var(--font-body)" }}>
          {extractFrames.length > 0 ? t("extract.viewFrames", { count: extractFrames.length }) : t("frameViewer.title")}
        </Text>
      </Flex>

      <Box pos="relative" style={{ flex: 1, overflow: "hidden" }} onDoubleClick={() => loadVideo()}>
        {errorMessage && (
          <Box m="sm" px="sm" py="xs" style={{ borderRadius: 8, border: "1px solid var(--status-error-border)", backgroundColor: "var(--status-error-bg)" }}>
            <Text size="sm" c="red">{errorMessage}</Text>
          </Box>
        )}

        {isDragOver && (
          <Flex pos="absolute" inset={0} align="center" justify="center" style={{ zIndex: 10, borderRadius: 10, border: "2px dashed var(--accent-primary)", backgroundColor: "var(--accent-glow)" }}>
            <Stack align="center" gap="xs" style={{ color: "var(--accent-primary)" }}>
              <Upload size={48} />
              <Text size="sm" fw={500}>{t("frameViewer.dropHint")}</Text>
            </Stack>
          </Flex>
        )}

        {extractFrames.length > 0 ? (
          extractSelectedFrame !== null && extractFrames[extractSelectedFrame] ? (
            <ResizablePanelGroup orientation="horizontal" style={{ height: "100%" }}>
              <ResizablePanel defaultSize={60} minSize={30}>
                <ThumbnailGrid
                  frames={extractFrames}
                  selectedIndex={extractSelectedFrame}
                  onSelect={handleSelect}
                />
              </ResizablePanel>

              <ResizableHandle withHandle />

              <ResizablePanel defaultSize={40} minSize={20}>
                <ScrollArea style={{ height: "100%" }}>
                  <Box p="sm">
                    {selectedSrc && (
                      <img
                        src={selectedSrc}
                        alt={t("extract.frameAlt", { index: extractFrames[extractSelectedFrame].index })}
                        style={{ width: "100%", borderRadius: 8, border: "1px solid var(--border-default)", display: "block" }}
                      />
                    )}
                    <Stack gap={2} mt="xs">
                      <Text size="xs" c="dimmed" style={{ fontFamily: "var(--font-mono)" }}>{t("extract.frameIndex", { index: extractFrames[extractSelectedFrame].index })}</Text>
                      <Text size="xs" c="dimmed" style={{ fontFamily: "var(--font-mono)" }}>{t("extract.timestamp", { time: extractFrames[extractSelectedFrame].timestamp.toFixed(3) })}</Text>
                      <Text size="xs" c="dimmed" style={{ fontFamily: "var(--font-mono)" }}>{t("extract.filename", { name: extractFrames[extractSelectedFrame].filename })}</Text>
                    </Stack>
                  </Box>
                </ScrollArea>
              </ResizablePanel>
            </ResizablePanelGroup>
          ) : (
            <ThumbnailGrid
              frames={extractFrames}
              selectedIndex={extractSelectedFrame}
              onSelect={handleSelect}
            />
          )
        ) : (
          <Flex h="100%" align="center" justify="center">
            <Text size="sm" c="dimmed">
              {extractVideoPath ? t("extract.setParamsHint") : t("extract.dropVideoHint")}
            </Text>
          </Flex>
        )}
      </Box>
    </Box>
  );
}
