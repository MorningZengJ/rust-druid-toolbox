import { getCurrentWindow } from "@tauri-apps/api/window";

export type DragDropHandler = (paths: string[]) => void;

interface DragDropOptions {
  /** 扩展名白名单（不含点），如 ["png","jpg"] */
  extensions?: string[];
  /** 匹配到文件后的回调，仅传入白名单路径 */
  onDrop: DragDropHandler;
}

/**
 * 注册全局 Tauri 拖放监听，返回取消函数。
 * - 仅当未提供 extensions 时传递全部路径。
 * - 提供 extensions 时只回传匹配的文件路径。
 * - 多次调用需自行保证不冲突（推荐页面级使用单例）。
 */
export function registerDropListener(opts: DragDropOptions): () => void {
  const unlisten = getCurrentWindow().onDragDropEvent((event) => {
    if (event.payload.type !== "drop") return;

    const paths = event.payload.paths;
    const { extensions, onDrop } = opts;
    if (extensions && extensions.length > 0) {
      const filtered = paths.filter((p) => {
        const ext = p.split(".").pop()?.toLowerCase() ?? "";
        return extensions.includes(ext);
      });
      if (filtered.length > 0) onDrop(filtered);
      return;
    }

    onDrop(paths);
  });

  let unlistenFn: (() => void) | null = null;
  unlisten.then((fn) => (unlistenFn = fn));

  return () => {
    if (unlistenFn) unlistenFn();
  };
}
