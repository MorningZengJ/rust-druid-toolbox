import { useEffect, useMemo } from "react";
import { MantineProvider } from "@mantine/core";
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
