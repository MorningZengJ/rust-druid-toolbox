import { useEffect } from "react";
import { Box, useMantineTheme, useComputedColorScheme } from "@mantine/core";
import { useLiveRecordStore } from "@/stores/liveRecordStore";
import { LogPanel } from "@/components/common/LogPanel";
import {
  ResizablePanel,
  ResizablePanelGroup,
  ResizableHandle,
  useDefaultLayout,
} from "@/components/ui/resizable";
import { NewRecordForm } from "./NewRecordForm";
import { TaskList } from "./TaskList";
import { PreviewPanel } from "./PreviewPanel";

export default function LiveRecordPage() {
  const tasks = useLiveRecordStore((s) => s.tasks);
  const selectedTaskId = useLiveRecordStore((s) => s.selectedTaskId);
  const registerEventListeners = useLiveRecordStore(
    (s) => s.registerEventListeners
  );
  const unregisterEventListeners = useLiveRecordStore(
    (s) => s.unregisterEventListeners
  );
  const theme = useMantineTheme();
  const colorScheme = useComputedColorScheme();
  const isDark = colorScheme === "dark";
  const { defaultLayout, onLayoutChanged } = useDefaultLayout({
    id: "live-record-page",
    storage: localStorage,
  });

  useEffect(() => {
    registerEventListeners();
    return () => {
      unregisterEventListeners();
    };
  }, [registerEventListeners, unregisterEventListeners]);

  const selectedTask =
    selectedTaskId ? tasks[selectedTaskId] ?? null : null;

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
      <ResizablePanelGroup
        id="live-record-page"
        orientation="horizontal"
        defaultLayout={defaultLayout}
        onLayoutChanged={onLayoutChanged}
        style={{ flex: 1, padding: 8 }}
      >
        <ResizablePanel defaultSize={35} minSize={25}>
          <Box style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", borderRadius: theme.radius.md, border: `1px solid ${theme.colors.dark[4]}` }}>
            <NewRecordForm />
            <TaskList />
            <LogPanel logs={selectedTask?.logs ?? []} height={140} />
          </Box>
        </ResizablePanel>

        <ResizableHandle withHandle />

        <ResizablePanel defaultSize={65} minSize={40}>
          <PreviewPanel />
        </ResizablePanel>
      </ResizablePanelGroup>
    </Box>
  );
}
