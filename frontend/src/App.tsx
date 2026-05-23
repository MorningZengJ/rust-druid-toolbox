import { useState } from "react";
import { Flex, Box, Button, Text, ActionIcon, useComputedColorScheme, useMantineTheme } from "@mantine/core";
import { ModalsProvider } from "@mantine/modals";
import {
  PenLine,
  ImageIcon,
  Settings,
  Sun,
  Moon,
  Radio,
  Wrench,
} from "lucide-react";
import { useWindowState } from "@/hooks/useWindowState";
import { useTheme } from "@/hooks/useTheme";
import RenamePage from "@/pages/rename/RenamePage";
import AsciiArtPage from "@/pages/ascii-art/AsciiArtPage";
import LiveRecordPage from "@/pages/live-record/LiveRecordPage";
import VideoToolPage from "@/pages/video-tool/VideoToolPage";
import SettingsPage from "@/pages/settings/SettingsPage";

type Page = "rename" | "ascii-art" | "live-record" | "video-tool" | "settings";

const navItems: { id: Page; label: string; icon: React.ReactNode }[] = [
  { id: "rename", label: "重命名", icon: <PenLine size={20} /> },
  { id: "ascii-art", label: "字符画", icon: <ImageIcon size={20} /> },
  { id: "live-record", label: "录制", icon: <Radio size={20} /> },
  { id: "video-tool", label: "视频工具", icon: <Wrench size={20} /> },
];

function App() {
  const [activePage, setActivePage] = useState<Page>("rename");
  const colorScheme = useComputedColorScheme();
  const { colorMode, setColorMode } = useTheme();
  const theme = useMantineTheme();
  useWindowState();

  const isDark = colorScheme === "dark";

  const handleToggleColorScheme = () => {
    setColorMode(colorMode === "light" ? "dark" : "light");
  };

  return (
    <ModalsProvider>
    <Flex h="100vh" w="100vw" style={{ overflow: "hidden" }}>
      {/* Navigation sidebar */}
      <Flex
        direction="column"
        align="center"
        w={90}
        py="md"
        style={{
          borderRight: `1px solid ${isDark ? theme.colors.dark[4] : theme.colors.gray[3]}`,
          backgroundColor: isDark ? theme.colors.dark[6] : theme.colors.gray[0],
        }}
      >
        <Text fw={700} size="lg" mb="xl">
          Toolbox
        </Text>

        <Flex direction="column" gap={4} style={{ flex: 1 }}>
          {navItems.map((item) => (
            <Button
              key={item.id}
              variant={activePage === item.id ? "light" : "subtle"}
              w={70}
              h="auto"
              py={12}
              px={0}
              style={{ flexDirection: "column", gap: 4 }}
              onClick={() => setActivePage(item.id)}
            >
              {item.icon}
              <Text size="xs">{item.label}</Text>
            </Button>
          ))}
        </Flex>

        <Flex direction="column" gap={4}>
          <ActionIcon
            variant="subtle"
            size="lg"
            onClick={handleToggleColorScheme}
          >
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </ActionIcon>
          <Button
            variant={activePage === "settings" ? "light" : "subtle"}
            w={70}
            h="auto"
            py={12}
            px={0}
            style={{ flexDirection: "column", gap: 4 }}
            onClick={() => setActivePage("settings")}
          >
            <Settings size={20} />
            <Text size="xs">设置</Text>
          </Button>
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
        <Box h="100%" p="md" style={{ display: activePage === "live-record" ? "block" : "none" }}>
          <LiveRecordPage />
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
