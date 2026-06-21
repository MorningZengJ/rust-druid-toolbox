import { useEffect, useRef } from "react";
import { Box, Flex, Text, ScrollArea, useMantineTheme, useComputedColorScheme } from "@mantine/core";
import { useTranslation } from "react-i18next";

interface LogEntry {
  level: string;
  message: string;
}

interface LogPanelProps {
  logs: LogEntry[];
  height?: number;
}

export function LogPanel({ logs, height = 140 }: LogPanelProps) {
  const { t } = useTranslation("common");
  const logEndRef = useRef<HTMLDivElement>(null);
  const theme = useMantineTheme();
  const colorScheme = useComputedColorScheme();
  const isDark = colorScheme === "dark";

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const getLogColor = (level: string) => {
    if (level === "error") return theme.colors.red[isDark ? 4 : 6];
    if (level === "warn") return theme.colors.yellow[isDark ? 4 : 6];
    return isDark ? theme.colors.dark[2] : theme.colors.gray[6];
  };

  return (
    <Box
      h={height}
      style={{
        flexShrink: 0,
        borderTop: `1px solid ${isDark ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.06)"}`,
      }}
    >
      <Box
        px="sm"
        py={6}
        style={{
          borderBottom: `1px solid ${isDark ? "rgba(255, 255, 255, 0.04)" : "rgba(0, 0, 0, 0.04)"}`,
          backgroundColor: isDark ? "rgba(255, 255, 255, 0.02)" : "rgba(0, 0, 0, 0.01)",
        }}
      >
        <Text size="xs" fw={600} c="dimmed">{t("labels.log")}</Text>
      </Box>
      <ScrollArea h={height - 28} p="xs">
        {logs.length > 0 ? (
          <>
            {logs.map((log, i) => (
              <Text key={i} size="xs" py={2} c={getLogColor(log.level)}>
                {log.message}
              </Text>
            ))}
            <div ref={logEndRef} />
          </>
        ) : (
          <Flex h="100%" align="center" justify="center">
            <Text size="xs" c="dimmed">{t("messages.noData")}</Text>
          </Flex>
        )}
      </ScrollArea>
    </Box>
  );
}
