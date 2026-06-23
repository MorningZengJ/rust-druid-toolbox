import { useMemo } from "react";
import { Stack, Group, Text, Box, ActionIcon } from "@mantine/core";
import { Palette, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useTheme, useColorThemes } from "@/hooks/useTheme";
import { generateColorTuple } from "@/mantine-theme";
import { PRESET_THEMES } from "@/mantine-theme";
import ThemeCard from "./ThemeCard";
import CustomColorEntry from "@/components/color/CustomColorEntry";
import ColorSwatch from "./ColorSwatch";
import PaletteStrip from "./PaletteStrip";

export default function ColorThemeSection() {
  const { t } = useTranslation("settings");
  const {
    colorTheme,
    customPrimary,
    setColorTheme,
    setCustomPrimary,
  } = useTheme();
  const colorThemes = useColorThemes();

  const isCustomActive = !!customPrimary;

  // 获取当前活跃主题的完整 10 阶调色板
  const activeTuple = useMemo(() => {
    if (isCustomActive && customPrimary) {
      return generateColorTuple(customPrimary);
    }
    return PRESET_THEMES[colorTheme].tuple;
  }, [colorTheme, customPrimary, isCustomActive]);

  return (
    <ThemeCard icon={<Palette size={16} />} title={t("theme.title")}>
      <Stack gap="md">
        {/* 预设色块 + 自定义入口 */}
        <Group gap="md" align="flex-start" wrap="wrap">
          {colorThemes.map((ct) => {
            const isActive = colorTheme === ct.value && !isCustomActive;
            return (
              <ColorSwatch
                key={ct.value}
                hex={ct.color}
                label={ct.label}
                isActive={isActive}
                onClick={() => setColorTheme(ct.value)}
              />
            );
          })}

          <CustomColorEntry
            customPrimary={customPrimary}
            onSelect={setCustomPrimary}
            customLabel={t("theme.custom")}
          />
        </Group>

        {/* 色阶预览带 */}
        {activeTuple && (
          <Box className="palette-preview-area">
            <Text
              size="xs"
              className="palette-label"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              {t("theme.palette")}
            </Text>
            <PaletteStrip shades={activeTuple} anchorIndex={5} />
          </Box>
        )}

        {/* Hex 信息行 */}
        <Group gap="md" wrap="wrap">
          {isCustomActive && customPrimary ? (
            <>
              <Box
                w={16}
                h={16}
                style={{
                  borderRadius: "50%",
                  backgroundColor: customPrimary,
                  border: "1px solid var(--border-strong)",
                  backgroundImage:
                    customPrimary.length === 9
                      ? "linear-gradient(45deg, #d0d0d0 25%, transparent 25%), linear-gradient(-45deg, #d0d0d0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #d0d0d0 75%), linear-gradient(-45deg, transparent 75%, #d0d0d0 75%)"
                      : "none",
                  backgroundSize: "10px 10px",
                  backgroundPosition: "0 0, 0 5px, 5px -5px, -5px 0",
                }}
              />
              <Text
                size="sm"
                style={{ fontFamily: "var(--font-mono)", fontSize: 13 }}
              >
                {t("theme.currentCustom", { color: customPrimary.toUpperCase() })}
              </Text>
              <ActionIcon
                size="xs"
                variant="subtle"
                color="gray"
                onClick={() => setCustomPrimary(undefined)}
                title={t("theme.clear")}
                ml="auto"
              >
                <X size={12} />
              </ActionIcon>
            </>
          ) : (
            <Text
              size="sm"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 13,
                color: "var(--text-secondary)",
              }}
            >
              {t("theme.accentLabel")}: {PRESET_THEMES[colorTheme].anchorHex.toUpperCase()}
              {" · "}
              {t("theme.lightLabel")}: {PRESET_THEMES[colorTheme].accentHex.toUpperCase()}
            </Text>
          )}
        </Group>
      </Stack>
    </ThemeCard>
  );
}
