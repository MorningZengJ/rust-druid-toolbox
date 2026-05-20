import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type {
  RecordParams,
  RecordProgressInfo,
  RecordingStatus,
  RecordingTaskInfo,
  LiveRecordLogEntry,
  PreviewFrame,
  ContainerFormat,
} from "@/types";

interface RecordingTask {
  info: RecordingTaskInfo;
  progress: RecordProgressInfo | null;
  previewObjectUrl: string | null;
  logs: LiveRecordLogEntry[];
}

interface LiveRecordState {
  tasks: Record<string, RecordingTask>;
  selectedTaskId: string | null;
  newRecordParams: RecordParams;
  errorMessage: string | null;
  _unlisteners: (() => void)[];

  setNewRecordParams: (updates: Partial<RecordParams>) => void;
  startRecording: () => Promise<void>;
  stopRecording: (taskId: string) => Promise<void>;
  selectTask: (taskId: string | null) => void;
  removeTask: (taskId: string) => void;
  registerEventListeners: () => Promise<void>;
  unregisterEventListeners: () => void;
  clearError: () => void;
}

const defaultRecordParams: RecordParams = {
  url: "",
  outputDir: "",
  filenamePrefix: "recording",
  containerFormat: "ts" as ContainerFormat,
  streamCopy: true,
  segmentDurationSecs: null,
  previewEnabled: true,
  previewIntervalMs: 500,
};

export const useLiveRecordStore = create<LiveRecordState>((set, get) => ({
  tasks: {},
  selectedTaskId: null,
  newRecordParams: { ...defaultRecordParams },
  errorMessage: null,
  _unlisteners: [],

  setNewRecordParams: (updates) => {
    set((s) => ({
      newRecordParams: { ...s.newRecordParams, ...updates },
    }));
  },

  startRecording: async () => {
    const { newRecordParams } = get();
    if (!newRecordParams.url) {
      set({ errorMessage: "请输入直播源 URL" });
      return;
    }
    if (!newRecordParams.outputDir) {
      set({ errorMessage: "请选择输出目录" });
      return;
    }

    set({ errorMessage: null });

    try {
      const info = await invoke<RecordingTaskInfo>("start_recording", {
        params: newRecordParams,
      });

      set((s) => {
        const newTasks = {
          ...s.tasks,
          [info.taskId]: {
            info,
            progress: null,
            previewObjectUrl: null,
            logs: [],
          },
        };
        return {
          tasks: newTasks,
          selectedTaskId: s.selectedTaskId || info.taskId,
        };
      });
    } catch (e) {
      set({ errorMessage: `启动录制失败: ${e}` });
    }
  },

  stopRecording: async (taskId) => {
    try {
      await invoke("stop_recording", { taskId });
      set((s) => {
        const task = s.tasks[taskId];
        if (!task) return s;
        return {
          tasks: {
            ...s.tasks,
            [taskId]: {
              ...task,
              info: { ...task.info, status: "stopping" as RecordingStatus },
            },
          },
        };
      });
    } catch (e) {
      set({ errorMessage: `停止录制失败: ${e}` });
    }
  },

  selectTask: (taskId) => set({ selectedTaskId: taskId }),

  removeTask: (taskId) => {
    set((s) => {
      const task = s.tasks[taskId];
      if (task?.previewObjectUrl) {
        URL.revokeObjectURL(task.previewObjectUrl);
      }
      const newTasks = { ...s.tasks };
      delete newTasks[taskId];
      const remainingIds = Object.keys(newTasks);
      return {
        tasks: newTasks,
        selectedTaskId:
          s.selectedTaskId === taskId
            ? remainingIds.length > 0
              ? remainingIds[0]
              : null
            : s.selectedTaskId,
      };
    });
  },

  registerEventListeners: async () => {
    get().unregisterEventListeners();
    const unlisteners: (() => void)[] = [];

    const unlistenProgress = await listen<RecordProgressInfo>(
      "live-record://progress",
      (event) => {
        const info = event.payload;
        set((s) => {
          const task = s.tasks[info.taskId];
          if (!task) return s;
          return {
            tasks: {
              ...s.tasks,
              [info.taskId]: {
                ...task,
                progress: info,
                info: {
                  ...task.info,
                  status: info.status,
                  durationSecs: info.durationSecs,
                  fileSizeBytes: info.fileSizeBytes,
                  output_path: info.outputPath,
                  currentSegment: info.currentSegment,
                },
              },
            },
          };
        });
      }
    );
    unlisteners.push(unlistenProgress);

    const unlistenPreview = await listen<PreviewFrame>(
      "live-record://preview",
      (event) => {
        const frame = event.payload;
        set((s) => {
          const task = s.tasks[frame.taskId];
          if (!task) return s;

          // Revoke old URL
          if (task.previewObjectUrl) {
            URL.revokeObjectURL(task.previewObjectUrl);
          }

          const blob = new Blob([new Uint8Array(frame.jpegData)], {
            type: "image/jpeg",
          });
          const url = URL.createObjectURL(blob);

          return {
            tasks: {
              ...s.tasks,
              [frame.taskId]: { ...task, previewObjectUrl: url },
            },
          };
        });
      }
    );
    unlisteners.push(unlistenPreview);

    const unlistenLog = await listen<LiveRecordLogEntry>(
      "live-record://log",
      (event) => {
        const log = event.payload;
        set((s) => {
          const task = s.tasks[log.taskId];
          if (!task) return s;
          return {
            tasks: {
              ...s.tasks,
              [log.taskId]: { ...task, logs: [...task.logs, log] },
            },
          };
        });
      }
    );
    unlisteners.push(unlistenLog);

    const unlistenStatus = await listen<{
      taskId: string;
      status: RecordingStatus;
      error?: string;
    }>("live-record://status", (event) => {
      const { taskId, status, error } = event.payload;
      set((s) => {
        const task = s.tasks[taskId];
        if (!task) return s;
        return {
          tasks: {
            ...s.tasks,
            [taskId]: {
              ...task,
              info: { ...task.info, status },
              logs: error
                ? [
                    ...task.logs,
                    {
                      taskId,
                      level: "error",
                      message: error,
                      timestamp: Date.now(),
                    },
                  ]
                : task.logs,
            },
          },
        };
      });
    });
    unlisteners.push(unlistenStatus);

    set({ _unlisteners: unlisteners });
  },

  unregisterEventListeners: () => {
    const { _unlisteners } = get();
    for (const unlisten of _unlisteners) {
      unlisten();
    }
    set({ _unlisteners: [] });
  },

  clearError: () => set({ errorMessage: null }),
}));
