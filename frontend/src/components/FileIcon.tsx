import {
  File,
  FileText,
  FileCode2,
  FileJson,
  FileVideo,
  FileAudio,
  FileSpreadsheet,
  FileArchive,
  FolderOpen,
  Terminal,
  Settings,
  Image,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface FileIconProps {
  isDir: boolean;
  extension: string;
  className?: string;
}

const iconMap: Record<string, { icon: LucideIcon; color: string }> = {
  // Folders
  dir: { icon: FolderOpen, color: "text-blue-500" },

  // Images
  png: { icon: Image, color: "text-green-500" },
  jpg: { icon: Image, color: "text-green-500" },
  jpeg: { icon: Image, color: "text-green-500" },
  gif: { icon: Image, color: "text-green-500" },
  bmp: { icon: Image, color: "text-green-500" },
  svg: { icon: Image, color: "text-green-500" },
  webp: { icon: Image, color: "text-green-500" },
  ico: { icon: Image, color: "text-green-500" },

  // Videos
  mp4: { icon: FileVideo, color: "text-purple-500" },
  avi: { icon: FileVideo, color: "text-purple-500" },
  mkv: { icon: FileVideo, color: "text-purple-500" },
  mov: { icon: FileVideo, color: "text-purple-500" },
  wmv: { icon: FileVideo, color: "text-purple-500" },
  flv: { icon: FileVideo, color: "text-purple-500" },
  webm: { icon: FileVideo, color: "text-purple-500" },

  // Audio
  mp3: { icon: FileAudio, color: "text-orange-500" },
  wav: { icon: FileAudio, color: "text-orange-500" },
  flac: { icon: FileAudio, color: "text-orange-500" },
  aac: { icon: FileAudio, color: "text-orange-500" },
  ogg: { icon: FileAudio, color: "text-orange-500" },
  wma: { icon: FileAudio, color: "text-orange-500" },

  // Documents
  txt: { icon: FileText, color: "text-slate-500" },
  md: { icon: FileText, color: "text-slate-500" },
  log: { icon: FileText, color: "text-slate-500" },
  pdf: { icon: FileText, color: "text-red-500" },
  doc: { icon: FileText, color: "text-blue-600" },
  docx: { icon: FileText, color: "text-blue-600" },
  rtf: { icon: FileText, color: "text-slate-500" },

  // Code
  js: { icon: FileCode2, color: "text-yellow-500" },
  ts: { icon: FileCode2, color: "text-blue-500" },
  jsx: { icon: FileCode2, color: "text-cyan-500" },
  tsx: { icon: FileCode2, color: "text-cyan-500" },
  py: { icon: FileCode2, color: "text-green-600" },
  rs: { icon: FileCode2, color: "text-orange-600" },
  java: { icon: FileCode2, color: "text-red-600" },
  c: { icon: FileCode2, color: "text-blue-600" },
  cpp: { icon: FileCode2, color: "text-blue-600" },
  h: { icon: FileCode2, color: "text-blue-400" },
  go: { icon: FileCode2, color: "text-cyan-600" },
  html: { icon: FileCode2, color: "text-orange-500" },
  css: { icon: FileCode2, color: "text-blue-400" },
  scss: { icon: FileCode2, color: "text-pink-500" },
  less: { icon: FileCode2, color: "text-blue-300" },
  vue: { icon: FileCode2, color: "text-green-500" },
  svelte: { icon: FileCode2, color: "text-orange-500" },
  rb: { icon: FileCode2, color: "text-red-500" },
  php: { icon: FileCode2, color: "text-indigo-500" },
  swift: { icon: FileCode2, color: "text-orange-500" },
  kt: { icon: FileCode2, color: "text-purple-500" },
  lua: { icon: FileCode2, color: "text-blue-500" },
  sh: { icon: FileCode2, color: "text-green-500" },
  bash: { icon: FileCode2, color: "text-green-500" },
  ps1: { icon: FileCode2, color: "text-blue-500" },

  // Data
  json: { icon: FileJson, color: "text-yellow-600" },
  xml: { icon: FileJson, color: "text-orange-400" },
  yaml: { icon: FileJson, color: "text-red-400" },
  yml: { icon: FileJson, color: "text-red-400" },
  csv: { icon: FileSpreadsheet, color: "text-green-600" },
  sql: { icon: FileJson, color: "text-blue-500" },

  // Spreadsheet
  xlsx: { icon: FileSpreadsheet, color: "text-green-600" },
  xls: { icon: FileSpreadsheet, color: "text-green-600" },

  // Archive
  zip: { icon: FileArchive, color: "text-yellow-500" },
  rar: { icon: FileArchive, color: "text-yellow-500" },
  "7z": { icon: FileArchive, color: "text-yellow-500" },
  tar: { icon: FileArchive, color: "text-yellow-500" },
  gz: { icon: FileArchive, color: "text-yellow-500" },
  bz2: { icon: FileArchive, color: "text-yellow-500" },
  xz: { icon: FileArchive, color: "text-yellow-500" },

  // Executable
  exe: { icon: Terminal, color: "text-slate-600" },
  msi: { icon: Terminal, color: "text-slate-600" },
  bat: { icon: Terminal, color: "text-slate-600" },
  cmd: { icon: Terminal, color: "text-slate-600" },
  com: { icon: Terminal, color: "text-slate-600" },

  // Config
  toml: { icon: Settings, color: "text-gray-500" },
  ini: { icon: Settings, color: "text-gray-500" },
  cfg: { icon: Settings, color: "text-gray-500" },
  conf: { icon: Settings, color: "text-gray-500" },
  env: { icon: Settings, color: "text-gray-500" },
  lock: { icon: Settings, color: "text-gray-400" },
};

export default function FileIcon({ isDir, extension, className }: FileIconProps) {
  const key = isDir ? "dir" : extension.toLowerCase();
  const entry = iconMap[key] ?? { icon: File, color: "text-muted-foreground" };
  const Icon = entry.icon;

  return <Icon className={`shrink-0 ${entry.color} ${className ?? ""}`} size={16} />;
}
