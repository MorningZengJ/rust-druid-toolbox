import { useEffect } from "react";
import { Flex, useMantineTheme } from "@mantine/core";
import { useLiveRecordStore } from "@/stores/liveRecordStore";
import { LogPanel } from "@/components/common/LogPanel";
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

  useEffect(() => {
    registerEventListeners();
    return () => {
      unregisterEventListeners();
    };
  }, [registerEventListeners, unregisterEventListeners]);

  const selectedTask =
    selectedTaskId ? tasks[selectedTaskId] ?? null : null;

  return (
    <Flex h="100%" gap="sm">
      <Flex
        direction="column"
        w={320}
        style={{
          flexShrink: 0,
          borderRadius: theme.radius.md,
          border: `1px solid ${theme.colors.gray[3]}`,
        }}
      >
        <NewRecordForm />
        <TaskList />
        <LogPanel logs={selectedTask?.logs ?? []} height={140} />
      </Flex>
      <PreviewPanel />
    </Flex>
  );
}
