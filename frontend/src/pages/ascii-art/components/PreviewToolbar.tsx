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
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation("asciiArt");
  return (
    <Flex
      align="center"
      justify="space-between"
      px="sm"
      py="xs"
      style={{
        borderBottom: "1px solid var(--border-subtle)",
        backgroundColor: "var(--surface-panel)",
      }}
    >
      <Flex align="center" gap="xs">
        <Tabs
          value={activeTab}
          onChange={(v) => setActiveTab((v ?? "original") as "original" | "ascii")}
          color="amber"
        >
          <Tabs.List>
            <Tabs.Tab value="original" leftSection={<ImageIcon size={12} />}>
              <Text size="xs">{t("preview.tabs.original")}</Text>
            </Tabs.Tab>
            <Tabs.Tab value="ascii" disabled={!hasOutput}>
              <Text size="xs">{t("preview.tabs.ascii")}</Text>
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
          <Text size="xs" c="dimmed" style={{ fontFamily: "var(--font-mono)" }}>
            {Math.round(zoom * 100)}%
          </Text>
        </Flex>
      </Flex>

      <Flex align="center" gap="xs">
        {isConverting && (
          <Flex align="center" gap="xs">
            <Loader2
              size={14}
              style={{ animation: "spin 1s linear infinite", color: "var(--accent-primary)" }}
            />
            <Text size="xs" c="dimmed" style={{ fontFamily: "var(--font-mono)" }}>
              {progress.toFixed(0)}%
              {estimatedTimeRemaining !== null && estimatedTimeRemaining > 0 && (
                <span> · {t("preview.toolbar.timeRemaining", { time: formatTime(estimatedTimeRemaining) })}</span>
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
          color="amber"
        >
          {t("preview.toolbar.copy")}
        </Button>
        <Menu position="bottom-end">
          <Menu.Target>
            <Button
              variant="subtle"
              size="compact-xs"
              disabled={!hasOutput}
              leftSection={<Download size={14} />}
              color="amber"
            >
              {t("preview.toolbar.export")}
            </Button>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item leftSection={<FileDown size={14} />} onClick={onExportPng}>
              {t("preview.toolbar.exportPng")}
            </Menu.Item>
            <Menu.Item leftSection={<FileDown size={14} />} onClick={() => exportOutput("svg")}>
              {t("preview.toolbar.exportSvg")}
            </Menu.Item>
            <Menu.Item leftSection={<FileDown size={14} />} onClick={() => exportOutput("txt")}>
              {t("preview.toolbar.exportTxt")}
            </Menu.Item>
            <Menu.Item leftSection={<FileDown size={14} />} onClick={() => exportOutput("html")}>
              {t("preview.toolbar.exportHtml")}
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Flex>
    </Flex>
  );
}
