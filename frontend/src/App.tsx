import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  PenLine,
  ImageIcon,
  Film,
  Settings,
  Sun,
  Moon,
} from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { useWindowState } from "@/hooks/useWindowState";
import RenamePage from "@/pages/rename/RenamePage";
import AsciiArtPage from "@/pages/ascii-art/AsciiArtPage";
import VideoFramePage from "@/pages/video-frame/VideoFramePage";
import SettingsPage from "@/pages/settings/SettingsPage";

type Page = "rename" | "ascii-art" | "video-frame" | "settings";

const navItems: { id: Page; label: string; icon: React.ReactNode }[] = [
  { id: "rename", label: "重命名", icon: <PenLine size={20} /> },
  { id: "ascii-art", label: "字符画", icon: <ImageIcon size={20} /> },
  { id: "video-frame", label: "抽帧", icon: <Film size={20} /> },
  { id: "settings", label: "设置", icon: <Settings size={20} /> },
];

function App() {
  const [activePage, setActivePage] = useState<Page>("rename");
  const { isDark, setTheme } = useTheme();
  useWindowState();

  const toggleTheme = () => {
    setTheme(isDark ? "light" : "dark");
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      {/* Navigation sidebar */}
      <nav className="flex w-[90px] flex-col items-center border-r border-border bg-sidebar py-4">
        <div className="mb-6 text-lg font-bold text-sidebar-foreground">
          Toolbox
        </div>

        <div className="flex flex-1 flex-col gap-1">
          {navItems.slice(0, 3).map((item) => (
            <Button
              key={item.id}
              variant={activePage === item.id ? "secondary" : "ghost"}
              className="flex h-auto w-[70px] flex-col items-center gap-1 py-3"
              onClick={() => setActivePage(item.id)}
            >
              {item.icon}
              <span className="text-xs">{item.label}</span>
            </Button>
          ))}
        </div>

        <div className="flex flex-col gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={toggleTheme}
          >
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </Button>
          <Button
            variant={activePage === "settings" ? "secondary" : "ghost"}
            className="flex h-auto w-[70px] flex-col items-center gap-1 py-3"
            onClick={() => setActivePage("settings")}
          >
            <Settings size={20} />
            <span className="text-xs">设置</span>
          </Button>
        </div>
      </nav>

      {/* Main content */}
      <main className="flex-1 overflow-hidden">
        <div
          className="h-full p-4"
          style={{ display: activePage === "rename" ? "block" : "none" }}
        >
          <RenamePage />
        </div>
        <div
          className="h-full p-4"
          style={{ display: activePage === "ascii-art" ? "block" : "none" }}
        >
          <AsciiArtPage />
        </div>
        <div
          className="h-full p-4"
          style={{ display: activePage === "video-frame" ? "block" : "none" }}
        >
          <VideoFramePage />
        </div>
        <div
          className="h-full p-4"
          style={{ display: activePage === "settings" ? "block" : "none" }}
        >
          <SettingsPage />
        </div>
      </main>
    </div>
  );
}

export default App;
