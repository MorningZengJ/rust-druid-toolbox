import {
  Stack,
  Flex,
  Box,
  Text,
  Slider,
  TextInput,
  NumberInput,
  Select,
  Button,
  Progress,
  ScrollArea,
  useMantineTheme,
} from "@mantine/core";
import { Play, Loader2, Film } from "lucide-react";
import { useVideoFrameStore } from "@/stores/videoFrameStore";
import { DirectoryPicker } from "@/components/common/DirectoryPicker";
import { LogPanel } from "@/components/common/LogPanel";
import type { ExtractMode, OutputFormat } from "@/types";

function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds}秒`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs > 0 ? `${mins}分${secs}秒` : `${mins}分`;
}

export function ParamsPanel() {
  const videoPath = useVideoFrameStore((s) => s.videoPath);
  const videoInfo = useVideoFrameStore((s) => s.videoInfo);
  const extractParams = useVideoFrameStore((s) => s.extractParams);
  const setExtractParams = useVideoFrameStore((s) => s.setExtractParams);
  const isExtracting = useVideoFrameStore((s) => s.isExtracting);
  const progress = useVideoFrameStore((s) => s.progress);
  const extractFrames = useVideoFrameStore((s) => s.extractFrames);
  const outputDir = useVideoFrameStore((s) => s.outputDir);
  const setOutputDir = useVideoFrameStore((s) => s.setOutputDir);
  const logs = useVideoFrameStore((s) => s.logs);
  const estimatedTimeRemaining = useVideoFrameStore((s) => s.estimatedTimeRemaining);
  const theme = useMantineTheme();

  return (
    <Box
      w={280}
      style={{
        flexShrink: 0,
        borderRadius: theme.radius.md,
        border: `1px solid ${theme.colors.gray[3]}`,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Flex align="center" px="sm" py="xs" style={{ borderBottom: `1px solid ${theme.colors.gray[3]}` }}>
        <Text size="xs" fw={500} c="dimmed">参数设置</Text>
      </Flex>

      <ScrollArea style={{ flex: 1 }}>
        <Stack gap="md" p="sm">
          {videoInfo && (
            <Box p="xs" style={{ border: `1px solid ${theme.colors.gray[3]}`, borderRadius: theme.radius.sm, backgroundColor: theme.colors.gray[0] }}>
              <Flex align="center" gap={4} mb={4}>
                <Film size={12} style={{ color: "var(--mantine-color-dimmed)" }} />
                <Text size="xs" fw={500} truncate>{videoPath.split(/[/\\]/).pop()}</Text>
              </Flex>
              <Box style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
                <Text size="xs" c="dimmed">分辨率: {videoInfo.width}x{videoInfo.height}</Text>
                <Text size="xs" c="dimmed">帧率: {videoInfo.fps.toFixed(1)} fps</Text>
                <Text size="xs" c="dimmed">时长: {videoInfo.duration.toFixed(1)}s</Text>
                <Text size="xs" c="dimmed">总帧数: {videoInfo.totalFrames}</Text>
              </Box>
            </Box>
          )}

          <Box>
            <Text size="xs" fw={500} c="dimmed" mb={4}>帧图存放路径</Text>
            <DirectoryPicker value={outputDir} onChange={setOutputDir} />
          </Box>

          <Box>
            <Text size="xs" fw={500} c="dimmed" mb={4}>提取模式</Text>
            <Select
              size="xs"
              value={extractParams.mode}
              onChange={(v) => setExtractParams({ mode: (v ?? "allFrames") as ExtractMode })}
              data={[
                { value: "allFrames", label: "全部帧" },
                { value: "byInterval", label: "按间隔" },
                { value: "byCount", label: "按数量" },
                { value: "byTimePoints", label: "按时间点" },
              ]}
            />
          </Box>

          {extractParams.mode === "byInterval" && (
            <Box>
              <Text size="xs" fw={500} c="dimmed" mb={4}>
                间隔: {extractParams.intervalSecs.toFixed(1)} 秒
              </Text>
              <Slider
                size="xs"
                value={extractParams.intervalSecs}
                onChange={(v) => setExtractParams({ intervalSecs: v })}
                min={0.1}
                max={30}
                step={0.1}
              />
            </Box>
          )}

          {extractParams.mode === "byCount" && (
            <Box>
              <Text size="xs" fw={500} c="dimmed" mb={4}>帧数量</Text>
              <NumberInput
                size="xs"
                value={extractParams.frameCount}
                onChange={(v) => setExtractParams({ frameCount: typeof v === "number" ? v : 10 })}
                min={1}
                max={1000}
              />
            </Box>
          )}

          {extractParams.mode === "byTimePoints" && (
            <Box>
              <Text size="xs" fw={500} c="dimmed" mb={4}>时间点（秒，逗号分隔）</Text>
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
            </Box>
          )}

          <Box>
            <Text size="xs" fw={500} c="dimmed" mb={4}>输出格式</Text>
            <Select
              size="xs"
              value={extractParams.outputFormat}
              onChange={(v) => setExtractParams({ outputFormat: (v ?? "png") as OutputFormat })}
              data={[
                { value: "png", label: "PNG" },
                { value: "jpeg", label: "JPEG" },
              ]}
            />
          </Box>

          {extractParams.outputFormat === "jpeg" && (
            <Box>
              <Text size="xs" fw={500} c="dimmed" mb={4}>
                JPEG 质量: {extractParams.jpegQuality}
              </Text>
              <Slider
                size="xs"
                value={extractParams.jpegQuality}
                onChange={(v) => setExtractParams({ jpegQuality: v })}
                min={1}
                max={100}
                step={1}
              />
            </Box>
          )}

          <Box>
            <Text size="xs" fw={500} c="dimmed" mb={4}>缩放宽度（留空不缩放）</Text>
            <NumberInput
              size="xs"
              placeholder="原始宽度"
              value={extractParams.resizeWidth ?? undefined}
              onChange={(v) => {
                setExtractParams({ resizeWidth: typeof v === "number" ? v : undefined });
              }}
            />
          </Box>

          <Button
            fullWidth
            size="compact-sm"
            disabled={!videoPath || isExtracting}
            onClick={extractFrames}
            leftSection={isExtracting
              ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
              : <Play size={14} />
            }
          >
            {isExtracting
              ? `提取中 ${progress.toFixed(0)}%${estimatedTimeRemaining !== null && estimatedTimeRemaining > 0 ? ` · 剩余 ${formatTime(estimatedTimeRemaining)}` : ""}`
              : "提取帧"
            }
          </Button>

          {isExtracting && <Progress value={progress} size="xs" radius="xl" />}
        </Stack>
      </ScrollArea>

      <LogPanel logs={logs} height={140} />
    </Box>
  );
}
