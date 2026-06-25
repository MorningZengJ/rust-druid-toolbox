import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { LogicalSize, LogicalPosition } from "@tauri-apps/api/dpi";
import { settingsStore } from "./lib/store";
import { validateWindowState, validateColorTheme, validateCustomPrimary } from "./lib/configValidator";
import { getThemeWithPrimary } from "./mantine-theme";
import { hexToRgb } from "./lib/color";
import ThemeProvider from "./components/ThemeProvider";
import App from "./App";
import "./i18n";
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import "./globals.css";

/**
 * 在 React 挂载前从持久化存储中读取主题配置，预置 CSS 变量到 :root。
 * 确保第一帧即使用正确的 accent 色，避免 CssVariableSync 挂载前的闪烁。
 */
async function preloadTheme() {
  try {
    const [rawTheme, rawCustom] = await Promise.all([
      settingsStore.get("colorTheme"),
      settingsStore.get("customPrimary"),
    ]);
    const colorTheme = validateColorTheme(rawTheme);
    const customPrimary = validateCustomPrimary(rawCustom);

    // preloadTheme 不使用 selectedShadeIndex（不跨会话持久化）
    const theme = getThemeWithPrimary(colorTheme, customPrimary, undefined);
    const primary = theme.colors?.[theme.primaryColor];
    if (!primary?.[5]) return;

    const root = document.documentElement;
    const accentRgb = hexToRgb(primary[5]);
    root.style.setProperty("--accent-primary", primary[5]);
    root.style.setProperty("--accent-light", primary[3]);
    root.style.setProperty("--accent-dark", primary[7]);
    root.style.setProperty("--accent-glow", `rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, 0.15)`);
  } catch (e) {
    // 首次运行或读取出错，不做任何事，CssVariableSync 会兜底
  }
}

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

  // 在 window.show() 之前预置 CSS 变量，确保用户看到的第一个 frame 就是正确的颜色
  await preloadTheme();
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
