import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type { VideoToolProgress, VideoToolLog, BatchProgress, ProgressInfo, LogEntry, ExtractedFrame } from "@/types";

// ── Event names ──

export const EVENTS = {
  VIDEO_TOOL_PROGRESS: "video-tool://progress",
  VIDEO_TOOL_LOG: "video-tool://log",
  VIDEO_TOOL_BATCH: "video-tool://batch-progress",
  VIDEO_FRAME_PROGRESS: "video-frame://progress",
  VIDEO_FRAME_LOG: "video-frame://log",
  VIDEO_FRAME: "video-frame://frame",
  VIDEO_FRAME_DELETED: "video-frame://frames-deleted",
} as const;

// ── Subscriber types ──

export interface VideoEventHandlers {
  onProgress?: (p: VideoToolProgress) => void;
  onLog?: (log: VideoToolLog) => void;
  onBatchProgress?: (bp: BatchProgress) => void;
}

export interface FrameEventHandlers {
  onProgress?: (info: ProgressInfo) => void;
  onLog?: (log: LogEntry) => void;
  onFrame?: (frame: ExtractedFrame) => void;
  onFramesDeleted?: () => void;
}

// ── Subscription helpers ──

/**
 * Subscribe to video-tool events. Returns an unsubscribe function.
 */
export async function subscribeVideoToolEvents(
  handlers: VideoEventHandlers,
): Promise<UnlistenFn> {
  const unlisteners: UnlistenFn[] = [];

  if (handlers.onProgress) {
    unlisteners.push(
      await listen<VideoToolProgress>(EVENTS.VIDEO_TOOL_PROGRESS, (e) => handlers.onProgress!(e.payload)),
    );
  }

  if (handlers.onLog) {
    unlisteners.push(
      await listen<VideoToolLog>(EVENTS.VIDEO_TOOL_LOG, (e) => handlers.onLog!(e.payload)),
    );
  }

  if (handlers.onBatchProgress) {
    unlisteners.push(
      await listen<BatchProgress>(EVENTS.VIDEO_TOOL_BATCH, (e) => handlers.onBatchProgress!(e.payload)),
    );
  }

  return () => unlisteners.forEach((u) => u());
}

/**
 * Subscribe to video-frame events. Returns an unsubscribe function.
 */
export async function subscribeFrameEvents(
  handlers: FrameEventHandlers,
): Promise<UnlistenFn> {
  const unlisteners: UnlistenFn[] = [];

  if (handlers.onProgress) {
    unlisteners.push(
      await listen<ProgressInfo>(EVENTS.VIDEO_FRAME_PROGRESS, (e) => handlers.onProgress!(e.payload)),
    );
  }

  if (handlers.onLog) {
    unlisteners.push(
      await listen<LogEntry>(EVENTS.VIDEO_FRAME_LOG, (e) => handlers.onLog!(e.payload)),
    );
  }

  if (handlers.onFrame) {
    unlisteners.push(
      await listen<ExtractedFrame>(EVENTS.VIDEO_FRAME, (e) => handlers.onFrame!(e.payload)),
    );
  }

  if (handlers.onFramesDeleted) {
    unlisteners.push(
      await listen<void>(EVENTS.VIDEO_FRAME_DELETED, () => handlers.onFramesDeleted!()),
    );
  }

  return () => unlisteners.forEach((u) => u());
}
