import { Box, useMantineTheme, useComputedColorScheme } from "@mantine/core";
import {
  ResizablePanel,
  ResizablePanelGroup,
  ResizableHandle,
  useDefaultLayout,
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
        borderRadius: theme.radius.lg,
        border: `1px solid ${theme.colors.dark[4]}`,
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
          <Box style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", borderRadius: theme.radius.md, border: `1px solid ${theme.colors.dark[4]}` }}>
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
