import {
  Box,
  Flex,
  Text,
  Progress,
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
        borderRadius: 12,
        border: "1px solid var(--border-default)",
        backgroundColor: "var(--surface-overlay)",
      }}
    >
      {/* 顶部高光线 */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 1,
          background: "linear-gradient(90deg, transparent, var(--accent-glow), transparent)",
          pointerEvents: "none",
          zIndex: 1,
        }}
      />

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
              borderRadius: 10,
              border: "1px solid var(--border-default)",
              backgroundColor: "var(--surface-raised)",
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
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            backdropFilter: "blur(4px)",
            borderRadius: 12,
          }}
        >
          <Loader2
            size={32}
            style={{
              color: "var(--accent-primary)",
              animation: "spin 1s linear infinite",
            }}
          />
          <Text size="sm" fw={500} style={{ color: "var(--text-secondary)" }}>
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
                color="amber"
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
