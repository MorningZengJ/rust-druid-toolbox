import { memo, type ReactNode } from "react";
import { Flex, Box, Text, Tooltip } from "@mantine/core";
import { useTranslation } from "react-i18next";
import {
  PenLine,
  ImageIcon,
  Settings,
  Sun,
  Moon,
  Wrench,
} from "lucide-react";

export type SidebarPage = "rename" | "ascii-art" | "video-tool" | "settings";

interface NavItemDef {
  id: SidebarPage;
  label: string;
  icon: ReactNode;
  description: string;
}

interface SidebarProps {
  activePage: SidebarPage;
  isDark: boolean;
  onNavigate: (page: SidebarPage) => void;
  onToggleTheme: () => void;
}

// ── single nav button (memo to avoid re-render on other page changes) ──

interface NavButtonProps {
  item: NavItemDef;
  isActive: boolean;
  onClick: () => void;
}

const NavButton = memo(function NavButton({ item, isActive, onClick }: NavButtonProps) {
  return (
    <Tooltip label={item.description} position="right" withArrow offset={12}>
      <Box
        onClick={onClick}
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
});

// ── sidebar ──

function Sidebar({ activePage, isDark, onNavigate, onToggleTheme }: SidebarProps) {
  const { t } = useTranslation("common");

  const navItems: NavItemDef[] = [
    { id: "rename", label: t("navigation.rename"), icon: <PenLine size={20} />, description: t("navigation.renameDesc") },
    { id: "ascii-art", label: t("navigation.asciiArt"), icon: <ImageIcon size={20} />, description: t("navigation.asciiArtDesc") },
    { id: "video-tool", label: t("navigation.videoTool"), icon: <Wrench size={20} />, description: t("navigation.videoToolDesc") },
  ];

  const isSettingsActive = activePage === "settings";

  return (
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
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <img
            src="/icon.png"
            width={36}
            height={36}
            style={{ borderRadius: 10, objectFit: "contain" }}
            alt={t("brand.logoAlt")}
          />
        </Box>
      </Flex>

      {/* Main nav items */}
      <Flex direction="column" gap={2} px="xs" style={{ flex: 1 }}>
        {navItems.map((item) => (
          <NavButton
            key={item.id}
            item={item}
            isActive={activePage === item.id}
            onClick={() => onNavigate(item.id)}
          />
        ))}
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
        {/* Theme toggle */}
        <Tooltip label={isDark ? t("theme.switchToLight") : t("theme.switchToDark")} position="right" withArrow offset={12}>
          <Box
            onClick={onToggleTheme}
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

        {/* Settings */}
        <Tooltip label={t("navigation.settings")} position="right" withArrow offset={12}>
          <Box
            onClick={() => onNavigate("settings")}
            style={{
              position: "relative",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
              padding: "10px 8px",
              borderRadius: 10,
              cursor: "pointer",
              backgroundColor: isSettingsActive ? "var(--accent-glow)" : "transparent",
              transition: "all 200ms cubic-bezier(0.4, 0, 0.2, 1)",
            }}
            onMouseEnter={(e) => {
              if (!isSettingsActive) {
                e.currentTarget.style.backgroundColor = "var(--border-subtle)";
              }
            }}
            onMouseLeave={(e) => {
              if (!isSettingsActive) {
                e.currentTarget.style.backgroundColor = "transparent";
              }
            }}
          >
            {isSettingsActive && (
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
                color: isSettingsActive ? "var(--accent-primary)" : "var(--text-muted)",
                transition: "all 200ms ease",
                transform: isSettingsActive ? "scale(1.05)" : "scale(1)",
              }}
            >
              <Settings size={20} />
            </Box>
            <Text
              size="xs"
              fw={isSettingsActive ? 600 : 400}
              style={{
                color: isSettingsActive ? "var(--text-primary)" : "var(--text-muted)",
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
  );
}

export default memo(Sidebar);
