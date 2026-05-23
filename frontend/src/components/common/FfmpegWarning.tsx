import { Flex, Text, Button, Stack } from "@mantine/core";
import { AlertCircle, AlertTriangle } from "lucide-react";

interface FfmpegWarningProps {
  onRetry: () => void;
  variant?: "default" | "warning";
}

export function FfmpegWarning({ onRetry, variant = "default" }: FfmpegWarningProps) {
  const Icon = variant === "warning" ? AlertTriangle : AlertCircle;

  return (
    <Flex h="100%" align="center" justify="center">
      <Stack align="center" gap="sm">
        <Icon size={48} style={{ color: "var(--mantine-color-dimmed)" }} />
        <Text fw={600} size="lg">FFmpeg 未安装</Text>
        <Text size="sm" c="dimmed">
          此功能需要 FFmpeg 支持，请先安装 FFmpeg 并确保其在系统 PATH 中。
        </Text>
        <Button mt="sm" onClick={onRetry}>
          重新检测
        </Button>
      </Stack>
    </Flex>
  );
}
