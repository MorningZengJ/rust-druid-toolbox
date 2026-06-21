import { Flex, Text, Button, Stack, useMantineTheme, useComputedColorScheme } from "@mantine/core";
import { AlertCircle, AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";

interface FfmpegWarningProps {
  onRetry: () => void;
  variant?: "default" | "warning";
}

export function FfmpegWarning({ onRetry, variant = "default" }: FfmpegWarningProps) {
  const { t } = useTranslation("videoTool");
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
        <Text fw={600} size="lg">{t("ffmpeg.notInstalled")}</Text>
        <Text size="sm" c="dimmed" ta="center" maw={360}>
          {t("ffmpeg.notInstalledDesc")}
        </Text>
        <Button mt="sm" onClick={onRetry} radius="md">
          {t("ffmpeg.recheck")}
        </Button>
      </Stack>
    </Flex>
  );
}
