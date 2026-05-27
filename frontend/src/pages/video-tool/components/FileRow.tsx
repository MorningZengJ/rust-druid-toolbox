import { Button, Flex, Text, useMantineTheme } from "@mantine/core";
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
  const theme = useMantineTheme();
  const statusIcon = {
    pending: <Circle size={10} color={theme.colors.gray[5]} fill={theme.colors.gray[5]} />,
    converting: <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} color={theme.colors.blue[6]} />,
    done: <CheckCircle2 size={12} color={theme.colors.green[6]} />,
    error: <XCircle size={12} color={theme.colors.red[6]} />,
  };

  return (
    <Flex
      align="center"
      gap={4}
      px="xs"
      py={4}
      style={{ borderRadius: 4, background: theme.colors.dark[3] }}
    >
      {statusIcon[file.status]}
      <Text
        size="xs"
        style={{
          flex: 1,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
        title={file.inputPath}
      >
        {file.inputPath.split(/[/\\]/).pop()}
      </Text>
      {file.error && (
        <Text
          size="xs"
          c="red"
          title={file.error}
          style={{ maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
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
