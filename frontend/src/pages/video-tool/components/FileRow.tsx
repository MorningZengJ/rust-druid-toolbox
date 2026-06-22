import { Button, Flex, Text } from "@mantine/core";
import { Loader2, Circle, CheckCircle2, XCircle, Trash2 } from "lucide-react";
import type { ConvertFileItem } from "@/types";

export function FileRow({
  file,
  index,
  onRemove,
  isProcessing,
}: {
  file: ConvertFileItem;
  index: number;
  onRemove: (index: number) => void;
  isProcessing: boolean;
}) {
  const statusIcon = {
    pending: <Circle size={10} style={{ color: "var(--text-muted)" }} fill="var(--text-muted)" />,
    converting: <Loader2 size={12} style={{ animation: "spin 1s linear infinite", color: "var(--accent-primary)" }} />,
    done: <CheckCircle2 size={12} style={{ color: "var(--status-success)" }} />,
    error: <XCircle size={12} style={{ color: "var(--status-error)" }} />,
  };

  return (
    <Flex
      align="center"
      gap={4}
      px="xs"
      py={4}
      style={{
        borderRadius: 6,
        backgroundColor: "var(--surface-panel)",
        border: "1px solid var(--border-subtle)",
      }}
    >
      {statusIcon[file.status]}
      <Text
        size="xs"
        style={{
          flex: 1,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          fontFamily: "var(--font-mono)",
        }}
        title={file.inputPath}
      >
        {file.inputPath.split(/[/\\]/).pop()}
      </Text>
      {file.error && (
        <Text
          size="xs"
          style={{
            color: "var(--status-error)",
            maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}
          title={file.error}
        >
          {file.error}
        </Text>
      )}
      <Button
        size="compact-xs"
        variant="subtle"
        color="red"
        style={{ width: 20, height: 20, padding: 0, minWidth: 20 }}
        onClick={() => onRemove(index)}
        disabled={isProcessing}
      >
        <Trash2 size={12} />
      </Button>
    </Flex>
  );
}
