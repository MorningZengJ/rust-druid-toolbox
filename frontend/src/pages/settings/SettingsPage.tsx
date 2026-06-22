import { useState, useEffect } from "react";
import { Stack, Title, Group, Button, TextInput, Text, Box, ActionIcon, Select } from "@mantine/core";
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
    borderRadius: 12,
    border: "1px solid var(--border-default)",
    backgroundColor: "var(--surface-overlay)",
    overflow: "hidden" as const,
    position: "relative" as const,
  };

  const sectionHeaderStyle = {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "10px 14px",
    borderBottom: "1px solid var(--border-subtle)",
    backgroundColor: "var(--surface-panel)",
  };

  const sectionBodyStyle = {
    padding: "14px",
  };

  const selectStyles = {
    input: {
      backgroundColor: "var(--surface-panel)",
      borderColor: "var(--border-default)",
      color: "var(--text-primary)",
    },
  };

  return (
    <Stack h="100%" style={{ overflow: "auto" }}>
      <Title order={3} fw={600} style={{ fontFamily: "var(--font-display)" }}>{t("title")}</Title>

      <Stack gap="lg" maw={520}>
        {/* Display Mode */}
        <Box style={cardStyle}>
          {/* 顶部高光线 */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 1,
              background: "linear-gradient(90deg, transparent, var(--accent-glow), transparent)",
              pointerEvents: "none",
              zIndex: 1,
            }}
          />
          <div style={sectionHeaderStyle}>
            {colorMode === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            <Text size="sm" fw={600} style={{ fontFamily: "var(--font-body)" }}>{t("appearance.title")}</Text>
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
                    transition: "all 200ms cubic-bezier(0.4, 0, 0.2, 1)",
                    ...(colorMode === mode.value
                      ? {
                        boxShadow: "0 0 0 1px var(--accent-glow)",
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
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 1,
              background: "linear-gradient(90deg, transparent, var(--accent-glow), transparent)",
              pointerEvents: "none",
              zIndex: 1,
            }}
          />
          <div style={sectionHeaderStyle}>
            <Palette size={16} />
            <Text size="sm" fw={600} style={{ fontFamily: "var(--font-body)" }}>{t("theme.title")}</Text>
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
                        ? "2px solid var(--accent-primary)"
                        : "2px solid var(--border-strong)",
                      transform: isActive ? "scale(1.1)" : "scale(1)",
                      boxShadow: isActive ? "var(--shadow-md)" : "none",
                      transition: "all 200ms cubic-bezier(0.4, 0, 0.2, 1)",
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
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 1,
              background: "linear-gradient(90deg, transparent, var(--accent-glow), transparent)",
              pointerEvents: "none",
              zIndex: 1,
            }}
          />
          <div style={sectionHeaderStyle}>
            <Palette size={16} />
            <Text size="sm" fw={600} style={{ fontFamily: "var(--font-body)" }}>{t("theme.customColor")}</Text>
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
                  styles={{
                    input: {
                      fontFamily: "var(--font-mono)",
                      backgroundColor: "var(--surface-panel)",
                      borderColor: "var(--border-default)",
                      color: "var(--text-primary)",
                    },
                  }}
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
                      border: "1px solid var(--border-strong)",
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
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 1,
              background: "linear-gradient(90deg, transparent, var(--accent-glow), transparent)",
              pointerEvents: "none",
              zIndex: 1,
            }}
          />
          <div style={sectionHeaderStyle}>
            <Languages size={16} />
            <Text size="sm" fw={600} style={{ fontFamily: "var(--font-body)" }}>{t("language.title")}</Text>
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
              styles={selectStyles}
            />
          </div>
        </Box>

        {/* About & Update */}
        <Box style={cardStyle}>
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 1,
              background: "linear-gradient(90deg, transparent, var(--accent-glow), transparent)",
              pointerEvents: "none",
              zIndex: 1,
            }}
          />
          <div style={sectionHeaderStyle}>
            <Download size={16} />
            <Text size="sm" fw={600} style={{ fontFamily: "var(--font-body)" }}>{t("update.title")}</Text>
          </div>
          <div style={sectionBodyStyle}>
            <UpdateSection />
          </div>
        </Box>
      </Stack>
    </Stack>
  );
}
