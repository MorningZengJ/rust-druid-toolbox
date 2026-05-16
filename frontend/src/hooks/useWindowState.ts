import { useEffect } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { LogicalSize, LogicalPosition } from "@tauri-apps/api/dpi";
import { LazyStore } from "@tauri-apps/plugin-store";

interface WindowState {
  x: number;
  y: number;
  width: number;
  height: number;
  isMaximized: boolean;
}

const store = new LazyStore("settings.json");
const WINDOW_STATE_KEY = "windowState";
const DEBOUNCE_MS = 500;

export function useWindowState() {
  useEffect(() => {
    const win = getCurrentWindow();

    // Restore window state on mount
    store.get<WindowState>(WINDOW_STATE_KEY).then((state) => {
      if (!state) return;
      if (state.isMaximized) {
        win.maximize();
      } else {
        win.setPosition(new LogicalPosition(state.x, state.y));
        win.setSize(new LogicalSize(state.width, state.height));
      }
    });

    // Debounce helper
    let timer: ReturnType<typeof setTimeout> | null = null;
    const debouncedSave = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(saveState, DEBOUNCE_MS);
    };

    async function saveState() {
      const [size, position, maximized] = await Promise.all([
        win.outerSize(),
        win.outerPosition(),
        win.isMaximized(),
      ]);
      const state: WindowState = {
        x: position.x,
        y: position.y,
        width: size.width,
        height: size.height,
        isMaximized: maximized,
      };
      store.set(WINDOW_STATE_KEY, state);
    }

    const unlistenResize = win.onResized(debouncedSave);
    const unlistenMove = win.onMoved(debouncedSave);

    return () => {
      if (timer) clearTimeout(timer);
      unlistenResize.then((fn) => fn());
      unlistenMove.then((fn) => fn());
    };
  }, []);
}
