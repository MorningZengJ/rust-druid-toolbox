import { useState, useEffect } from "react";
import { Flex, Box, Text, useComputedColorScheme, useMantineTheme, Tooltip } from "@mantine/core";
import { ModalsProvider } from "@mantine/modals";
import {
  PenLine,
  ImageIcon,
  Settings,
  Sun,
  Moon,
  Wrench,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useWindowState } from "@/hooks/useWindowState";
import { useTheme } from "@/hooks/useTheme";
import { useUpdateStore } from "@/stores/updateStore";
import RenamePage from "@/pages/rename/RenamePage";
import AsciiArtPage from "@/pages/ascii-art/AsciiArtPage";
import VideoToolPage from "@/pages/video-tool/VideoToolPage";
import SettingsPage from "@/pages/settings/SettingsPage";

type Page = "rename" | "ascii-art" | "video-tool" | "settings";

function App() {
  const { t } = useTranslation("common");
  const [activePage, setActivePage] = useState<Page>("rename");
  const colorScheme = useComputedColorScheme();
  const { colorMode, setColorMode } = useTheme();
  const theme = useMantineTheme();
  useWindowState();

  const isDark = colorScheme === "dark";

  const navItems: { id: Page; label: string; icon: React.ReactNode; description: string }[] = [
    { id: "rename", label: t("navigation.rename"), icon: <PenLine size={20} />, description: t("navigation.renameDesc") },
    { id: "ascii-art", label: t("navigation.asciiArt"), icon: <ImageIcon size={20} />, description: t("navigation.asciiArtDesc") },
    { id: "video-tool", label: t("navigation.videoTool"), icon: <Wrench size={20} />, description: t("navigation.videoToolDesc") },
  ];

  // Auto-check for updates on startup
  const updateInit = useUpdateStore((s) => s.init);

  useEffect(() => {
    updateInit().then(() => {
      const state = useUpdateStore.getState();
      if (state.autoCheck) {
        state.checkForUpdate();
      }
    });
  }, []);

  const handleToggleColorScheme = () => {
    setColorMode(colorMode === "light" ? "dark" : "light");
  };

  return (
    <ModalsProvider>
      <Flex h="100vh" w="100vw" style={{ overflow: "hidden" }}>
        {/* Navigation sidebar */}
        <Flex
          direction="column"
          w={80}
          py="md"
          style={{
            borderRight: `1px solid ${isDark ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.06)"}`,
            backgroundColor: isDark ? theme.colors.dark[8] : theme.colors.gray[0],
            position: "relative",
            zIndex: 10,
          }}
        >
          {/* Logo */}
          <Flex direction="column" align="center" mb="xl" px="xs">
            <Box
              w={36}
              h={36}
              style={{
                borderRadius: 10,
                background: `linear-gradient(135deg, ${theme.colors[theme.primaryColor][5]}, ${theme.colors[theme.primaryColor][7]})`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: `0 2px 8px ${theme.colors[theme.primaryColor][5]}40`,
              }}
            >
              <Text size="sm" fw={700} c="white" style={{ fontFamily: "monospace" }}>D</Text>
            </Box>
          </Flex>

          {/* Main nav items */}
          <Flex direction="column" gap={2} px="xs" style={{ flex: 1 }}>
            {navItems.map((item) => {
              const isActive = activePage === item.id;
              return (
                <Tooltip
                  key={item.id}
                  label={item.description}
                  position="right"
                  withArrow
                  offset={12}
                >
                  <Box
                    onClick={() => setActivePage(item.id)}
                    style={{
                      position: "relative",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 4,
                      padding: "10px 8px",
                      borderRadius: theme.radius.md,
                      cursor: "pointer",
                      backgroundColor: isActive
                        ? isDark
                          ? "rgba(255, 255, 255, 0.06)"
                          : "rgba(0, 0, 0, 0.04)"
                        : "transparent",
                      transition: "all 150ms ease",
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = isDark
                          ? "rgba(255, 255, 255, 0.04)"
                          : "rgba(0, 0, 0, 0.03)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = "transparent";
                      }
                    }}
                  >
                    {/* Active indicator bar */}
                    {isActive && (
                      <Box
                        style={{
                          position: "absolute",
                          left: -12,
                          top: "50%",
                          transform: "translateY(-50%)",
                          width: 3,
                          height: 20,
                          borderRadius: "0 2px 2px 0",
                          backgroundColor: theme.colors[theme.primaryColor][5],
                        }}
                      />
                    )}
                    <Box
                      style={{
                        color: isActive
                          ? theme.colors[theme.primaryColor][isDark ? 4 : 6]
                          : isDark
                            ? theme.colors.dark[2]
                            : theme.colors.gray[6],
                        transition: "color 150ms ease",
                      }}
                    >
                      {item.icon}
                    </Box>
                    <Text
                      size="xs"
                      fw={isActive ? 600 : 400}
                      style={{
                        color: isActive
                          ? isDark
                            ? theme.colors.dark[0]
                            : theme.colors.gray[8]
                          : isDark
                            ? theme.colors.dark[2]
                            : theme.colors.gray[6],
                        transition: "color 150ms ease",
                        lineHeight: 1,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {item.label}
                    </Text>
                  </Box>
                </Tooltip>
              );
            })}
          </Flex>

          {/* Bottom section */}
          <Flex direction="column" gap={2} px="xs">
            <Box
              style={{
                width: 24,
                height: 1,
                backgroundColor: isDark ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.06)",
                margin: "4px auto 8px",
              }}
            />
            <Tooltip label={isDark ? t("theme.switchToLight") : t("theme.switchToDark")} position="right" withArrow offset={12}>
              <Box
                onClick={handleToggleColorScheme}
                style={{
                  position: "relative",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 4,
                  padding: "10px 8px",
                  borderRadius: theme.radius.md,
                  cursor: "pointer",
                  backgroundColor: "transparent",
                  transition: "all 150ms ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = isDark
                    ? "rgba(255, 255, 255, 0.04)"
                    : "rgba(0, 0, 0, 0.03)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                }}
              >
                <Box
                  style={{
                    color: isDark ? theme.colors.dark[2] : theme.colors.gray[6],
                    transition: "color 150ms ease",
                  }}
                >
                  {isDark ? <Sun size={20} /> : <Moon size={20} />}
                </Box>
                <Text
                  size="xs"
                  fw={400}
                  style={{
                    color: isDark ? theme.colors.dark[2] : theme.colors.gray[6],
                    transition: "color 150ms ease",
                    lineHeight: 1,
                    whiteSpace: "nowrap",
                  }}
                >
                  {isDark ? t("theme.light") : t("theme.dark")}
                </Text>
              </Box>
            </Tooltip>
            <Tooltip label={t("navigation.settings")} position="right" withArrow offset={12}>
              <Box
                onClick={() => setActivePage("settings")}
                style={{
                  position: "relative",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 4,
                  padding: "10px 8px",
                  borderRadius: theme.radius.md,
                  cursor: "pointer",
                  backgroundColor: activePage === "settings"
                    ? isDark
                      ? "rgba(255, 255, 255, 0.06)"
                      : "rgba(0, 0, 0, 0.04)"
                    : "transparent",
                  transition: "all 150ms ease",
                }}
                onMouseEnter={(e) => {
                  if (activePage !== "settings") {
                    e.currentTarget.style.backgroundColor = isDark
                      ? "rgba(255, 255, 255, 0.04)"
                      : "rgba(0, 0, 0, 0.03)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (activePage !== "settings") {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }
                }}
              >
                {activePage === "settings" && (
                  <Box
                    style={{
                      position: "absolute",
                      left: -12,
                      top: "50%",
                      transform: "translateY(-50%)",
                      width: 3,
                      height: 20,
                      borderRadius: "0 2px 2px 0",
                      backgroundColor: theme.colors[theme.primaryColor][5],
                    }}
                  />
                )}
                <Box
                  style={{
                    color: activePage === "settings"
                      ? theme.colors[theme.primaryColor][isDark ? 4 : 6]
                      : isDark
                        ? theme.colors.dark[2]
                        : theme.colors.gray[6],
                    transition: "color 150ms ease",
                  }}
                >
                  <Settings size={20} />
                </Box>
                <Text
                  size="xs"
                  fw={activePage === "settings" ? 600 : 400}
                  style={{
                    color: activePage === "settings"
                      ? isDark
                        ? theme.colors.dark[0]
                        : theme.colors.gray[8]
                      : isDark
                        ? theme.colors.dark[2]
                        : theme.colors.gray[6],
                    transition: "color 150ms ease",
                    lineHeight: 1,
                    whiteSpace: "nowrap",
                  }}
                >
                  {t("navigation.settings")}
                </Text>
              </Box>
            </Tooltip>
          </Flex>
        </Flex>

        {/* Main content */}
        <Box style={{ flex: 1, overflow: "hidden" }}>
          <Box h="100%" p="md" style={{ display: activePage === "rename" ? "block" : "none" }}>
            <RenamePage />
          </Box>
          <Box h="100%" p="md" style={{ display: activePage === "ascii-art" ? "block" : "none" }}>
            <AsciiArtPage />
          </Box>
          <Box h="100%" p="md" style={{ display: activePage === "video-tool" ? "block" : "none" }}>
            <VideoToolPage />
          </Box>
          <Box h="100%" p="md" style={{ display: activePage === "settings" ? "block" : "none" }}>
            <SettingsPage />
          </Box>
        </Box>
      </Flex>
    </ModalsProvider>
  );
}

export default App;
