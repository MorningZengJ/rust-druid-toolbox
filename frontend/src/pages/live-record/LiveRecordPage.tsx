import { useEffect } from "react";
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

  useEffect(() => {
    registerEventListeners();
    return () => {
      unregisterEventListeners();
    };
  }, [registerEventListeners, unregisterEventListeners]);

  const selectedTask =
    selectedTaskId ? tasks[selectedTaskId] ?? null : null;

  return (
    <div className="flex h-full gap-3">
      <div className="flex w-[320px] shrink-0 flex-col rounded-lg border border-border bg-panel">
        <NewRecordForm />
        <TaskList />
        <LogPanel
          logs={selectedTask?.logs ?? []}
          height="h-[140px]"
        />
      </div>
      <PreviewPanel />
    </div>
  );
}
