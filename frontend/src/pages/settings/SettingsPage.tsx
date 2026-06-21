import { useState, useEffect } from "react";
import { Stack, Title, Group, Button, TextInput, Text, Box, ActionIcon, Select, useMantineTheme, useComputedColorScheme } from "@mantine/core";
import { Sun, Moon, Monitor, Check, Palette, Download, Languages } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useTheme, useColorThemes } from "@/hooks/useTheme";
import { useUpdateStore } from "@/stores/updateStore";
import { useI18nStore } from "@/stores/i18nStore";
import { languageNames } from "@/i18n/types";
import type { Language as LanguageType } from "@/i18n/types";
import UpdateSection from "./UpdateSection";

export default function SettingsPage() {
  const { t } = useTranslation("settings");
  const { colorMode, colorTheme, customPrimary, setColorMode, setColorTheme, setCustomPrimary } =
    useTheme();
  const colorThemes = useColorThemes();
  const { language, setLanguage } = useI18nStore();
  const [customColorInput, setCustomColorInput] = useState("");
  const theme = useMantineTheme();
  const colorScheme = useComputedColorScheme();
  const isDark = colorScheme === "dark";
  const updateInit = useUpdateStore((s) => s.init);

  useEffect(() => {
    updateInit();
  }, [updateInit]);

  const handleCustomColorApply = () => {
    const hex = customColorInput.trim();
    if (/^#?[a-f\d]{6}$/i.test(hex)) {
      setCustomPrimary(hex.startsWith("#") ? hex : `#${hex}`);
    }
  };

  const handleClearCustom = () => {
    setCustomPrimary(undefined);
    setCustomColorInput("");
  };

  const isCustomActive = !!customPrimary;

  const cardStyle = {
    borderRadius: theme.radius.lg,
    border: `1px solid ${isDark ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.06)"}`,
    backgroundColor: isDark ? theme.colors.dark[7] : theme.white,
    overflow: "hidden" as const,
  };

  const sectionHeaderStyle = {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "12px 16px",
    borderBottom: `1px solid ${isDark ? "rgba(255, 255, 255, 0.04)" : "rgba(0, 0, 0, 0.04)"}`,
    backgroundColor: isDark ? "rgba(255, 255, 255, 0.02)" : "rgba(0, 0, 0, 0.01)",
  };

  const sectionBodyStyle = {
    padding: "16px",
  };

  return (
    <Stack h="100%" style={{ overflow: "auto" }}>
      <Title order={3} fw={600}>{t("title")}</Title>

      <Stack gap="lg" maw={520}>
        {/* Display Mode */}
        <Box style={cardStyle}>
          <div style={sectionHeaderStyle}>
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
            <Text size="sm" fw={600}>{t("appearance.title")}</Text>
          </div>
          <div style={sectionBodyStyle}>
            <Group gap="xs">
              {([
                { value: "light" as const, label: t("appearance.light"), icon: <Sun size={14} /> },
                { value: "dark" as const, label: t("appearance.dark"), icon: <Moon size={14} /> },
                { value: "system" as const, label: t("appearance.system"), icon: <Monitor size={14} /> },
              ]).map((mode) => (
                <Button
                  key={mode.value}
                  variant={colorMode === mode.value ? "light" : "default"}
                  size="compact-sm"
                  leftSection={mode.icon}
                  onClick={() => setColorMode(mode.value)}
                  radius="md"
                  style={{
                    transition: "all 150ms ease",
                    ...(colorMode === mode.value
                      ? {
                        boxShadow: `0 0 0 1px ${theme.colors[theme.primaryColor][isDark ? 5 : 4]}40`,
                      }
                      : {}),
                  }}
                >
                  {mode.label}
                </Button>
              ))}
            </Group>
          </div>
        </Box>

        {/* Color Theme */}
        <Box style={cardStyle}>
          <div style={sectionHeaderStyle}>
            <Palette size={16} />
            <Text size="sm" fw={600}>{t("theme.title")}</Text>
          </div>
          <div style={sectionBodyStyle}>
            <Group gap="sm">
              {colorThemes.map((ct) => {
                const isActive = colorTheme === ct.value && !isCustomActive;
                return (
                  <ActionIcon
                    key={ct.value}
                    size="xl"
                    radius="xl"
                    variant="transparent"
                    style={{
                      backgroundColor: ct.color,
                      width: 40,
                      height: 40,
                      border: isActive
                        ? `2px solid ${theme.colors[theme.primaryColor][6]}`
                        : `2px solid ${isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.08)"}`,
                      transform: isActive ? "scale(1.1)" : "scale(1)",
                      boxShadow: isActive ? theme.shadows.md : "none",
                      transition: "all 150ms ease",
                    }}
                    onClick={() => setColorTheme(ct.value)}
                    title={ct.label}
                  >
                    {isActive && (
                      <Check size={16} color="white" style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.3))" }} />
                    )}
                  </ActionIcon>
                );
              })}
            </Group>
          </div>
        </Box>

        {/* Custom Color */}
        <Box style={cardStyle}>
          <div style={sectionHeaderStyle}>
            <Palette size={16} />
            <Text size="sm" fw={600}>{t("theme.customColor")}</Text>
          </div>
          <div style={sectionBodyStyle}>
            <Stack gap="sm">
              <Group gap="xs">
                <TextInput
                  style={{ flex: 1 }}
                  placeholder={t("theme.colorPlaceholder")}
                  value={customColorInput}
                  onChange={(e) => setCustomColorInput(e.currentTarget.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCustomColorApply()}
                  radius="md"
                />
                <Button size="compact-sm" onClick={handleCustomColorApply} radius="md">
                  {t("theme.apply")}
                </Button>
                {isCustomActive && (
                  <Button size="compact-sm" variant="default" onClick={handleClearCustom} radius="md">
                    {t("theme.clear")}
                  </Button>
                )}
              </Group>
              {isCustomActive && (
                <Group gap="xs">
                  <Box
                    w={16}
                    h={16}
                    style={{
                      borderRadius: "50%",
                      backgroundColor: customPrimary,
                      border: `1px solid ${isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"}`,
                    }}
                  />
                  <Text size="sm" c="dimmed">{t("theme.currentCustom", { color: customPrimary })}</Text>
                </Group>
              )}
            </Stack>
          </div>
        </Box>

        {/* Language */}
        <Box style={cardStyle}>
          <div style={sectionHeaderStyle}>
            <Languages size={16} />
            <Text size="sm" fw={600}>{t("language.title")}</Text>
          </div>
          <div style={sectionBodyStyle}>
            <Select
              label={t("language.label")}
              value={language}
              onChange={(v) => setLanguage(v as LanguageType)}
              data={Object.entries(languageNames).map(([value, label]) => ({
                value,
                label,
              }))}
              radius="md"
            />
          </div>
        </Box>

        {/* About & Update */}
        <Box style={cardStyle}>
          <div style={sectionHeaderStyle}>
            <Download size={16} />
            <Text size="sm" fw={600}>{t("update.title")}</Text>
          </div>
          <div style={sectionBodyStyle}>
            <UpdateSection />
          </div>
        </Box>
      </Stack>
    </Stack>
  );
}
