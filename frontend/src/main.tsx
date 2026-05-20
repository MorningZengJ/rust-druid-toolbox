import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { LogicalSize, LogicalPosition } from "@tauri-apps/api/dpi";
import { LazyStore } from "@tauri-apps/plugin-store";
import App from "./App";
import "./globals.css";

type ColorMode = "light" | "dark" | "system";
type ColorTheme = "default" | "blue" | "green" | "purple" | "orange" | "rose";

interface WindowState {
  x: number;
  y: number;
  width: number;
  height: number;
  isMaximized: boolean;
}

const store = new LazyStore("settings.json");

function applyColorMode(mode: ColorMode) {
  const root = document.documentElement;
  if (mode === "dark") {
    root.classList.add("dark");
  } else if (mode === "light") {
    root.classList.remove("dark");
  } else {
    root.classList.toggle(
      "dark",
      window.matchMedia("(prefers-color-scheme: dark)").matches
    );
  }
}

function applyColorTheme(theme: ColorTheme, customPrimary?: string) {
  const root = document.documentElement;
  root.classList.remove(
    "theme-blue",
    "theme-green",
    "theme-purple",
    "theme-orange",
    "theme-rose"
  );
  if (theme !== "default") {
    root.classList.add(`theme-${theme}`);
  }
  if (customPrimary) {
    root.style.setProperty("--primary", customPrimary);
    root.style.setProperty("--accent", customPrimary);
    root.style.setProperty("--ring", customPrimary);
    root.style.setProperty("--sidebar-primary", customPrimary);
    root.style.setProperty("--primary-foreground", "0 0% 100%");
    root.style.setProperty("--accent-foreground", "0 0% 100%");
    root.style.setProperty("--sidebar-primary-foreground", "0 0% 100%");
  } else {
    root.style.removeProperty("--primary");
    root.style.removeProperty("--accent");
    root.style.removeProperty("--ring");
    root.style.removeProperty("--sidebar-primary");
    root.style.removeProperty("--primary-foreground");
    root.style.removeProperty("--accent-foreground");
    root.style.removeProperty("--sidebar-primary-foreground");
  }
}

async function init() {
  const win = getCurrentWindow();

  try {
    const [colorMode, colorTheme, customPrimary, windowState] =
      await Promise.all([
        store.get<ColorMode>("colorMode"),
        store.get<ColorTheme>("colorTheme"),
        store.get<string>("customPrimary"),
        store.get<WindowState>("windowState"),
      ]);

    // Apply theme before first paint
    applyColorMode(colorMode ?? "system");
    applyColorTheme(colorTheme ?? "default", customPrimary);

    // Restore window state
    if (windowState) {
      if (windowState.isMaximized) {
        await win.maximize();
      } else if (windowState.x < 0 || windowState.y < 0) {
        await win.center();
        await win.setSize(
          new LogicalSize(windowState.width, windowState.height)
        );
      } else {
        await win.setPosition(
          new LogicalPosition(windowState.x, windowState.y)
        );
        await win.setSize(
          new LogicalSize(windowState.width, windowState.height)
        );
      }
    }
  } catch (e) {
    console.error("Failed to load settings:", e);
  }

  // Always show window, even if config loading fails
  await win.show();

  // Mount React after window is visible
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <TooltipProvider>
        <App />
      </TooltipProvider>
    </StrictMode>
  );
}

init();
