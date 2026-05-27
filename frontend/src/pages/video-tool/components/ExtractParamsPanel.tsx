import {
  Button,
  TextInput,
  NumberInput,
  Select,
  Slider,
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
  Film,
} from "lucide-react";
import { useVideoToolStore } from "@/stores/videoToolStore";
import { formatTime } from "@/utils/formatTime";
import type { ExtractMode, OutputFormat } from "@/types";

export function ExtractParamsPanel({
  logSection,
}: {
  logSection: React.ReactNode;
}) {
  const theme = useMantineTheme();
  const extractVideoPath = useVideoToolStore((s) => s.extractVideoPath);
  const extractVideoInfo = useVideoToolStore((s) => s.extractVideoInfo);
  const extractParams = useVideoToolStore((s) => s.extractParams);
  const setExtractParams = useVideoToolStore((s) => s.setExtractParams);
  const isExtracting = useVideoToolStore((s) => s.isExtracting);
  const extractProgress = useVideoToolStore((s) => s.extractProgress);
  const runExtractFrames = useVideoToolStore((s) => s.runExtractFrames);
  const extractOutputDir = useVideoToolStore((s) => s.extractOutputDir);
  const setExtractOutputDir = useVideoToolStore((s) => s.setExtractOutputDir);
  const extractEstimatedTimeRemaining = useVideoToolStore((s) => s.extractEstimatedTimeRemaining);

  const borderColor = theme.colors.dark[4];
  const mutedBg = theme.colors.dark[3];

  const handleBrowseOutputDir = async () => {
    const { open } = await import("@tauri-apps/plugin-dialog");
    const selected = await open({ directory: true });
    if (selected) {
      setExtractOutputDir(selected as string);
    }
  };

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
            leftSection={isExtracting ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Play size={14} />}
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

      {logSection}
    </Box>
  );
}
