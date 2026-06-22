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
} from "@mantine/core";
import {
  Play,
  FolderOpen,
  Loader2,
  Film,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useVideoToolStore } from "@/stores/videoToolStore";
import { formatTime } from "@/utils/formatTime";
import type { ExtractMode, OutputFormat } from "@/types";

export function ExtractParamsPanel({
  logSection,
}: {
  logSection: React.ReactNode;
}) {
  const { t } = useTranslation("videoTool");
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

  const handleBrowseOutputDir = async () => {
    const { open } = await import("@tauri-apps/plugin-dialog");
    const selected = await open({ directory: true });
    if (selected) {
      setExtractOutputDir(selected as string);
    }
  };

  const selectStyles = {
    input: {
      backgroundColor: "var(--surface-panel)",
      borderColor: "var(--border-default)",
      color: "var(--text-primary)",
    },
  };

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
        <Text size="xs" fw={500} c="dimmed" style={{ fontFamily: "var(--font-body)" }}>{t("extract.params")}</Text>
      </Flex>

      <Box style={{ flex: 1, overflowY: "auto" }}>
        <Stack gap="md" p="sm">
          {extractVideoInfo && (
            <Box p="xs" style={{ borderRadius: 8, border: "1px solid var(--border-default)", backgroundColor: "var(--surface-panel)" }}>
              <Group gap={4} mb={4}>
                <Film size={12} style={{ color: "var(--accent-primary)" }} />
                <Text size="xs" fw={500} style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "var(--font-mono)" }}>
                  {extractVideoPath.split(/[/\\]/).pop()}
                </Text>
              </Group>
              <Box style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
                <Text size="xs" c="dimmed">{t("extract.videoInfo.resolution", { width: extractVideoInfo.width, height: extractVideoInfo.height })}</Text>
                <Text size="xs" c="dimmed" style={{ fontFamily: "var(--font-mono)" }}>{t("extract.videoInfo.fps", { fps: extractVideoInfo.fps.toFixed(1) })}</Text>
                <Text size="xs" c="dimmed" style={{ fontFamily: "var(--font-mono)" }}>{t("extract.videoInfo.duration", { duration: extractVideoInfo.duration.toFixed(1) })}</Text>
                <Text size="xs" c="dimmed" style={{ fontFamily: "var(--font-mono)" }}>{t("extract.videoInfo.totalFrames", { count: extractVideoInfo.totalFrames })}</Text>
              </Box>
            </Box>
          )}

          <Stack gap={4}>
            <Text size="xs" fw={500} c="dimmed" style={{ fontFamily: "var(--font-body)" }}>{t("extract.outputPath")}</Text>
            <Group gap={4}>
              <TextInput
                size="xs"
                style={{ flex: 1 }}
                value={extractOutputDir}
                onChange={(e) => setExtractOutputDir(e.currentTarget.value)}
                placeholder={t("extract.outputPathPlaceholder")}
                styles={{
                  input: {
                    fontFamily: "var(--font-mono)",
                    backgroundColor: "var(--surface-panel)",
                    borderColor: "var(--border-default)",
                    color: "var(--text-primary)",
                  },
                }}
              />
              <Button variant="outline" size="compact-sm" style={{ width: 32, height: 32, padding: 0 }} onClick={handleBrowseOutputDir}>
                <FolderOpen size={14} />
              </Button>
            </Group>
          </Stack>

          <Stack gap={4}>
            <Text size="xs" fw={500} c="dimmed" style={{ fontFamily: "var(--font-body)" }}>{t("extract.extractMode")}</Text>
            <Select
              size="xs"
              value={extractParams.mode}
              onChange={(v) => v && setExtractParams({ mode: v as ExtractMode })}
              data={[
                { value: "allFrames", label: t("extract.modes.allFrames") },
                { value: "byInterval", label: t("extract.modes.byInterval") },
                { value: "byCount", label: t("extract.modes.byCount") },
                { value: "byTimePoints", label: t("extract.modes.byTimePoints") },
              ]}
              styles={selectStyles}
            />
          </Stack>

          {extractParams.mode === "byInterval" && (
            <Stack gap={4}>
              <Text size="xs" fw={500} c="dimmed" style={{ fontFamily: "var(--font-body)" }}>
                {t("extract.interval", { value: extractParams.intervalSecs.toFixed(1) })}
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
              <Text size="xs" fw={500} c="dimmed" style={{ fontFamily: "var(--font-body)" }}>{t("extract.frameCount")}</Text>
              <NumberInput
                size="xs"
                value={extractParams.frameCount}
                onChange={(v) => setExtractParams({ frameCount: typeof v === "number" ? v : 10 })}
                min={1}
                max={1000}
                styles={selectStyles}
              />
            </Stack>
          )}

          {extractParams.mode === "byTimePoints" && (
            <Stack gap={4}>
              <Text size="xs" fw={500} c="dimmed" style={{ fontFamily: "var(--font-body)" }}>
                {t("extract.timePoints")}
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
                styles={{
                  input: {
                    fontFamily: "var(--font-mono)",
                    backgroundColor: "var(--surface-panel)",
                    borderColor: "var(--border-default)",
                    color: "var(--text-primary)",
                  },
                }}
              />
            </Stack>
          )}

          <Stack gap={4}>
            <Text size="xs" fw={500} c="dimmed" style={{ fontFamily: "var(--font-body)" }}>{t("extract.outputFormat")}</Text>
            <Select
              size="xs"
              value={extractParams.outputFormat}
              onChange={(v) => v && setExtractParams({ outputFormat: v as OutputFormat })}
              data={[
                { value: "png", label: "PNG" },
                { value: "jpeg", label: "JPEG" },
              ]}
              styles={selectStyles}
            />
          </Stack>

          {extractParams.outputFormat === "jpeg" && (
            <Stack gap={4}>
              <Text size="xs" fw={500} c="dimmed" style={{ fontFamily: "var(--font-body)" }}>
                {t("extract.jpegQuality", { value: extractParams.jpegQuality })}
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
            <Text size="xs" fw={500} c="dimmed" style={{ fontFamily: "var(--font-body)" }}>
              {t("extract.scaleWidth")}
            </Text>
            <NumberInput
              size="xs"
              placeholder={t("extract.scaleWidthPlaceholder")}
              value={extractParams.resizeWidth ?? undefined}
              onChange={(v) => {
                setExtractParams({ resizeWidth: typeof v === "number" ? v : undefined });
              }}
              styles={selectStyles}
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
                {t("extract.extracting", { progress: extractProgress.toFixed(0) })}
                {extractEstimatedTimeRemaining !== null && extractEstimatedTimeRemaining > 0 && (
                  <Text span ml={4}>· {t("extract.timeRemaining", { time: formatTime(extractEstimatedTimeRemaining) })}</Text>
                )}
              </>
            ) : (
              t("extract.startExtract")
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
