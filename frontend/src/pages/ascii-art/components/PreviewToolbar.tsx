import {
  Flex,
  Text,
  Button,
  ActionIcon,
  Tabs,
  Menu,
} from "@mantine/core";
import {
  Copy,
  Download,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Loader2,
  Image as ImageIcon,
  FileDown,
} from "lucide-react";
import { formatTime } from "@/utils/formatTime";

interface PreviewToolbarProps {
  activeTab: "original" | "ascii";
  setActiveTab: (tab: "original" | "ascii") => void;
  hasOutput: boolean;
  zoom: number;
  setZoom: (zoom: number) => void;
  resetView: () => void;
  isConverting: boolean;
  progress: number;
  estimatedTimeRemaining: number | null;
  copyToClipboard: () => void;
  exportOutput: (format: "png" | "svg" | "txt" | "html") => void;
  onExportPng: () => void;
}

export function PreviewToolbar({
  activeTab,
  setActiveTab,
  hasOutput,
  zoom,
  setZoom,
  resetView,
  isConverting,
  progress,
  estimatedTimeRemaining,
  copyToClipboard,
  exportOutput,
  onExportPng,
}: PreviewToolbarProps) {
  return (
    <Flex
      align="center"
      justify="space-between"
      px="sm"
      py="xs"
      style={{ borderBottom: "1px solid var(--mantine-color-gray-3)" }}
    >
      <Flex align="center" gap="xs">
        <Tabs value={activeTab} onChange={(v) => setActiveTab((v ?? "original") as "original" | "ascii")}>
          <Tabs.List>
            <Tabs.Tab value="original" leftSection={<ImageIcon size={12} />}>
              <Text size="xs">原图</Text>
            </Tabs.Tab>
            <Tabs.Tab value="ascii" disabled={!hasOutput}>
              <Text size="xs">字符画</Text>
            </Tabs.Tab>
          </Tabs.List>
        </Tabs>

        <Flex align="center" gap={4} ml="xs">
          <ActionIcon variant="subtle" size="sm" onClick={() => setZoom(zoom * 1.2)}>
            <ZoomIn size={14} />
          </ActionIcon>
          <ActionIcon variant="subtle" size="sm" onClick={() => setZoom(zoom / 1.2)}>
            <ZoomOut size={14} />
          </ActionIcon>
          <ActionIcon variant="subtle" size="sm" onClick={resetView}>
            <RotateCcw size={14} />
          </ActionIcon>
          <Text size="xs" c="dimmed">
            {Math.round(zoom * 100)}%
          </Text>
        </Flex>
      </Flex>

      <Flex align="center" gap="xs">
        {isConverting && (
          <Flex align="center" gap="xs">
            <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
            <Text size="xs" c="dimmed">
              {progress.toFixed(0)}%
              {estimatedTimeRemaining !== null && estimatedTimeRemaining > 0 && (
                <span> · 剩余 {formatTime(estimatedTimeRemaining)}</span>
              )}
            </Text>
          </Flex>
        )}
        <Button
          variant="subtle"
          size="compact-xs"
          disabled={!hasOutput}
          leftSection={<Copy size={14} />}
          onClick={copyToClipboard}
        >
          复制
        </Button>
        <Menu position="bottom-end">
          <Menu.Target>
            <Button
              variant="subtle"
              size="compact-xs"
              disabled={!hasOutput}
              leftSection={<Download size={14} />}
            >
              导出
            </Button>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item leftSection={<FileDown size={14} />} onClick={onExportPng}>
              导出为 PNG
            </Menu.Item>
            <Menu.Item leftSection={<FileDown size={14} />} onClick={() => exportOutput("svg")}>
              导出为 SVG
            </Menu.Item>
            <Menu.Item leftSection={<FileDown size={14} />} onClick={() => exportOutput("txt")}>
              导出为 TXT
            </Menu.Item>
            <Menu.Item leftSection={<FileDown size={14} />} onClick={() => exportOutput("html")}>
              导出为 HTML
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Flex>
    </Flex>
  );
}
