import { useEffect } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { settingsStore } from "../lib/store";

interface WindowState {
  x: number;
  y: number;
  width: number;
  height: number;
  isMaximized: boolean;
}

const WINDOW_STATE_KEY = "windowState";
const DEBOUNCE_MS = 500;
// 与 tauri.conf.json 中的 minWidth/minHeight 一致，防止保存异常小的值
const MIN_WIDTH = 600;
const MIN_HEIGHT = 400;

export function useWindowState() {
  useEffect(() => {
    const win = getCurrentWindow();

    // Debounce helper
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function saveState() {
      const [size, position, maximized, scaleFactor] = await Promise.all([
        win.outerSize(),
        win.outerPosition(),
        win.isMaximized(),
        win.scaleFactor(),
      ]);
      // 物理像素 → 逻辑像素，确保保存的值与恢复时使用的 LogicalSize 单位一致
      const logicalSize = size.toLogical(scaleFactor);
      const logicalPos = position.toLogical(scaleFactor);
      // 跳过异常小的尺寸（如窗口最小化、初始化中间态等）
      if (!maximized && (logicalSize.width < MIN_WIDTH || logicalSize.height < MIN_HEIGHT)) {
        return;
      }
      const state: WindowState = {
        x: logicalPos.x,
        y: logicalPos.y,
        width: logicalSize.width,
        height: logicalSize.height,
        isMaximized: maximized,
      };
      await settingsStore.set(WINDOW_STATE_KEY, state);
      await settingsStore.save();
    }

    const debouncedSave = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(saveState, DEBOUNCE_MS);
    };

    const unlistenResize = win.onResized(debouncedSave);
    const unlistenMove = win.onMoved(debouncedSave);

    return () => {
      if (timer) clearTimeout(timer);
      // 卸载前立即 flush，确保最后一次尺寸变更不丢失
      saveState();
      unlistenResize.then((fn) => fn());
      unlistenMove.then((fn) => fn());
    };
  }, []);
}
