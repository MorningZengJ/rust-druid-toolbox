import { useCallback } from "react";
import {
  Flex,
  Stack,
  Box,
  Text,
  ScrollArea,
  useMantineTheme,
} from "@mantine/core";
import {
  ResizablePanel,
  ResizablePanelGroup,
  ResizableHandle,
} from "@/components/ui/resizable";
import { convertFileSrc } from "@tauri-apps/api/core";
import { useVideoFrameStore } from "@/stores/videoFrameStore";

export function FrameGrid() {
  const videoPath = useVideoFrameStore((s) => s.videoPath);
  const frames = useVideoFrameStore((s) => s.frames);
  const errorMessage = useVideoFrameStore((s) => s.errorMessage);
  const selectedFrame = useVideoFrameStore((s) => s.selectedFrame);
  const setSelectedFrame = useVideoFrameStore((s) => s.setSelectedFrame);
  const loadVideo = useVideoFrameStore((s) => s.loadVideo);
  const theme = useMantineTheme();

  const handleDoubleClick = useCallback(async () => {
    await loadVideo();
  }, [loadVideo]);

  return (
    <Flex
      direction="column"
      style={{
        flex: 1,
        overflow: "hidden",
        borderRadius: theme.radius.md,
        border: `1px solid ${theme.colors.dark[4]}`,
      }}
    >
      <Flex align="center" px="sm" py="xs" style={{ borderBottom: `1px solid ${theme.colors.dark[4]}` }}>
        <Text size="xs" fw={500} c="dimmed">
          {frames.length > 0 ? `提取的帧 (${frames.length})` : "视频抽帧"}
        </Text>
      </Flex>

      <Box
        style={{ position: "relative", flex: 1, overflow: "hidden" }}
        onDoubleClick={handleDoubleClick}
      >
        {errorMessage && (
          <Box
            m="sm"
            p="xs"
            style={{
              border: `1px solid ${theme.colors.red[5]}`,
              borderRadius: theme.radius.sm,
              backgroundColor: theme.colors.red[0],
              color: theme.colors.red[7],
            }}
          >
            <Text size="sm">{errorMessage}</Text>
          </Box>
        )}

        {frames.length > 0 ? (
          selectedFrame !== null && frames[selectedFrame] ? (
            <ResizablePanelGroup orientation="horizontal" style={{ height: "100%" }}>
              <ResizablePanel defaultSize={60} minSize={30}>
                <ScrollArea h="100%">
                  <Flex wrap="wrap" justify="center" gap="xs" p="sm">
                    {frames.map((frame, i) => (
                      <FrameThumbnail
                        key={frame.index}
                        frame={frame}
                        isSelected={selectedFrame === i}
                        onClick={() => setSelectedFrame(i)}
                      />
                    ))}
                  </Flex>
                </ScrollArea>
              </ResizablePanel>

              <ResizableHandle />

              <ResizablePanel defaultSize={40} minSize={20}>
                <ScrollArea h="100%">
                  <Box p="sm">
                    <img
                      src={convertFileSrc(frames[selectedFrame].filePath)}
                      alt={`Frame ${frames[selectedFrame].index}`}
                      style={{ width: "100%", borderRadius: theme.radius.sm, border: `1px solid ${theme.colors.gray[3]}` }}
                    />
                    <Stack gap={4} mt="xs">
                      <Text size="xs" c="dimmed">帧索引: {frames[selectedFrame].index}</Text>
                      <Text size="xs" c="dimmed">时间戳: {frames[selectedFrame].timestamp.toFixed(3)}s</Text>
                      <Text size="xs" c="dimmed">文件名: {frames[selectedFrame].filename}</Text>
                    </Stack>
                  </Box>
                </ScrollArea>
              </ResizablePanel>
            </ResizablePanelGroup>
          ) : (
            <ScrollArea h="100%">
              <Flex wrap="wrap" gap="xs" p="sm">
                {frames.map((frame, i) => (
                  <FrameThumbnail
                    key={frame.index}
                    frame={frame}
                    isSelected={selectedFrame === i}
                    onClick={() => setSelectedFrame(i)}
                  />
                ))}
              </Flex>
            </ScrollArea>
          )
        ) : (
          <Flex h="100%" align="center" justify="center">
            <Text size="sm" c="dimmed">
              {videoPath ? "设置参数后点击\"提取帧\"" : "双击或拖拽视频文件到此处"}
            </Text>
          </Flex>
        )}
      </Box>
    </Flex>
  );
}

interface FrameThumbnailProps {
  frame: { index: number; filePath: string; timestamp: number };
  isSelected: boolean;
  onClick: () => void;
}

function FrameThumbnail({ frame, isSelected, onClick }: FrameThumbnailProps) {
  const theme = useMantineTheme();

  return (
    <Box
      w={100}
      style={{
        flexShrink: 0,
        cursor: "pointer",
        overflow: "hidden",
        borderRadius: theme.radius.sm,
        border: isSelected
          ? `2px solid ${theme.colors[theme.primaryColor][6]}`
          : "2px solid transparent",
        transition: "border-color 150ms ease",
      }}
      onClick={onClick}
    >
      <img
        src={convertFileSrc(frame.filePath)}
        alt={`Frame ${frame.index}`}
        style={{ width: "100%", aspectRatio: "16/9", objectFit: "cover" }}
      />
      <Box
        py={2}
        style={{
          textAlign: "center",
          backgroundColor: theme.colors.gray[2],
          fontSize: 10,
          color: theme.colors.gray[6],
        }}
      >
        {frame.timestamp.toFixed(2)}s
      </Box>
    </Box>
  );
}
