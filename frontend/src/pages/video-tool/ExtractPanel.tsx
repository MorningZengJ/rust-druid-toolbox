import { useEffect, useRef, useState } from "react";
import {
  Button,
  TextInput,
  NumberInput,
  Select,
  Slider,
  ScrollArea,
  Box,
  Flex,
  Text,
  Stack,
  Group,
  Progress,
  useMantineTheme,
} from "@mantine/core";
import {
  Play,
  FolderOpen,
  Loader2,
  Upload,
  Film,
} from "lucide-react";
import {
  ResizablePanel,
  ResizablePanelGroup,
  ResizableHandle,
} from "@/components/ui/resizable";
import { useVideoToolStore } from "@/stores/videoToolStore";
import { convertFileSrc } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import type { ExtractMode, OutputFormat } from "@/types";

export function ExtractPanel() {
  const theme = useMantineTheme();
  const extractVideoPath = useVideoToolStore((s) => s.extractVideoPath);
  const extractVideoInfo = useVideoToolStore((s) => s.extractVideoInfo);
  const extractParams = useVideoToolStore((s) => s.extractParams);
  const setExtractParams = useVideoToolStore((s) => s.setExtractParams);
  const extractFrames = useVideoToolStore((s) => s.extractFrames);
  const isExtracting = useVideoToolStore((s) => s.isExtracting);
  const extractProgress = useVideoToolStore((s) => s.extractProgress);
  const errorMessage = useVideoToolStore((s) => s.errorMessage);
  const extractSelectedFrame = useVideoToolStore((s) => s.extractSelectedFrame);
  const setExtractSelectedFrame = useVideoToolStore((s) => s.setExtractSelectedFrame);
  const loadVideo = useVideoToolStore((s) => s.loadVideo);
  const runExtractFrames = useVideoToolStore((s) => s.runExtractFrames);
  const extractOutputDir = useVideoToolStore((s) => s.extractOutputDir);
  const setExtractOutputDir = useVideoToolStore((s) => s.setExtractOutputDir);
  const stopExtractWatcher = useVideoToolStore((s) => s.stopExtractWatcher);
  const extractLogs = useVideoToolStore((s) => s.extractLogs);
  const extractEstimatedTimeRemaining = useVideoToolStore((s) => s.extractEstimatedTimeRemaining);

  const [isDragOver, setIsDragOver] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [extractLogs]);

  const handleBrowseOutputDir = async () => {
    const { open } = await import("@tauri-apps/plugin-dialog");
    const selected = await open({ directory: true });
    if (selected) {
      setExtractOutputDir(selected as string);
    }
  };

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

  function formatTime(seconds: number): string {
    if (seconds < 60) return `${seconds}秒`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${mins}分${secs}秒` : `${mins}分`;
  }

  const borderColor = theme.colors.dark[4];
  const mutedBg = theme.colors.dark[3];

  return (
    <>
      {/* Left: Controls */}
      <Box
        w={280}
        style={{
          display: "flex",
          flexDirection: "column",
          borderRadius: 8,
          border: `1px solid ${borderColor}`,
          flexShrink: 0,
          overflow: "hidden",
        }}
      >
        <Flex align="center" px="sm" py="xs" style={{ borderBottom: `1px solid ${borderColor}` }}>
          <Text size="xs" fw={500} c="dimmed">参数设置</Text>
        </Flex>

        <Box style={{ flex: 1, overflowY: "auto" }}>
          <Stack gap="md" p="sm">
            {extractVideoInfo && (
              <Box p="xs" style={{ borderRadius: 4, border: `1px solid ${borderColor}`, background: mutedBg }}>
                <Group gap={4} mb={4}>
                  <Film size={12} color={theme.colors.dark[2]} />
                  <Text size="xs" fw={500} style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {extractVideoPath.split(/[/\\]/).pop()}
                  </Text>
                </Group>
                <Box style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
                  <Text size="xs" c="dimmed">分辨率: {extractVideoInfo.width}x{extractVideoInfo.height}</Text>
                  <Text size="xs" c="dimmed">帧率: {extractVideoInfo.fps.toFixed(1)} fps</Text>
                  <Text size="xs" c="dimmed">时长: {extractVideoInfo.duration.toFixed(1)}s</Text>
                  <Text size="xs" c="dimmed">总帧数: {extractVideoInfo.totalFrames}</Text>
                </Box>
              </Box>
            )}

            <Stack gap={4}>
              <Text size="xs" fw={500} c="dimmed">帧图存放路径</Text>
              <Group gap={4}>
                <TextInput
                  size="xs"
                  style={{ flex: 1 }}
                  value={extractOutputDir}
                  onChange={(e) => setExtractOutputDir(e.currentTarget.value)}
                  placeholder="选择或输入路径"
                />
                <Button variant="outline" size="compact-sm" style={{ width: 32, height: 32, padding: 0 }} onClick={handleBrowseOutputDir}>
                  <FolderOpen size={14} />
                </Button>
              </Group>
            </Stack>

            <Stack gap={4}>
              <Text size="xs" fw={500} c="dimmed">提取模式</Text>
              <Select
                size="xs"
                value={extractParams.mode}
                onChange={(v) => v && setExtractParams({ mode: v as ExtractMode })}
                data={[
                  { value: "allFrames", label: "全部帧" },
                  { value: "byInterval", label: "按间隔" },
                  { value: "byCount", label: "按数量" },
                  { value: "byTimePoints", label: "按时间点" },
                ]}
              />
            </Stack>

            {extractParams.mode === "byInterval" && (
              <Stack gap={4}>
                <Text size="xs" fw={500} c="dimmed">
                  间隔: {extractParams.intervalSecs.toFixed(1)} 秒
                </Text>
                <Slider
                  value={extractParams.intervalSecs}
                  onChange={(v) => setExtractParams({ intervalSecs: v })}
                  min={0.1}
                  max={30}
                  step={0.1}
                />
              </Stack>
            )}

            {extractParams.mode === "byCount" && (
              <Stack gap={4}>
                <Text size="xs" fw={500} c="dimmed">帧数量</Text>
                <NumberInput
                  size="xs"
                  value={extractParams.frameCount}
                  onChange={(v) => setExtractParams({ frameCount: typeof v === "number" ? v : 10 })}
                  min={1}
                  max={1000}
                />
              </Stack>
            )}

            {extractParams.mode === "byTimePoints" && (
              <Stack gap={4}>
                <Text size="xs" fw={500} c="dimmed">
                  时间点（秒，逗号分隔）
                </Text>
                <TextInput
                  size="xs"
                  placeholder="1.0, 5.0, 10.0"
                  onChange={(e) => {
                    const points = e.currentTarget.value
                      .split(",")
                      .map((s) => parseFloat(s.trim()))
                      .filter((n) => !isNaN(n));
                    setExtractParams({ timePoints: points });
                  }}
                />
              </Stack>
            )}

            <Stack gap={4}>
              <Text size="xs" fw={500} c="dimmed">输出格式</Text>
              <Select
                size="xs"
                value={extractParams.outputFormat}
                onChange={(v) => v && setExtractParams({ outputFormat: v as OutputFormat })}
                data={[
                  { value: "png", label: "PNG" },
                  { value: "jpeg", label: "JPEG" },
                ]}
              />
            </Stack>

            {extractParams.outputFormat === "jpeg" && (
              <Stack gap={4}>
                <Text size="xs" fw={500} c="dimmed">
                  JPEG 质量: {extractParams.jpegQuality}
                </Text>
                <Slider
                  value={extractParams.jpegQuality}
                  onChange={(v) => setExtractParams({ jpegQuality: v })}
                  min={1}
                  max={100}
                  step={1}
                />
              </Stack>
            )}

            <Stack gap={4}>
              <Text size="xs" fw={500} c="dimmed">
                缩放宽度（留空不缩放）
              </Text>
              <NumberInput
                size="xs"
                placeholder="原始宽度"
                value={extractParams.resizeWidth ?? undefined}
                onChange={(v) => {
                  setExtractParams({ resizeWidth: typeof v === "number" ? v : undefined });
                }}
              />
            </Stack>

            <Button
              fullWidth
              disabled={!extractVideoPath || isExtracting}
              onClick={runExtractFrames}
              leftSection={isExtracting ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
            >
              {isExtracting ? (
                <>
                  提取中 {extractProgress.toFixed(0)}%
                  {extractEstimatedTimeRemaining !== null && extractEstimatedTimeRemaining > 0 && (
                    <Text span ml={4}>· 剩余 {formatTime(extractEstimatedTimeRemaining)}</Text>
                  )}
                </>
              ) : (
                "提取帧"
              )}
            </Button>

            {isExtracting && (
              <Progress value={extractProgress} size="sm" radius="xl" />
            )}
          </Stack>
        </Box>

        {/* Logs */}
        <Box style={{ height: 140, flexShrink: 0, borderTop: `1px solid ${borderColor}` }}>
          <Flex align="center" px="sm" py={6} style={{ borderBottom: `1px solid ${borderColor}` }}>
            <Text size="xs" fw={500} c="dimmed">日志</Text>
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
                  >
                    {log.message}
                  </Text>
                ))}
                <div ref={logEndRef} />
              </>
            ) : (
              <Flex h="100%" align="center" justify="center">
                <Text size="xs" c="dimmed">暂无日志</Text>
              </Flex>
            )}
          </Box>
        </Box>
      </Box>

      {/* Right: Frame grid */}
      <Box
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
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
    </>
  );
}
