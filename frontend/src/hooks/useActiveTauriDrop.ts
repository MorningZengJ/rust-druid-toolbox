import { useEffect } from "react";
import { registerDropListener } from "@/lib/tauri/dragDrop";

interface UseActiveTauriDropOptions {
  /** 是否启用拖放监听 */
  enabled: boolean;
  /** 允许的文件扩展名（不含点） */
  extensions: string[];
  /** 匹配到文件的回调 */
  onDrop: (paths: string[]) => void;
}

/**
 * 注册全局 Tauri 拖放事件，仅 enabled=true 时生效。
 * 组件卸载或 enabled 变为 false 时自动取消注册。
 * 配合 PageContainer 条件挂载，确保同一时刻只有一个 active 页面监听拖放。
 */
export function useActiveTauriDrop({ enabled, extensions, onDrop }: UseActiveTauriDropOptions) {
  useEffect(() => {
    if (!enabled) return;

    const unlisten = registerDropListener({
      extensions,
      onDrop,
    });

    return () => unlisten();
  }, [enabled, extensions, onDrop]);
}
