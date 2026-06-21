import {
  Box,
  Flex,
  Text,
  Progress,
  useMantineTheme,
  useComputedColorScheme,
} from "@mantine/core";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  ResizablePanel,
  ResizablePanelGroup,
  ResizableHandle,
  useDefaultLayout,
} from "@/components/ui/resizable";
import { useRenameStore } from "@/stores/renameStore";
import Toolbar from "./Toolbar";
import FilterSection from "./FilterSection";
import RuleList from "./RuleList";
import FilePreview from "./FilePreview";
import StatusBar from "./StatusBar";

export default function RenamePage() {
  const { t } = useTranslation("rename");
  const theme = useMantineTheme();
  const colorScheme = useComputedColorScheme();
  const isDark = colorScheme === "dark";
  const loading = useRenameStore((s) => s.loading);
  const loadingProgress = useRenameStore((s) => s.loadingProgress);
  const { defaultLayout, onLayoutChanged } = useDefaultLayout({
    id: "rename-page",
    storage: localStorage,
  });

  return (
    <Box
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
        position: "relative",
        borderRadius: theme.radius.lg,
        border: `1px solid ${isDark ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.06)"}`,
        backgroundColor: isDark ? theme.colors.dark[7] : theme.white,
      }}
    >
      {/* Top toolbar */}
      <Toolbar />

      {/* Main content: left rules + right preview */}
      <ResizablePanelGroup
        id="rename-page"
        orientation="horizontal"
        defaultLayout={defaultLayout}
        onLayoutChanged={onLayoutChanged}
        style={{ flex: 1, padding: 8 }}
      >
        {/* Left panel: filters + rules */}
        <ResizablePanel defaultSize={35} minSize={25}>
          <Box
            style={{
              display: "flex",
              flexDirection: "column",
              height: "100%",
              overflow: "hidden",
              borderRadius: theme.radius.md,
              border: `1px solid ${isDark ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.06)"}`,
              backgroundColor: isDark ? theme.colors.dark[8] : theme.colors.gray[0],
            }}
          >
            <FilterSection />
            <RuleList />
          </Box>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Right panel: file preview */}
        <ResizablePanel defaultSize={65} minSize={40}>
          <FilePreview />
        </ResizablePanel>
      </ResizablePanelGroup>

      {/* Loading overlay */}
      {loading && (
        <Flex
          pos="absolute"
          inset={0}
          top={40}
          direction="column"
          align="center"
          justify="center"
          gap="md"
          style={{
            zIndex: 100,
            backgroundColor: isDark
              ? "rgba(0, 0, 0, 0.6)"
              : "rgba(255, 255, 255, 0.7)",
            backdropFilter: "blur(4px)",
            borderRadius: theme.radius.lg,
          }}
        >
          <Loader2
            size={32}
            color={theme.colors[theme.primaryColor][isDark ? 4 : 6]}
            style={{ animation: "spin 1s linear infinite" }}
          />
          <Text size="sm" fw={500} c="dimmed">
            {loadingProgress
              ? loadingProgress.phase === "scanning"
                ? t("errors.loadFilesFailed", { error: "" })
                : `${t("errors.loadFilesFailed", { error: "" })}: ${loadingProgress.processed} / ${loadingProgress.total}`
              : t("errors.loadFilesFailed", { error: "" })}
          </Text>
          {loadingProgress && loadingProgress.phase === "calculating" && loadingProgress.total > 0 && (
            <Box w="60%" maw={400}>
              <Progress
                value={(loadingProgress.processed / loadingProgress.total) * 100}
                size="sm"
                radius="xl"
                animated
              />
            </Box>
          )}
        </Flex>
      )}

      {/* Bottom status bar */}
      <StatusBar />
    </Box>
  );
}
