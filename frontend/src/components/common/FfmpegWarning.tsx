import { Flex, Text, Button, Stack, useMantineTheme, useComputedColorScheme } from "@mantine/core";
import { AlertCircle, AlertTriangle } from "lucide-react";

interface FfmpegWarningProps {
  onRetry: () => void;
  variant?: "default" | "warning";
}

export function FfmpegWarning({ onRetry, variant = "default" }: FfmpegWarningProps) {
  const theme = useMantineTheme();
  const colorScheme = useComputedColorScheme();
  const isDark = colorScheme === "dark";
  const Icon = variant === "warning" ? AlertTriangle : AlertCircle;

  return (
    <Flex h="100%" align="center" justify="center">
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
          <Icon size={32} style={{ color: isDark ? theme.colors.dark[2] : theme.colors.gray[5] }} />
        </div>
        <Text fw={600} size="lg">FFmpeg 未安装</Text>
        <Text size="sm" c="dimmed" ta="center" maw={360}>
          此功能需要 FFmpeg 支持，请先安装 FFmpeg 并确保其在系统 PATH 中。
        </Text>
        <Button mt="sm" onClick={onRetry} radius="md">
          重新检测
        </Button>
      </Stack>
    </Flex>
  );
}
