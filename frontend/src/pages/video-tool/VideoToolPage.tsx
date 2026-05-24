import { useEffect } from "react";
import { Button, Tabs, Box, Text, Stack, Group, Center, useMantineTheme, useComputedColorScheme } from "@mantine/core";
import {
  Merge,
  Images,
  RefreshCw,
  Film,
  AlertCircle,
} from "lucide-react";
import { useVideoToolStore } from "@/stores/videoToolStore";
import type { VideoToolTab } from "@/types";
import { MergePanel } from "./MergePanel";
import { ImagesPanel } from "./ImagesPanel";
import { ConvertPanel } from "./ConvertPanel";
import { ExtractPanel } from "./ExtractPanel";

export default function VideoToolPage() {
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
          <AlertCircle size={48} color="gray" />
          <Text size="lg" fw={600}>FFmpeg 未安装</Text>
          <Text size="sm" c="dimmed">
            视频工具需要 FFmpeg 支持，请先安装 FFmpeg 并确保其在系统 PATH 中。
          </Text>
          <Button mt="md" onClick={checkFfmpeg}>
            重新检测
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
          <AlertCircle size={48} color="gray" />
          <Text size="lg" fw={600}>缺少视频编码器</Text>
          <Text size="sm" c="dimmed">
            FFmpeg 已安装，但未找到可用的视频编码器（libx264/libx265/mpeg4）。
            <br />
            请安装包含完整编码器的 FFmpeg 版本。
          </Text>
          <Box ta="left" mt="md">
            <Text size="xs" fw={500}>编码器状态：</Text>
            {Object.entries(encoderStatus).map(([name, available]) => (
              <Group key={name} gap="xs">
                <Text size="xs" c={available ? "green" : "red"}>
                  {available ? "✓" : "✗"}
                </Text>
                <Text size="xs">{name}</Text>
              </Group>
            ))}
          </Box>
          <Button mt="md" onClick={checkEncoders}>
            重新检测
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
        border: `1px solid ${theme.colors.dark[4]}`,
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
              合并视频
            </Tabs.Tab>
            <Tabs.Tab value="images" leftSection={<Images size={16} />}>
              图片转视频
            </Tabs.Tab>
            <Tabs.Tab value="convert" leftSection={<RefreshCw size={16} />}>
              格式转换
            </Tabs.Tab>
            <Tabs.Tab value="extract" leftSection={<Film size={16} />}>
              抽帧
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
