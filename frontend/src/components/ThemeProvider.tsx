import { useEffect, useMemo } from "react";
import { MantineProvider, useMantineTheme, useComputedColorScheme } from "@mantine/core";
import { useThemeStore } from "@/stores/themeStore";
import { useColorSchemeSync } from "@/hooks/useTheme";
import { getThemeWithPrimary } from "@/mantine-theme";

function ColorSchemeSync() {
  useColorSchemeSync();
  return null;
}

/** 将 Mantine 主题的主色调同步到 CSS 变量 */
function CssVariableSync() {
  const theme = useMantineTheme();
  const colorScheme = useComputedColorScheme();
  const isDark = colorScheme === "dark";
  const primary = theme.colors[theme.primaryColor];

  useEffect(() => {
    const root = document.documentElement;

    // 主色调
    root.style.setProperty("--accent-primary", primary[5]);
    root.style.setProperty("--accent-light", primary[3]);
    root.style.setProperty("--accent-dark", primary[7]);
    root.style.setProperty("--accent-glow", `${primary[5]}20`);

    // 暗色表面层随主题色微调
    if (isDark) {
      // 计算主色调的低饱和度版本用于表面层微调
      root.style.setProperty("--surface-base", "#0C0C0E");
      root.style.setProperty("--surface-raised", "#131316");
      root.style.setProperty("--surface-overlay", "#1A1A1F");
      root.style.setProperty("--surface-panel", "#222228");

      root.style.setProperty("--text-primary", "#E8E8EC");
      root.style.setProperty("--text-secondary", "#9494A0");
      root.style.setProperty("--text-muted", "#5C5C68");
      root.style.setProperty("--text-disabled", "#3A3A42");

      root.style.setProperty("--border-subtle", "rgba(255, 255, 255, 0.04)");
      root.style.setProperty("--border-default", "rgba(255, 255, 255, 0.08)");
      root.style.setProperty("--border-strong", "rgba(255, 255, 255, 0.14)");

      root.style.setProperty("--shadow-sm", "0 1px 2px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.03)");
      root.style.setProperty("--shadow-md", "0 4px 12px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05)");
      root.style.setProperty("--shadow-lg", "0 8px 24px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.06)");

      // 状态色
      root.style.setProperty("--status-success", "#10B981");
      root.style.setProperty("--status-success-alt", "#34D399");
      root.style.setProperty("--status-success-bg", "rgba(16, 185, 129, 0.1)");
      root.style.setProperty("--status-success-border", "rgba(16, 185, 129, 0.2)");
      root.style.setProperty("--status-error", "#F87171");
      root.style.setProperty("--status-error-bg", "rgba(239, 68, 68, 0.1)");
      root.style.setProperty("--status-error-border", "rgba(239, 68, 68, 0.2)");
      root.style.setProperty("--status-warning", "#F59E0B");
      root.style.setProperty("--status-warning-bg", "rgba(245, 158, 11, 0.1)");
      root.style.setProperty("--status-warning-border", "rgba(245, 158, 11, 0.2)");
    } else {
      root.style.setProperty("--surface-base", "#F5F5F7");
      root.style.setProperty("--surface-raised", "#FFFFFF");
      root.style.setProperty("--surface-overlay", "#FFFFFF");
      root.style.setProperty("--surface-panel", "#EDEDF0");

      root.style.setProperty("--text-primary", "#1A1A2E");
      root.style.setProperty("--text-secondary", "#6B6B80");
      root.style.setProperty("--text-muted", "#9494A0");
      root.style.setProperty("--text-disabled", "#C0C0CC");

      root.style.setProperty("--border-subtle", "rgba(0, 0, 0, 0.04)");
      root.style.setProperty("--border-default", "rgba(0, 0, 0, 0.08)");
      root.style.setProperty("--border-strong", "rgba(0, 0, 0, 0.14)");

      root.style.setProperty("--shadow-sm", "0 1px 3px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(0, 0, 0, 0.04)");
      root.style.setProperty("--shadow-md", "0 4px 12px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(0, 0, 0, 0.06)");
      root.style.setProperty("--shadow-lg", "0 8px 24px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(0, 0, 0, 0.08)");

      // 状态色
      root.style.setProperty("--status-success", "#10B981");
      root.style.setProperty("--status-success-alt", "#34D399");
      root.style.setProperty("--status-success-bg", "rgba(16, 185, 129, 0.1)");
      root.style.setProperty("--status-success-border", "rgba(16, 185, 129, 0.2)");
      root.style.setProperty("--status-error", "#F87171");
      root.style.setProperty("--status-error-bg", "rgba(239, 68, 68, 0.1)");
      root.style.setProperty("--status-error-border", "rgba(239, 68, 68, 0.2)");
      root.style.setProperty("--status-warning", "#F59E0B");
      root.style.setProperty("--status-warning-bg", "rgba(245, 158, 11, 0.1)");
      root.style.setProperty("--status-warning-border", "rgba(245, 158, 11, 0.2)");
    }
  }, [primary, isDark]);

  return null;
}

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const colorMode = useThemeStore((s) => s.colorMode);
  const colorTheme = useThemeStore((s) => s.colorTheme);
  const customPrimary = useThemeStore((s) => s.customPrimary);
  const loaded = useThemeStore((s) => s.loaded);
  const loadFromStore = useThemeStore((s) => s.loadFromStore);

  useEffect(() => {
    loadFromStore();
  }, [loadFromStore]);

  const theme = useMemo(
    () => getThemeWithPrimary(colorTheme, customPrimary),
    [colorTheme, customPrimary],
  );

  const defaultColorScheme = colorMode === "system" ? "auto" : colorMode;

  if (!loaded) return null;

  return (
    <MantineProvider theme={theme} defaultColorScheme={defaultColorScheme}>
      <ColorSchemeSync />
      <CssVariableSync />
      {children}
    </MantineProvider>
  );
}
