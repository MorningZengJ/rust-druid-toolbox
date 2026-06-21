import { useEffect } from "react";
import { Button, Tabs, Box, Text, Stack, Group, Center, useMantineTheme, useComputedColorScheme } from "@mantine/core";
import {
  Merge,
  Images,
  RefreshCw,
  Film,
  AlertCircle,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useVideoToolStore } from "@/stores/videoToolStore";
import type { VideoToolTab } from "@/types";
import { MergePanel } from "./MergePanel";
import { ImagesPanel } from "./ImagesPanel";
import { ConvertPanel } from "./ConvertPanel";
import { ExtractPanel } from "./ExtractPanel";

export default function VideoToolPage() {
  const { t } = useTranslation("videoTool");
  const ffmpegAvailable = useVideoToolStore((s) => s.ffmpegAvailable);
  const checkFfmpeg = useVideoToolStore((s) => s.checkFfmpeg);
  const encoderStatus = useVideoToolStore((s) => s.encoderStatus);
  const checkEncoders = useVideoToolStore((s) => s.checkEncoders);
  const activeTab = useVideoToolStore((s) => s.activeTab);
  const setActiveTab = useVideoToolStore((s) => s.setActiveTab);
  const theme = useMantineTheme();
  const colorScheme = useComputedColorScheme();
  const isDark = colorScheme === "dark";

  useEffect(() => {
    checkFfmpeg();
    checkEncoders();
  }, [checkFfmpeg, checkEncoders]);

  if (!ffmpegAvailable) {
    return (
      <Center h="100%">
        <Stack align="center" gap="md">
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              backgroundColor: isDark ? "rgba(255, 255, 255, 0.04)" : "rgba(0, 0, 0, 0.03)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <AlertCircle size={32} style={{ color: isDark ? theme.colors.dark[2] : theme.colors.gray[5] }} />
          </div>
          <Text size="lg" fw={600}>{t("ffmpeg.notInstalled")}</Text>
          <Text size="sm" c="dimmed" ta="center" maw={360}>
            {t("ffmpeg.notInstalledDesc")}
          </Text>
          <Button mt="md" onClick={checkFfmpeg} radius="md">
            {t("ffmpeg.recheck")}
          </Button>
        </Stack>
      </Center>
    );
  }

  const hasX264 = encoderStatus["libx264"] || encoderStatus["libx264rgb"];
  const hasX265 = encoderStatus["libx265"];
  const hasMpeg4 = encoderStatus["mpeg4"];
  const hasGif = encoderStatus["gif"];
  const hasAnyVideoEncoder = hasX264 || hasX265 || hasMpeg4 || hasGif;

  if (!hasAnyVideoEncoder) {
    return (
      <Center h="100%">
        <Stack align="center" gap="md">
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              backgroundColor: isDark ? "rgba(255, 255, 255, 0.04)" : "rgba(0, 0, 0, 0.03)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <AlertCircle size={32} style={{ color: isDark ? theme.colors.dark[2] : theme.colors.gray[5] }} />
          </div>
          <Text size="lg" fw={600}>{t("ffmpeg.noEncoder")}</Text>
          <Text size="sm" c="dimmed" ta="center" maw={400}>
            {t("ffmpeg.noEncoderDesc")}
            <br />
            {t("ffmpeg.installHint")}
          </Text>
          <Box
            ta="left"
            mt="md"
            p="md"
            style={{
              borderRadius: theme.radius.md,
              border: `1px solid ${isDark ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.06)"}`,
              backgroundColor: isDark ? theme.colors.dark[7] : theme.white,
            }}
          >
            <Text size="xs" fw={600} mb="xs">{t("ffmpeg.encoderStatus")}</Text>
            {Object.entries(encoderStatus).map(([name, available]) => (
              <Group key={name} gap="xs">
                <Text size="xs" c={available ? "green" : "red"}>
                  {available ? "✓" : "✗"}
                </Text>
                <Text size="xs">{name}</Text>
              </Group>
            ))}
          </Box>
          <Button mt="md" onClick={checkEncoders} radius="md">
            {t("ffmpeg.recheck")}
          </Button>
        </Stack>
      </Center>
    );
  }

  return (
    <Box
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
        borderRadius: theme.radius.lg,
        border: `1px solid ${isDark ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.06)"}`,
        backgroundColor: isDark ? theme.colors.dark[7] : theme.white,
      }}
    >
      <Tabs
        value={activeTab}
        onChange={(v) => setActiveTab(v as VideoToolTab)}
        style={{ display: "flex", flexDirection: "column", height: "100%" }}
      >
        <Box px="sm" pt="sm">
          <Tabs.List>
            <Tabs.Tab value="merge" leftSection={<Merge size={16} />}>
              {t("tabs.merge")}
            </Tabs.Tab>
            <Tabs.Tab value="images" leftSection={<Images size={16} />}>
              {t("tabs.images")}
            </Tabs.Tab>
            <Tabs.Tab value="convert" leftSection={<RefreshCw size={16} />}>
              {t("tabs.convert")}
            </Tabs.Tab>
            <Tabs.Tab value="extract" leftSection={<Film size={16} />}>
              {t("tabs.extract")}
            </Tabs.Tab>
          </Tabs.List>
        </Box>

        <Box p="sm" style={{ flex: 1, minHeight: 0 }}>
          <Tabs.Panel value="merge" style={{ height: "100%" }}>
            <MergePanel />
          </Tabs.Panel>
          <Tabs.Panel value="images" style={{ height: "100%" }}>
            <ImagesPanel />
          </Tabs.Panel>
          <Tabs.Panel value="convert" style={{ height: "100%" }}>
            <ConvertPanel />
          </Tabs.Panel>
          <Tabs.Panel value="extract" style={{ height: "100%" }}>
            <ExtractPanel />
          </Tabs.Panel>
        </Box>
      </Tabs>
    </Box>
  );
}
