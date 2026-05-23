import { Box, useMantineTheme, useComputedColorScheme } from "@mantine/core";
import {
  ResizablePanel,
  ResizablePanelGroup,
  ResizableHandle,
} from "@/components/ui/resizable";
import Toolbar from "./Toolbar";
import FilterSection from "./FilterSection";
import RuleList from "./RuleList";
import FilePreview from "./FilePreview";
import StatusBar from "./StatusBar";

export default function RenamePage() {
  const theme = useMantineTheme();
  const colorScheme = useComputedColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <Box
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
        borderRadius: theme.radius.lg,
        border: `1px solid ${isDark ? theme.colors.dark[4] : theme.colors.gray[3]}`,
        backgroundColor: isDark ? theme.colors.dark[7] : theme.white,
      }}
    >
      {/* Top toolbar */}
      <Toolbar />

      {/* Main content: left rules + right preview */}
      <ResizablePanelGroup orientation="horizontal" style={{ flex: 1 }}>
        {/* Left panel: filters + rules */}
        <ResizablePanel defaultSize={35} minSize={25}>
          <Box style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
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

      {/* Bottom status bar */}
      <StatusBar />

    </Box>
  );
}
