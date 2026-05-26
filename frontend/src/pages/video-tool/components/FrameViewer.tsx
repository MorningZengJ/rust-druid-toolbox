import {
  Box,
  Flex,
  Stack,
  Text,
  ScrollArea,
  useMantineTheme,
} from "@mantine/core";
import {
  ResizablePanel,
  ResizablePanelGroup,
  ResizableHandle,
} from "@/components/ui/resizable";
import { Upload } from "lucide-react";
import { useVideoToolStore } from "@/stores/videoToolStore";
import { convertFileSrc } from "@tauri-apps/api/core";

export function FrameViewer({ isDragOver }: { isDragOver: boolean }) {
  const theme = useMantineTheme();
  const extractVideoPath = useVideoToolStore((s) => s.extractVideoPath);
  const extractFrames = useVideoToolStore((s) => s.extractFrames);
  const extractSelectedFrame = useVideoToolStore((s) => s.extractSelectedFrame);
  const setExtractSelectedFrame = useVideoToolStore((s) => s.setExtractSelectedFrame);
  const errorMessage = useVideoToolStore((s) => s.errorMessage);
  const loadVideo = useVideoToolStore((s) => s.loadVideo);

  const borderColor = theme.colors.dark[4];
  const mutedBg = theme.colors.dark[3];

  return (
    <Box
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
        borderRadius: 8,
        border: `1px solid ${borderColor}`,
      }}
    >
      <Flex align="center" px="sm" py="xs" style={{ borderBottom: `1px solid ${borderColor}` }}>
        <Text size="xs" fw={500} c="dimmed">
          {extractFrames.length > 0 ? `提取的帧 (${extractFrames.length})` : "视频抽帧"}
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
              borderRadius: 4,
              border: `1px solid ${theme.colors.red[4]}`,
              background: `${theme.colors.red[0]}`,
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
              borderRadius: 8,
              border: `2px dashed ${theme.colors.blue[6]}`,
              background: `${theme.colors.blue[0]}`,
            }}
          >
            <Stack align="center" gap="xs" c="blue">
              <Upload size={48} />
              <Text size="sm" fw={500}>松开以加载视频</Text>
            </Stack>
          </Flex>
        )}

        {extractFrames.length > 0 ? (
          extractSelectedFrame !== null && extractFrames[extractSelectedFrame] ? (
            <ResizablePanelGroup orientation="horizontal" className="h-full">
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
                          borderRadius: 4,
                          border: `2px solid ${extractSelectedFrame === i ? theme.colors.blue[6] : "transparent"}`,
                          transition: "border-color 0.15s",
                        }}
                        onClick={() => setExtractSelectedFrame(i)}
                      >
                        <img
                          src={convertFileSrc(frame.filePath)}
                          alt={`Frame ${frame.index}`}
                          style={{ width: "100%", aspectRatio: "16/9", objectFit: "cover", display: "block" }}
                        />
                        <Box px={4} py={2} ta="center" style={{ background: mutedBg }}>
                          <Text size="xs" c="dimmed">{frame.timestamp.toFixed(2)}s</Text>
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
                      style={{ width: "100%", borderRadius: 4, border: `1px solid ${borderColor}`, display: "block" }}
                    />
                    <Stack gap={2} mt="xs">
                      <Text size="xs" c="dimmed">帧索引: {extractFrames[extractSelectedFrame].index}</Text>
                      <Text size="xs" c="dimmed">时间戳: {extractFrames[extractSelectedFrame].timestamp.toFixed(3)}s</Text>
                      <Text size="xs" c="dimmed">文件名: {extractFrames[extractSelectedFrame].filename}</Text>
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
                      borderRadius: 4,
                      border: `2px solid ${extractSelectedFrame === i ? theme.colors.blue[6] : "transparent"}`,
                      transition: "border-color 0.15s",
                    }}
                    onClick={() => setExtractSelectedFrame(i)}
                  >
                    <img
                      src={convertFileSrc(frame.filePath)}
                      alt={`Frame ${frame.index}`}
                      style={{ width: "100%", aspectRatio: "16/9", objectFit: "cover", display: "block" }}
                    />
                    <Box px={4} py={2} ta="center" style={{ background: mutedBg }}>
                      <Text size="xs" c="dimmed">{frame.timestamp.toFixed(2)}s</Text>
                    </Box>
                  </Box>
                ))}
              </Flex>
            </ScrollArea>
          )
        ) : (
          <Flex h="100%" align="center" justify="center">
            <Text size="sm" c="dimmed">
              {extractVideoPath ? "设置参数后点击\"提取帧\"" : "双击或拖拽视频文件到此处"}
            </Text>
          </Flex>
        )}
      </Box>
    </Box>
  );
}
