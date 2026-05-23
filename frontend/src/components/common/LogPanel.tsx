import { useEffect, useRef } from "react";
import { Box, Flex, Text, ScrollArea, useMantineTheme } from "@mantine/core";

interface LogEntry {
  level: string;
  message: string;
}

interface LogPanelProps {
  logs: LogEntry[];
  height?: number;
}

export function LogPanel({ logs, height = 140 }: LogPanelProps) {
  const logEndRef = useRef<HTMLDivElement>(null);
  const theme = useMantineTheme();

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const getLogColor = (level: string) => {
    if (level === "error") return theme.colors.red[6];
    if (level === "warn") return theme.colors.yellow[6];
    return theme.colors.gray[6];
  };

  return (
    <Box
      h={height}
      style={{
        flexShrink: 0,
        borderTop: `1px solid ${theme.colors.gray[3]}`,
      }}
    >
      <Box
        px="sm"
        py={6}
        style={{ borderBottom: `1px solid ${theme.colors.gray[3]}` }}
      >
        <Text size="xs" fw={500} c="dimmed">日志</Text>
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
            <Text size="xs" c="dimmed">暂无日志</Text>
          </Flex>
        )}
      </ScrollArea>
    </Box>
  );
}
