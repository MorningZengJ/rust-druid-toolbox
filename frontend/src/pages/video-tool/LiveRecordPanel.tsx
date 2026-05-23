import { Box, useMantineTheme } from "@mantine/core";
import { useLiveRecordStore } from "@/stores/liveRecordStore";
import { LogPanel } from "@/components/common/LogPanel";
import {
  ResizablePanel,
  ResizablePanelGroup,
  ResizableHandle,
  useDefaultLayout,
} from "@/components/ui/resizable";
import { NewRecordForm } from "@/pages/live-record/NewRecordForm";
import { TaskList } from "@/pages/live-record/TaskList";
import { PreviewPanel } from "@/pages/live-record/PreviewPanel";

export function LiveRecordPanel() {
  const tasks = useLiveRecordStore((s) => s.tasks);
  const selectedTaskId = useLiveRecordStore((s) => s.selectedTaskId);
  const theme = useMantineTheme();
  const { defaultLayout, onLayoutChanged } = useDefaultLayout({
    id: "video-tool-live-record",
    storage: localStorage,
  });

  const selectedTask =
    selectedTaskId ? tasks[selectedTaskId] ?? null : null;

  return (
    <ResizablePanelGroup
      id="video-tool-live-record"
      orientation="horizontal"
      defaultLayout={defaultLayout}
      onLayoutChanged={onLayoutChanged}
      style={{ height: "100%" }}
    >
      <ResizablePanel defaultSize={35} minSize={25}>
        <Box style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", gap: 8 }}>
          <Box style={{ borderRadius: 8, border: `1px solid ${theme.colors.dark[4]}`, overflow: "hidden" }}>
            <NewRecordForm />
          </Box>
          <Box style={{ flex: 1, minHeight: 0, borderRadius: 8, border: `1px solid ${theme.colors.dark[4]}`, overflow: "hidden" }}>
            <TaskList />
          </Box>
          <Box style={{ flexShrink: 0, borderRadius: 8, border: `1px solid ${theme.colors.dark[4]}`, overflow: "hidden" }}>
            <LogPanel logs={selectedTask?.logs ?? []} height={140} />
          </Box>
        </Box>
      </ResizablePanel>

      <ResizableHandle withHandle />

      <ResizablePanel defaultSize={65} minSize={40}>
        <Box style={{ display: "flex", flexDirection: "column", height: "100%" }}>
          <PreviewPanel />
        </Box>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
