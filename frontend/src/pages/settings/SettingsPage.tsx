import { useState } from "react";
import { Stack, Title, Group, Button, TextInput, Text, Box, ActionIcon, useMantineTheme } from "@mantine/core";
import { Sun, Moon, Monitor, Check } from "lucide-react";
import { useTheme, COLOR_THEMES } from "@/hooks/useTheme";

export default function SettingsPage() {
  const { colorMode, colorTheme, customPrimary, setColorMode, setColorTheme, setCustomPrimary } =
    useTheme();
  const [customColorInput, setCustomColorInput] = useState("");
  const theme = useMantineTheme();

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

  return (
    <Stack h="100%">
      <Title order={2}>设置</Title>

      <Box maw={480}>
        <Stack gap="xl">
          {/* Color Mode */}
          <Stack gap="xs">
            <Text size="sm" fw={500} c="dimmed">显示模式</Text>
            <Group gap="xs">
              <Button
                variant={colorMode === "light" ? "filled" : "outline"}
                size="compact-sm"
                leftSection={<Sun size={14} />}
                onClick={() => setColorMode("light")}
              >
                亮色
              </Button>
              <Button
                variant={colorMode === "dark" ? "filled" : "outline"}
                size="compact-sm"
                leftSection={<Moon size={14} />}
                onClick={() => setColorMode("dark")}
              >
                暗色
              </Button>
              <Button
                variant={colorMode === "system" ? "filled" : "outline"}
                size="compact-sm"
                leftSection={<Monitor size={14} />}
                onClick={() => setColorMode("system")}
              >
                跟随系统
              </Button>
            </Group>
          </Stack>

          {/* Color Theme */}
          <Stack gap="xs">
            <Text size="sm" fw={500} c="dimmed">颜色主题</Text>
            <Group gap="sm">
              {COLOR_THEMES.map((t) => (
                <ActionIcon
                  key={t.value}
                  size="xl"
                  radius="xl"
                  variant="transparent"
                  style={{
                    backgroundColor: t.color,
                    width: 40,
                    height: 40,
                    border: colorTheme === t.value && !isCustomActive
                      ? `2px solid ${theme.colors[theme.primaryColor][6]}`
                      : "2px solid transparent",
                    transform: colorTheme === t.value && !isCustomActive ? "scale(1.1)" : "scale(1)",
                    boxShadow: colorTheme === t.value && !isCustomActive ? theme.shadows.md : "none",
                    transition: "all 150ms ease",
                  }}
                  onClick={() => setColorTheme(t.value)}
                  title={t.label}
                >
                  {colorTheme === t.value && !isCustomActive && (
                    <Check size={16} color="white" style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.3))" }} />
                  )}
                </ActionIcon>
              ))}
            </Group>
          </Stack>

          {/* Custom Color */}
          <Stack gap="xs">
            <Text size="sm" fw={500} c="dimmed">自定义颜色</Text>
            <Group gap="xs">
              <TextInput
                style={{ flex: 1 }}
                placeholder="#3b82f6 (HEX 色值)"
                value={customColorInput}
                onChange={(e) => setCustomColorInput(e.currentTarget.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCustomColorApply()}
              />
              <Button size="compact-sm" onClick={handleCustomColorApply}>
                应用
              </Button>
              {isCustomActive && (
                <Button size="compact-sm" variant="outline" onClick={handleClearCustom}>
                  清除
                </Button>
              )}
            </Group>
            {isCustomActive && (
              <Group gap="xs">
                <Box
                  w={16}
                  h={16}
                  style={{ borderRadius: "50%", backgroundColor: customPrimary }}
                />
                <Text size="sm" c="dimmed">当前自定义: {customPrimary}</Text>
              </Group>
            )}
          </Stack>

          {/* About */}
          <Stack gap="xs">
            <Text size="sm" fw={500} c="dimmed">关于</Text>
            <Box p="md" style={{ border: `1px solid ${theme.colors.gray[3]}`, borderRadius: theme.radius.md }}>
              <Text size="sm" fw={500}>Druid Toolbox</Text>
              <Text size="sm" c="dimmed">批量重命名 / 字符画生成 / 视频抽帧 / 视频工具</Text>
              <Text size="xs" c="dimmed" mt="xs">
                Tauri v2 + React + Mantine
              </Text>
            </Box>
          </Stack>
        </Stack>
      </Box>
    </Stack>
  );
}
