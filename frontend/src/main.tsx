import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { LogicalSize, LogicalPosition } from "@tauri-apps/api/dpi";
import { settingsStore } from "./lib/store";
import { validateWindowState } from "./lib/configValidator";
import ThemeProvider from "./components/ThemeProvider";
import App from "./App";
import "./i18n";
import "@mantine/core/styles.css";
import "./globals.css";

async function init() {
  const win = getCurrentWindow();

  try {
    const raw = await settingsStore.get("windowState");
    const windowState = validateWindowState(raw);

    if (windowState) {
      if (windowState.isMaximized) {
        await win.maximize();
      } else if (windowState.x < 0 || windowState.y < 0) {
        await win.center();
        await win.setSize(new LogicalSize(windowState.width, windowState.height));
      } else {
        await win.setPosition(new LogicalPosition(windowState.x, windowState.y));
        await win.setSize(new LogicalSize(windowState.width, windowState.height));
      }
    }
    // 校验失败时不做任何操作，使用 tauri.conf.json 的默认值
  } catch (e) {
    console.error("Failed to load window state:", e);
  }

  await win.show();

  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </StrictMode>,
  );
}

init();
