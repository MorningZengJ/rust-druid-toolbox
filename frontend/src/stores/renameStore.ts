import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import type {
  FileInfo,
  ReplaceInfo,
  FilterItem,
  QuickFilter,
  ConflictInfo,
  RenameResult,
  RuleTemplate,
} from "@/types";

interface RenameState {
  // Data
  dirPath: string;
  fileList: FileInfo[];
  filterFileList: FileInfo[];
  filterItems: FilterItem[];
  quickFilters: QuickFilter[];
  replaceInfos: ReplaceInfo[];
  conflicts: ConflictInfo[];
  ruleHistory: ReplaceInfo[][];
  status: RenameResult | null;
  displayLimit: number;
  errorMessage: string | null;

  // UI state
  filterCollapsed: boolean;
  rulesCollapsed: boolean[];
  showConfirm: boolean;
  selectedFile: FileInfo | null;

  // Actions
  setDirPath: (path: string) => void;
  loadFiles: (path: string) => Promise<void>;
  setFilterItems: (items: FilterItem[]) => void;
  toggleQuickFilter: (filter: QuickFilter) => void;
  setReplaceInfos: (infos: ReplaceInfo[]) => void;
  addReplaceInfo: () => void;
  removeReplaceInfo: (index: number) => void;
  updateReplaceInfo: (index: number, updates: Partial<ReplaceInfo>) => void;
  applyRuleTemplate: (template: RuleTemplate) => Promise<void>;
  clearAllRules: () => void;
  undoRuleChange: () => void;
  detectConflicts: () => Promise<void>;
  executeRenames: () => Promise<void>;
  setDisplayLimit: (limit: number) => void;
  loadMore: () => void;
  setSelectedFile: (file: FileInfo | null) => void;
  setShowConfirm: (show: boolean) => void;
  setFilterCollapsed: (collapsed: boolean) => void;
  toggleRuleCollapse: (index: number) => void;
  clearStatus: () => void;
  clearError: () => void;
  chooseDirectory: () => Promise<void>;
  parentDirectory: () => Promise<void>;
}

export const useRenameStore = create<RenameState>((set, get) => ({
  // Initial state
  dirPath: "",
  fileList: [],
  filterFileList: [],
  filterItems: [{ keyword: "", isRegex: false }],
  quickFilters: ["all"],
  replaceInfos: [],
  conflicts: [],
  ruleHistory: [],
  status: null,
  displayLimit: 500,
  errorMessage: null,

  filterCollapsed: false,
  rulesCollapsed: [],
  showConfirm: false,
  selectedFile: null,

  // Actions
  setDirPath: (path) => set({ dirPath: path }),

  loadFiles: async (path) => {
    try {
      const files = await invoke<FileInfo[]>("list_files", { path });
      set({
        dirPath: path,
        fileList: files,
        filterFileList: files,
        displayLimit: 500,
        selectedFile: null,
        status: null,
      });
      // Auto-detect conflicts after loading
      get().detectConflicts();
    } catch (e) {
      set({ errorMessage: `加载文件失败: ${e}` });
    }
  },

  setFilterItems: (items) => {
    set({ filterItems: items });
    // Re-filter files
    const { fileList, quickFilters } = get();
    const filtered = applyFilters(fileList, items, quickFilters);
    set({ filterFileList: filtered, displayLimit: 500 });
    get().detectConflicts();
  },

  toggleQuickFilter: (filter) => {
    const { quickFilters } = get();
    let newFilters: QuickFilter[];

    if (filter === "all") {
      newFilters = ["all"];
    } else {
      const withoutAll = quickFilters.filter((f) => f !== "all");
      const exists = withoutAll.some((f) => JSON.stringify(f) === JSON.stringify(filter));
      if (exists) {
        newFilters = withoutAll.filter((f) => JSON.stringify(f) !== JSON.stringify(filter));
        if (newFilters.length === 0) newFilters = ["all"];
      } else {
        newFilters = [...withoutAll, filter];
      }
    }

    set({ quickFilters: newFilters });
    const { fileList, filterItems } = get();
    const filtered = applyFilters(fileList, filterItems, newFilters);
    set({ filterFileList: filtered, displayLimit: 500 });
    get().detectConflicts();
  },

  setReplaceInfos: (infos) => {
    set({ replaceInfos: infos });
    get().detectConflicts();
  },

  addReplaceInfo: () => {
    const { replaceInfos, ruleHistory } = get();
    const newInfo: ReplaceInfo = {
      id: crypto.randomUUID(),
      content: "",
      target: "",
      enable: true,
      isRegex: false,
      isError: false,
    };
    set({
      ruleHistory: [...ruleHistory, [...replaceInfos]],
      replaceInfos: [...replaceInfos, newInfo],
      rulesCollapsed: [...get().rulesCollapsed, false],
    });
  },

  removeReplaceInfo: (index) => {
    const { replaceInfos, ruleHistory, rulesCollapsed } = get();
    set({
      ruleHistory: [...ruleHistory, [...replaceInfos]],
      replaceInfos: replaceInfos.filter((_, i) => i !== index),
      rulesCollapsed: rulesCollapsed.filter((_, i) => i !== index),
    });
    get().detectConflicts();
  },

  updateReplaceInfo: (index, updates) => {
    const { replaceInfos, ruleHistory } = get();
    const newInfos = replaceInfos.map((info, i) =>
      i === index ? { ...info, ...updates } : info
    );
    set({
      ruleHistory: [...ruleHistory, [...replaceInfos]],
      replaceInfos: newInfos,
    });
    get().detectConflicts();
  },

  applyRuleTemplate: async (template) => {
    try {
      const info = await invoke<ReplaceInfo>("apply_rule_template", { template });
      const { replaceInfos, ruleHistory } = get();
      set({
        ruleHistory: [...ruleHistory, [...replaceInfos]],
        replaceInfos: [...replaceInfos, info],
        rulesCollapsed: [...get().rulesCollapsed, false],
      });
      get().detectConflicts();
    } catch (e) {
      set({ errorMessage: `应用模板失败: ${e}` });
    }
  },

  clearAllRules: () => {
    const { replaceInfos, ruleHistory } = get();
    set({
      ruleHistory: [...ruleHistory, [...replaceInfos]],
      replaceInfos: [],
      rulesCollapsed: [],
    });
    get().detectConflicts();
  },

  undoRuleChange: () => {
    const { ruleHistory } = get();
    if (ruleHistory.length === 0) return;
    const previous = ruleHistory[ruleHistory.length - 1];
    set({
      replaceInfos: previous,
      ruleHistory: ruleHistory.slice(0, -1),
      rulesCollapsed: previous.map(() => false),
    });
    get().detectConflicts();
  },

  detectConflicts: async () => {
    const { filterFileList, replaceInfos } = get();
    if (replaceInfos.length === 0) {
      set({ conflicts: [] });
      return;
    }
    try {
      const conflicts = await invoke<[string, number[]][]>("detect_conflicts", {
        files: filterFileList,
        rules: replaceInfos,
      });
      set({
        conflicts: conflicts.map(([targetName, sourceIndices]) => ({
          targetName,
          sourceIndices,
        })),
      });
    } catch (e) {
      set({ errorMessage: `检测冲突失败: ${e}` });
    }
  },

  executeRenames: async () => {
    const { dirPath, filterFileList, replaceInfos } = get();
    try {
      const result = await invoke<RenameResult>("execute_renames", {
        dirPath,
        files: filterFileList,
        rules: replaceInfos,
      });
      set({ status: result, showConfirm: false });
      // Reload files after rename
      get().loadFiles(dirPath);
    } catch (e) {
      set({ errorMessage: `执行重命名失败: ${e}` });
    }
  },

  setDisplayLimit: (limit) => set({ displayLimit: limit }),

  loadMore: () => {
    const { displayLimit, filterFileList } = get();
    set({ displayLimit: Math.min(displayLimit + 500, filterFileList.length) });
  },

  setSelectedFile: (file) => set({ selectedFile: file }),
  setShowConfirm: (show) => set({ showConfirm: show }),
  setFilterCollapsed: (collapsed) => set({ filterCollapsed: collapsed }),

  toggleRuleCollapse: (index) => {
    const { rulesCollapsed } = get();
    const newCollapsed = [...rulesCollapsed];
    newCollapsed[index] = !newCollapsed[index];
    set({ rulesCollapsed: newCollapsed });
  },

  clearStatus: () => set({ status: null }),

  chooseDirectory: async () => {
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const selected = await open({ directory: true });
      if (selected) {
        get().loadFiles(selected as string);
      }
    } catch (e) {
      set({ errorMessage: `选择目录失败: ${e}` });
    }
  },

  parentDirectory: async () => {
    const { dirPath } = get();
    if (!dirPath) return;
    try {
      const parent = await invoke<string>("parent_path", { path: dirPath });
      if (parent && parent !== dirPath) {
        get().loadFiles(parent);
      }
    } catch (e) {
      set({ errorMessage: `获取上级目录失败: ${e}` });
    }
  },

  clearError: () => set({ errorMessage: null }),
}));

// Helper function to apply filters
function applyFilters(
  files: FileInfo[],
  filterItems: FilterItem[],
  quickFilters: QuickFilter[]
): FileInfo[] {
  let result = [...files];

  // Apply quick filters
  if (!quickFilters.includes("all")) {
    result = result.filter((file) => {
      return quickFilters.some((filter) => {
        if (filter === "folder") return file.isDir;
        if (filter === "file") return !file.isDir;
        if (typeof filter === "object" && "extension" in filter) {
          return file.extension === filter.extension;
        }
        return true;
      });
    });
  }

  // Apply keyword filters
  for (const filter of filterItems) {
    if (!filter.keyword) continue;
    result = result.filter((file) => {
      if (filter.isRegex) {
        try {
          return new RegExp(filter.keyword).test(file.name);
        } catch {
          return true;
        }
      }
      return file.name.toLowerCase().includes(filter.keyword.toLowerCase());
    });
  }

  // Sort: directories first, then by name
  result.sort((a, b) => {
    if (b.isDir !== a.isDir) return b.isDir ? 1 : -1;
    return a.name.localeCompare(b.name);
  });

  return result;
}
