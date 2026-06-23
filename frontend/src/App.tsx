import { useState, useEffect } from "react";
import { Flex, Box, Text, Tooltip } from "@mantine/core";
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
import { useComputedColorScheme } from "@mantine/core";
import { useUpdateStore } from "@/stores/updateStore";
import RenamePage from "@/pages/rename/RenamePage";
import AsciiArtPage from "@/pages/ascii-art/AsciiArtPage";
import VideoToolPage from "@/pages/video-tool/VideoToolPage";
import SettingsPage from "@/pages/settings/SettingsPage";

type Page = "rename" | "ascii-art" | "video-tool" | "settings";

function App() {
  const { t } = useTranslation("common");
  const [activePage, setActivePage] = useState<Page>("rename");
  const [pageVisible, setPageVisible] = useState(true);
  const colorScheme = useComputedColorScheme();
  const { colorMode, setColorMode } = useTheme();
  useWindowState();

  const isDark = colorScheme === "dark";

  const handlePageChange = (page: Page) => {
    if (page === activePage) return;
    setPageVisible(false);
    setTimeout(() => {
      setActivePage(page);
      setPageVisible(true);
    }, 150);
  };

  const navItems: { id: Page; label: string; icon: React.ReactNode; description: string }[] = [
    { id: "rename", label: t("navigation.rename"), icon: <PenLine size={20} />, description: t("navigation.renameDesc") },
    { id: "ascii-art", label: t("navigation.asciiArt"), icon: <ImageIcon size={20} />, description: t("navigation.asciiArtDesc") },
    { id: "video-tool", label: t("navigation.videoTool"), icon: <Wrench size={20} />, description: t("navigation.videoToolDesc") },
  ];

  const updateInit = useUpdateStore((s) => s.init);
  const currentVersion = useUpdateStore((s) => s.currentVersion);

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
        {/* === Navigation sidebar === */}
        <Flex
          direction="column"
          w={72}
          py="md"
          style={{
            borderRight: "1px solid var(--border-default)",
            backgroundColor: "var(--surface-base)",
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
                background: "linear-gradient(135deg, var(--accent-primary), var(--accent-dark))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 2px 12px var(--accent-glow)",
                position: "relative",
              }}
            >
              <Text
                size="sm"
                fw={700}
                c="var(--surface-base)"
                style={{ fontFamily: "var(--font-display)" }}
              >
                T
              </Text>
              <Box
                style={{
                  position: "absolute",
                  bottom: -4,
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: 24,
                  height: 4,
                  borderRadius: "50%",
                  background: "var(--accent-glow)",
                  filter: "blur(3px)",
                }}
              />
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
                    onClick={() => handlePageChange(item.id)}
                    style={{
                      position: "relative",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 4,
                      padding: "10px 8px",
                      borderRadius: 10,
                      cursor: "pointer",
                      backgroundColor: isActive ? "var(--accent-glow)" : "transparent",
                      transition: "all 200ms cubic-bezier(0.4, 0, 0.2, 1)",
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = "var(--border-subtle)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = "transparent";
                      }
                    }}
                  >
                    {isActive && (
                      <Box
                        style={{
                          position: "absolute",
                          left: -12,
                          top: "50%",
                          transform: "translateY(-50%)",
                          width: 3,
                          height: 20,
                          borderRadius: "0 3px 3px 0",
                          backgroundColor: "var(--accent-primary)",
                          boxShadow: "0 0 8px var(--accent-glow)",
                        }}
                      />
                    )}
                    <Box
                      style={{
                        color: isActive ? "var(--accent-primary)" : "var(--text-muted)",
                        transition: "all 200ms ease",
                        transform: isActive ? "scale(1.05)" : "scale(1)",
                      }}
                    >
                      {item.icon}
                    </Box>
                    <Text
                      size="xs"
                      fw={isActive ? 600 : 400}
                      style={{
                        color: isActive ? "var(--text-primary)" : "var(--text-muted)",
                        transition: "color 200ms ease",
                        lineHeight: 1,
                        whiteSpace: "nowrap",
                        fontFamily: "var(--font-body)",
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
                backgroundColor: "var(--border-default)",
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
                  borderRadius: 10,
                  cursor: "pointer",
                  backgroundColor: "transparent",
                  transition: "all 200ms cubic-bezier(0.4, 0, 0.2, 1)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "var(--border-subtle)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                }}
              >
                <Box
                  style={{
                    color: "var(--text-muted)",
                    transition: "color 200ms ease",
                  }}
                >
                  {isDark ? <Sun size={20} /> : <Moon size={20} />}
                </Box>
                <Text
                  size="xs"
                  fw={400}
                  style={{
                    color: "var(--text-muted)",
                    transition: "color 200ms ease",
                    lineHeight: 1,
                    whiteSpace: "nowrap",
                    fontFamily: "var(--font-body)",
                  }}
                >
                  {isDark ? t("theme.light") : t("theme.dark")}
                </Text>
              </Box>
            </Tooltip>
            <Tooltip label={t("navigation.settings")} position="right" withArrow offset={12}>
              <Box
                onClick={() => handlePageChange("settings")}
                style={{
                  position: "relative",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 4,
                  padding: "10px 8px",
                  borderRadius: 10,
                  cursor: "pointer",
                  backgroundColor: activePage === "settings" ? "var(--accent-glow)" : "transparent",
                  transition: "all 200ms cubic-bezier(0.4, 0, 0.2, 1)",
                }}
                onMouseEnter={(e) => {
                  if (activePage !== "settings") {
                    e.currentTarget.style.backgroundColor = "var(--border-subtle)";
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
                      borderRadius: "0 3px 3px 0",
                      backgroundColor: "var(--accent-primary)",
                      boxShadow: "0 0 8px var(--accent-glow)",
                    }}
                  />
                )}
                <Box
                  style={{
                    color: activePage === "settings" ? "var(--accent-primary)" : "var(--text-muted)",
                    transition: "all 200ms ease",
                    transform: activePage === "settings" ? "scale(1.05)" : "scale(1)",
                  }}
                >
                  <Settings size={20} />
                </Box>
                <Text
                  size="xs"
                  fw={activePage === "settings" ? 600 : 400}
                  style={{
                    color: activePage === "settings" ? "var(--text-primary)" : "var(--text-muted)",
                    transition: "color 200ms ease",
                    lineHeight: 1,
                    whiteSpace: "nowrap",
                    fontFamily: "var(--font-body)",
                  }}
                >
                  {t("navigation.settings")}
                </Text>
              </Box>
            </Tooltip>
          </Flex>
        </Flex>

        {/* === Main content area === */}
        <Flex direction="column" style={{ flex: 1, overflow: "hidden" }}>
          <Box
            style={{
              flex: 1,
              overflow: "hidden",
              padding: 12,
              opacity: pageVisible ? 1 : 0,
              transform: pageVisible ? "translateY(0)" : "translateY(6px)",
              transition: "opacity 150ms ease, transform 150ms ease",
            }}
          >
            <Box h="100%" style={{ display: activePage === "rename" ? "block" : "none" }}>
              <RenamePage />
            </Box>
            <Box h="100%" style={{ display: activePage === "ascii-art" ? "block" : "none" }}>
              <AsciiArtPage />
            </Box>
            <Box h="100%" style={{ display: activePage === "video-tool" ? "block" : "none" }}>
              <VideoToolPage />
            </Box>
            <Box h="100%" style={{ display: activePage === "settings" ? "block" : "none" }}>
              <SettingsPage />
            </Box>
          </Box>

          {/* === Status bar === */}
          <Flex
            h={28}
            px="md"
            align="center"
            justify="space-between"
            style={{
              borderTop: "1px solid var(--border-subtle)",
              backgroundColor: "var(--surface-base)",
              flexShrink: 0,
            }}
          >
            <Flex align="center" gap="md">
              <Text
                size="xs"
                style={{
                  color: "var(--text-muted)",
                  fontFamily: "var(--font-body)",
                  fontSize: 11,
                }}
              >
                {navItems.find((item) => item.id === activePage)?.description || ""}
              </Text>
            </Flex>
            <Flex align="center" gap="md">
              <Text
                size="xs"
                style={{
                  color: "var(--text-muted)",
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  letterSpacing: "0.02em",
                }}
              >
                Tauri Toolbox{currentVersion ? ` v${currentVersion}` : ""}
              </Text>
            </Flex>
          </Flex>
        </Flex>
      </Flex>
    </ModalsProvider>
  );
}

export default App;
