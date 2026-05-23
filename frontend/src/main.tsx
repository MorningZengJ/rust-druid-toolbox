import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { LogicalSize, LogicalPosition } from "@tauri-apps/api/dpi";
import { LazyStore } from "@tauri-apps/plugin-store";
import ThemeProvider from "./components/ThemeProvider";
import App from "./App";
import "@mantine/core/styles.css";
import "./globals.css";

interface WindowState {
  x: number;
  y: number;
  width: number;
  height: number;
  isMaximized: boolean;
}

const store = new LazyStore("settings.json");

async function init() {
  const win = getCurrentWindow();

  try {
    const windowState = await store.get<WindowState>("windowState");
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
