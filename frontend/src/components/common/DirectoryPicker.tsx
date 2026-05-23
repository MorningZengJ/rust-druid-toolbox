import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FolderOpen } from "lucide-react";

interface DirectoryPickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function DirectoryPicker({
  value,
  onChange,
  placeholder = "选择或输入路径",
}: DirectoryPickerProps) {
  const handleBrowse = async () => {
    const { open } = await import("@tauri-apps/plugin-dialog");
    const selected = await open({ directory: true });
    if (selected) {
      onChange(selected as string);
    }
  };

  return (
    <div className="flex gap-1">
      <Input
        className="h-8 text-sm flex-1"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      <Button
        variant="outline"
        size="sm"
        className="h-8 w-8 p-0 shrink-0"
        onClick={handleBrowse}
      >
        <FolderOpen size={14} />
      </Button>
    </div>
  );
}
