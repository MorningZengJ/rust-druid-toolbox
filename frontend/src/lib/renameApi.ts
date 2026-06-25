import { invoke } from "./tauri/client";
import type {
  FileInfo,
  ReplaceInfo,
  RenameResult,
  RuleTemplate,
} from "@/types";

// ── File listing ──

export async function listFiles(path: string): Promise<FileInfo[]> {
  return invoke<FileInfo[]>("list_files", { path });
}

export async function listFilesQuick(path: string): Promise<FileInfo[]> {
  return invoke<FileInfo[]>("list_files_quick", { path });
}

export async function listFilesWithSize(
  files: FileInfo[],
  dirPath: string,
): Promise<FileInfo[]> {
  return invoke<FileInfo[]>("list_files_with_size", { files, dirPath });
}

// ── Rename preview & execution ──

export async function previewRenames(
  files: FileInfo[],
  rules: ReplaceInfo[],
): Promise<[string, string][]> {
  return invoke<[string, string][]>("preview_renames", { files, rules });
}

export async function detectConflicts(
  files: FileInfo[],
  rules: ReplaceInfo[],
): Promise<[string, number[]][]> {
  return invoke<[string, number[]][]>("detect_conflicts", { files, rules });
}

export async function executeRenames(
  dirPath: string,
  files: FileInfo[],
  rules: ReplaceInfo[],
): Promise<RenameResult> {
  return invoke<RenameResult>("execute_renames", { dirPath, files, rules });
}

// ── Utilities ──

export async function validateRegex(pattern: string): Promise<boolean> {
  return invoke<boolean>("validate_regex", { pattern });
}

export async function applyRuleTemplate(template: RuleTemplate): Promise<ReplaceInfo> {
  return invoke<ReplaceInfo>("apply_rule_template", { template });
}

export async function parentPath(path: string): Promise<string> {
  return invoke<string>("parent_path", { path });
}
