import { useEffect, useRef, useState, useCallback } from "react";
import { Flex } from "@mantine/core";
import { ModalsProvider } from "@mantine/modals";
import { useComputedColorScheme } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useWindowState } from "@/hooks/useWindowState";
import { useTheme } from "@/hooks/useTheme";
import { useUpdateStore } from "@/stores/updateStore";
import Sidebar, { type SidebarPage } from "./app/Sidebar";
import StatusBar from "./app/StatusBar";
import PageContainer from "./app/PageContainer";

// ── constants ──

const NAV_DESCRIPTIONS: Record<SidebarPage, string> = {
  rename: "navigation.renameDesc",
  "ascii-art": "navigation.asciiArtDesc",
  "video-tool": "navigation.videoToolDesc",
  settings: "navigation.settings",
};

// ── App ──

function App() {
  const { t } = useTranslation("common");
  const [activePage, setActivePage] = useState<SidebarPage>("rename");
  const [pageVisible, setPageVisible] = useState(true);
  const colorScheme = useComputedColorScheme();
  const { colorMode, setColorMode } = useTheme();
  useWindowState();

  const isDark = colorScheme === "dark";

  // ── page transition with timer cleanup ──

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleNavigate = useCallback(
    (page: SidebarPage) => {
      if (page === activePage) return;
      if (timerRef.current !== null) clearTimeout(timerRef.current);
      setPageVisible(false);
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        setActivePage(page);
        setPageVisible(true);
      }, 150);
    },
    [activePage],
  );

  // cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    };
  }, []);

  // ── theme toggle ──

  const handleToggleTheme = useCallback(() => {
    setColorMode(colorMode === "light" ? "dark" : "light");
  }, [colorMode, setColorMode]);

  // ── update bootstrap ──

  const currentVersion = useUpdateStore((s) => s.currentVersion);

  useEffect(() => {
    const store = useUpdateStore.getState();
    store.init().then(() => {
      const state = useUpdateStore.getState();
      if (state.autoCheck) {
        state.checkForUpdate();
      }
    });
  }, []); // run once on mount — uses getState(), intentionally empty deps

  // ── derived ──

  const pageDescription = t(NAV_DESCRIPTIONS[activePage]);

  // ── render ──

  return (
    <ModalsProvider>
      <Flex h="100vh" w="100vw" style={{ overflow: "hidden" }}>
        <Sidebar
          activePage={activePage}
          isDark={isDark}
          onNavigate={handleNavigate}
          onToggleTheme={handleToggleTheme}
        />

        <Flex direction="column" style={{ flex: 1, overflow: "hidden" }}>
          <PageContainer activePage={activePage} visible={pageVisible} />
          <StatusBar pageDescription={pageDescription} currentVersion={currentVersion} />
        </Flex>
      </Flex>
    </ModalsProvider>
  );
}

export default App;
