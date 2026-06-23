import { useEffect } from "react";
import {
  Stack,
  Title,
  Group,
  Button,
  Select,
} from "@mantine/core";
import {
  Sun,
  Moon,
  Monitor,
  Download,
  Languages,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/hooks/useTheme";
import { useUpdateStore } from "@/stores/updateStore";
import { useI18nStore } from "@/stores/i18nStore";
import { languageNames } from "@/i18n/types";
import type { Language as LanguageType } from "@/i18n/types";
import UpdateSection from "./UpdateSection";
import ThemeCard from "@/components/theme/ThemeCard";
import ColorThemeSection from "@/components/theme/ColorThemeSection";

export default function SettingsPage() {
  const { t } = useTranslation("settings");
  const { colorMode, setColorMode } = useTheme();
  const { language, setLanguage } = useI18nStore();
  const updateInit = useUpdateStore((s) => s.init);

  useEffect(() => {
    updateInit();
  }, [updateInit]);

  const selectStyles = {
    input: {
      backgroundColor: "var(--surface-panel)",
      borderColor: "var(--border-default)",
      color: "var(--text-primary)",
    },
  };

  return (
    <Stack h="100%" style={{ overflow: "auto" }}>
      <Title order={3} fw={600} style={{ fontFamily: "var(--font-display)" }}>
        {t("title")}
      </Title>

      <Stack gap="lg" maw={560}>
        {/* Display Mode */}
        <ThemeCard
          icon={colorMode === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          title={t("appearance.title")}
        >
          <Group gap="xs">
            {([
              {
                value: "light" as const,
                label: t("appearance.light"),
                icon: <Sun size={14} />,
              },
              {
                value: "dark" as const,
                label: t("appearance.dark"),
                icon: <Moon size={14} />,
              },
              {
                value: "system" as const,
                label: t("appearance.system"),
                icon: <Monitor size={14} />,
              },
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
        </ThemeCard>

        {/* Color Theme — preset swatches + custom + palette preview */}
        <ColorThemeSection />

        {/* Language */}
        <ThemeCard
          icon={<Languages size={16} />}
          title={t("language.title")}
        >
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
        </ThemeCard>

        {/* About & Update */}
        <ThemeCard
          icon={<Download size={16} />}
          title={t("update.title")}
        >
          <UpdateSection />
        </ThemeCard>
      </Stack>
    </Stack>
  );
}
