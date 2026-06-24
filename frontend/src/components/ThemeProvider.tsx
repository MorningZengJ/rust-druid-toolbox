import { useEffect, useMemo } from "react";
import { MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { useThemeStore } from "@/stores/themeStore";
import { useColorSchemeSync } from "@/hooks/useTheme";
import { getThemeWithPrimary } from "@/mantine-theme";
import { CssVariableSync } from "@/components/theme/CssVariableSync";

function ColorSchemeSync() {
  useColorSchemeSync();
  return null;
}

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const colorMode = useThemeStore((s) => s.colorMode);
  const colorTheme = useThemeStore((s) => s.colorTheme);
  const customPrimary = useThemeStore((s) => s.customPrimary);
  const selectedShadeIndex = useThemeStore((s) => s.selectedShadeIndex);
  const loaded = useThemeStore((s) => s.loaded);
  const loadFromStore = useThemeStore((s) => s.loadFromStore);

  useEffect(() => {
    loadFromStore();
  }, [loadFromStore]);

  const theme = useMemo(
    () => getThemeWithPrimary(colorTheme, customPrimary, selectedShadeIndex),
    [colorTheme, customPrimary, selectedShadeIndex],
  );

  const defaultColorScheme = colorMode === "system" ? "auto" : colorMode;

  if (!loaded) return null;

  return (
    <MantineProvider theme={theme} defaultColorScheme={defaultColorScheme}>
      <Notifications position="top-right" autoClose={2000} />
      <ColorSchemeSync />
      <CssVariableSync />
      {children}
    </MantineProvider>
  );
}
