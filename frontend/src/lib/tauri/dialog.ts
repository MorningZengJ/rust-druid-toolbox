import { open as tauriOpen, save as tauriSave } from "@tauri-apps/plugin-dialog";

export type DialogFilters = Array<{ name: string; extensions: string[] }>;

/** 打开文件选择器 */
export async function openFile(filters?: DialogFilters): Promise<string | null> {
  const selected = await tauriOpen({ filters });
  return selected ? String(selected) : null;
}

/** 打开目录选择器 */
export async function openDirectory(): Promise<string | null> {
  const selected = await tauriOpen({ directory: true });
  return selected ? String(selected) : null;
}

/** 保存文件对话框 */
export async function saveFile(filters?: DialogFilters, defaultPath?: string): Promise<string | null> {
  const selected = await tauriSave({ filters, defaultPath });
  return selected ? String(selected) : null;
}
