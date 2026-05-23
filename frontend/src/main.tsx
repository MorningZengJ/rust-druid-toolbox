import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { MantineProvider } from "@mantine/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { LogicalSize, LogicalPosition } from "@tauri-apps/api/dpi";
import { LazyStore } from "@tauri-apps/plugin-store";
import { getThemeWithPrimary } from "./mantine-theme";
import type { ColorTheme } from "./hooks/useTheme";
import App from "./App";
import "@mantine/core/styles.css";
import "./globals.css";

type ColorMode = "light" | "dark" | "system";

interface WindowState {
  x: number;
  y: number;
  width: number;
  height: number;
  isMaximized: boolean;
}

const store = new LazyStore("settings.json");

function getColorScheme(mode: ColorMode): "light" | "dark" | "auto" {
  if (mode === "system") return "auto";
  return mode;
}

async function init() {
  const win = getCurrentWindow();

  let colorMode: ColorMode = "system";
  let colorTheme: ColorTheme = "default";
  let customPrimary: string | undefined;
  let defaultColorScheme: "light" | "dark" | "auto" = "auto";

  try {
    const [savedMode, savedTheme, savedCustom, windowState] = await Promise.all([
      store.get<ColorMode>("colorMode"),
      store.get<ColorTheme>("colorTheme"),
      store.get<string>("customPrimary"),
      store.get<WindowState>("windowState"),
    ]);

    colorMode = savedMode ?? "system";
    colorTheme = savedTheme ?? "default";
    customPrimary = savedCustom;
    defaultColorScheme = getColorScheme(colorMode);

    // Restore window state
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
    console.error("Failed to load settings:", e);
  }

  await win.show();

  const theme = getThemeWithPrimary(colorTheme, customPrimary);

  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <MantineProvider theme={theme} defaultColorScheme={defaultColorScheme}>
        <App />
      </MantineProvider>
    </StrictMode>
  );
}

init();
