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
import { useVideoToolStore } from "@/stores/videoToolStore";
import { convertFileSrc } from "@tauri-apps/api/core";

export function FrameViewer({ isDragOver }: { isDragOver: boolean }) {
  const { t } = useTranslation("videoTool");
  const extractVideoPath = useVideoToolStore((s) => s.extractVideoPath);
  const extractFrames = useVideoToolStore((s) => s.extractFrames);
  const extractSelectedFrame = useVideoToolStore((s) => s.extractSelectedFrame);
  const setExtractSelectedFrame = useVideoToolStore((s) => s.setExtractSelectedFrame);
  const errorMessage = useVideoToolStore((s) => s.errorMessage);
  const loadVideo = useVideoToolStore((s) => s.loadVideo);

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

      <Flex align="center" px="sm" py="xs" style={{ borderBottom: "1px solid var(--border-subtle)", backgroundColor: "var(--surface-panel)" }}>
        <Text size="xs" fw={500} c="dimmed" style={{ fontFamily: "var(--font-body)" }}>
          {extractFrames.length > 0 ? t("extract.viewFrames", { count: extractFrames.length }) : t("frameViewer.title")}
        </Text>
      </Flex>

      <Box
        pos="relative"
        style={{ flex: 1, overflow: "hidden" }}
        onDoubleClick={() => loadVideo()}
      >
        {errorMessage && (
          <Box
            m="sm"
            px="sm"
            py="xs"
            style={{
              borderRadius: 8,
              border: "1px solid var(--status-error-border)",
              backgroundColor: "var(--status-error-bg)",
            }}
          >
            <Text size="sm" c="red">{errorMessage}</Text>
          </Box>
        )}

        {isDragOver && (
          <Flex
            pos="absolute"
            inset={0}
            align="center"
            justify="center"
            style={{
              zIndex: 10,
              borderRadius: 10,
              border: "2px dashed var(--accent-primary)",
              backgroundColor: "var(--accent-glow)",
            }}
          >
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
                <ScrollArea style={{ height: "100%" }}>
                  <Flex wrap="wrap" justify="center" gap="xs" p="sm">
                    {extractFrames.map((frame, i) => (
                      <Box
                        key={frame.index}
                        w={100}
                        style={{
                          flexShrink: 0,
                          cursor: "pointer",
                          overflow: "hidden",
                          borderRadius: 6,
                          border: `2px solid ${extractSelectedFrame === i ? "var(--accent-primary)" : "transparent"}`,
                          transition: "border-color 0.15s",
                        }}
                        onClick={() => setExtractSelectedFrame(i)}
                      >
                        <img
                          src={convertFileSrc(frame.filePath)}
                          alt={`Frame ${frame.index}`}
                          style={{ width: "100%", aspectRatio: "16/9", objectFit: "cover", display: "block" }}
                        />
                        <Box px={4} py={2} ta="center" style={{ backgroundColor: "var(--surface-panel)" }}>
                          <Text size="xs" c="dimmed" style={{ fontFamily: "var(--font-mono)" }}>{frame.timestamp.toFixed(2)}s</Text>
                        </Box>
                      </Box>
                    ))}
                  </Flex>
                </ScrollArea>
              </ResizablePanel>

              <ResizableHandle withHandle />

              <ResizablePanel defaultSize={40} minSize={20}>
                <ScrollArea style={{ height: "100%" }}>
                  <Box p="sm">
                    <img
                      src={convertFileSrc(extractFrames[extractSelectedFrame].filePath)}
                      alt={`Frame ${extractFrames[extractSelectedFrame].index}`}
                      style={{ width: "100%", borderRadius: 8, border: "1px solid var(--border-default)", display: "block" }}
                    />
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
            <ScrollArea style={{ height: "100%" }}>
              <Flex wrap="wrap" gap="xs" p="sm">
                {extractFrames.map((frame, i) => (
                  <Box
                    key={frame.index}
                    w={100}
                    style={{
                      flexShrink: 0,
                      cursor: "pointer",
                      overflow: "hidden",
                      borderRadius: 6,
                      border: `2px solid ${extractSelectedFrame === i ? "var(--accent-primary)" : "transparent"}`,
                      transition: "border-color 0.15s",
                    }}
                    onClick={() => setExtractSelectedFrame(i)}
                  >
                    <img
                      src={convertFileSrc(frame.filePath)}
                      alt={`Frame ${frame.index}`}
                      style={{ width: "100%", aspectRatio: "16/9", objectFit: "cover", display: "block" }}
                    />
                    <Box px={4} py={2} ta="center" style={{ backgroundColor: "var(--surface-panel)" }}>
                      <Text size="xs" c="dimmed" style={{ fontFamily: "var(--font-mono)" }}>{frame.timestamp.toFixed(2)}s</Text>
                    </Box>
                  </Box>
                ))}
              </Flex>
            </ScrollArea>
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
