import { create } from "zustand";
import { listen } from "@tauri-apps/api/event";
import * as renameApi from "@/lib/renameApi";
import i18n from "@/i18n";
import { openDirectory } from "@/lib/tauri/dialog";
import type {
  FileInfo,
  ReplaceInfo,
  FilterItem,
  QuickFilter,
  ConflictInfo,
  RenameResult,
  RuleTemplate,
  SortColumn,
} from "@/types";

import { applyFilters, toggleQuickFilter as toggleQuickFilterUtil } from "@/features/rename/renameSelectors";
import {
  addRule as addRulePure,
  removeRule as removeRulePure,
  updateRule as updateRulePure,
  applyTemplate as applyTemplatePure,
  clearRules as clearRulesPure,
  undoRules as undoRulesPure,
} from "@/features/rename/renameRules";
import { scheduleConflictDetection, cancelPendingDetection } from "@/features/rename/renameConflicts";

// ── Debounce constants ──

/** Text input debounce: avoid firing per-keystroke */
const INPUT_DEBOUNCE_MS = 300;
/** Structural change: fire immediately */
const STRUCTURAL_DELAY_MS = 0;

// ── Types ──

interface RenameState {
  // Data
  dirPath: string;
  fileList: FileInfo[];
  filterFileList: FileInfo[];
  filterItems: FilterItem[];
  quickFilters: QuickFilter[];
  replaceInfos: ReplaceInfo[];
  sortColumns: SortColumn[];
  conflicts: ConflictInfo[];
  ruleHistory: ReplaceInfo[][];
  status: RenameResult | null;
  displayLimit: number;
  errorMessage: string | null;

  // UI state
  filterCollapsed: boolean;
  rulesCollapsed: boolean[];
  selectedFile: FileInfo | null;
  loading: boolean;
  loadingProgress: { processed: number; total: number; phase: string } | null;

  // Actions
  setDirPath: (path: string) => void;
  loadFiles: (path: string) => Promise<void>;
  setFilterItems: (items: FilterItem[]) => void;
  toggleQuickFilter: (filter: QuickFilter) => void;
  setReplaceInfos: (infos: ReplaceInfo[]) => void;
  setSortColumns: (columns: SortColumn[]) => void;
  addReplaceInfo: () => void;
  removeReplaceInfo: (index: number) => void;
  updateReplaceInfo: (index: number, updates: Partial<ReplaceInfo>) => void;
  applyRuleTemplate: (template: RuleTemplate) => Promise<void>;
  clearAllRules: () => void;
  undoRuleChange: () => void;
  detectConflicts: () => void;
  executeRenames: () => Promise<void>;
  setDisplayLimit: (limit: number) => void;
  loadMore: () => void;
  setSelectedFile: (file: FileInfo | null) => void;
  setFilterCollapsed: (collapsed: boolean) => void;
  toggleRuleCollapse: (index: number) => void;
  clearStatus: () => void;
  clearError: () => void;
  cleanupLoading: () => void;
  chooseDirectory: () => Promise<void>;
  parentDirectory: () => Promise<void>;
}

// ── Helper: trigger conflict detection ──

function triggerConflicts(delayMs: number, get: () => RenameState, set: (update: Partial<RenameState>) => void) {
  const { filterFileList, replaceInfos } = get();
  scheduleConflictDetection(filterFileList, replaceInfos, delayMs, (result) => {
    set({
      conflicts: result.conflicts,
      ...(result.error ? { errorMessage: i18n.t("errors:detectConflictsFailed", { error: result.error }) } : {}),
    });
  });
}

// ── Helper: sync filtered file list after filter/sort change ──

function syncFilteredList(get: () => RenameState, set: (update: Partial<RenameState>) => void) {
  const { fileList, filterItems, quickFilters, sortColumns } = get();
  set({ filterFileList: applyFilters(fileList, filterItems, quickFilters, sortColumns), displayLimit: 500 });
}

// ── Store ──

export const useRenameStore = create<RenameState>((set, get) => ({
  // Initial state
  dirPath: "",
  fileList: [],
  filterFileList: [],
  filterItems: [{ keyword: "", isRegex: false }],
  quickFilters: ["all"],
  replaceInfos: [],
  sortColumns: [],
  conflicts: [],
  ruleHistory: [],
  status: null,
  displayLimit: 500,
  errorMessage: null,

  filterCollapsed: false,
  rulesCollapsed: [],
  selectedFile: null,
  loading: false,
  loadingProgress: null,

  // ── Actions ──

  setDirPath: (path) => set({ dirPath: path }),

  loadFiles: async (path) => {
    get().cleanupLoading();
    cancelPendingDetection();

    set({ loading: true, loadingProgress: null, dirPath: path });

    const unlistenProgress = await listen<{ processed: number; total: number; phase: string; path: string }>(
      "load-files-progress",
      (event) => {
        if (event.payload.path === get().dirPath) {
          set({ loadingProgress: { processed: event.payload.processed, total: event.payload.total, phase: event.payload.phase } });
        }
      },
    );

    try {
      const files = await renameApi.listFilesQuick(path);
      if (get().dirPath !== path) return;

      set({
        fileList: files,
        filterFileList: files,
        displayLimit: 500,
        selectedFile: null,
        status: null,
        loadingProgress: { processed: 0, total: 0, phase: "scanning" },
      });

      const filesWithSize = await renameApi.listFilesWithSize(files, path);
      if (get().dirPath !== path) return;

      set({ fileList: filesWithSize, filterFileList: filesWithSize, loading: false, loadingProgress: null });
      triggerConflicts(STRUCTURAL_DELAY_MS, get, set);
    } catch (e) {
      if (get().dirPath === path) {
        set({ errorMessage: i18n.t("errors:loadFilesFailed", { error: String(e) }), loading: false, loadingProgress: null });
      }
    } finally {
      unlistenProgress();
    }
  },

  setFilterItems: (items) => {
    set({ filterItems: items });
    syncFilteredList(get, set);
    triggerConflicts(INPUT_DEBOUNCE_MS, get, set);
  },

  toggleQuickFilter: (filter) => {
    const next = toggleQuickFilterUtil(get().quickFilters, filter);
    set({ quickFilters: next });
    syncFilteredList(get, set);
    triggerConflicts(STRUCTURAL_DELAY_MS, get, set);
  },

  setReplaceInfos: (infos) => {
    set({ replaceInfos: infos });
    triggerConflicts(STRUCTURAL_DELAY_MS, get, set);
  },

  setSortColumns: (columns) => {
    set({ sortColumns: columns });
    syncFilteredList(get, set);
    triggerConflicts(STRUCTURAL_DELAY_MS, get, set);
  },

  addReplaceInfo: () => {
    const { replaceInfos, ruleHistory } = get();
    const [newRules, newHistory] = addRulePure(replaceInfos, ruleHistory);
    set({ replaceInfos: newRules, ruleHistory: newHistory, rulesCollapsed: [...get().rulesCollapsed, false] });
    triggerConflicts(STRUCTURAL_DELAY_MS, get, set);
  },

  removeReplaceInfo: (index) => {
    const { replaceInfos, ruleHistory, rulesCollapsed } = get();
    const [newRules, newHistory] = removeRulePure(replaceInfos, ruleHistory, index);
    set({
      replaceInfos: newRules,
      ruleHistory: newHistory,
      rulesCollapsed: rulesCollapsed.filter((_, i) => i !== index),
    });
    triggerConflicts(STRUCTURAL_DELAY_MS, get, set);
  },

  updateReplaceInfo: (index, updates) => {
    const { replaceInfos, ruleHistory } = get();
    const isTextEdit = "content" in updates || "target" in updates;
    const [newRules, newHistory] = updateRulePure(replaceInfos, ruleHistory, index, updates);
    set({ replaceInfos: newRules, ruleHistory: newHistory });
    triggerConflicts(isTextEdit ? INPUT_DEBOUNCE_MS : STRUCTURAL_DELAY_MS, get, set);
  },

  applyRuleTemplate: async (template) => {
    try {
      const info = await renameApi.applyRuleTemplate(template);
      const { replaceInfos, ruleHistory } = get();
      const [newRules, newHistory] = applyTemplatePure(replaceInfos, ruleHistory, template);
      set({
        ruleHistory: newHistory,
        replaceInfos: [...newRules, info],
        rulesCollapsed: [...get().rulesCollapsed, false],
      });
      triggerConflicts(STRUCTURAL_DELAY_MS, get, set);
    } catch (e) {
      set({ errorMessage: i18n.t("errors:applyTemplateFailed", { error: String(e) }) });
    }
  },

  clearAllRules: () => {
    const { replaceInfos, ruleHistory } = get();
    const [, newHistory] = clearRulesPure(replaceInfos, ruleHistory);
    set({ replaceInfos: [], ruleHistory: newHistory, rulesCollapsed: [], conflicts: [] });
  },

  undoRuleChange: () => {
    const { ruleHistory } = get();
    if (ruleHistory.length === 0) return;
    const [previousRules, newHistory] = undoRulesPure(ruleHistory, get().replaceInfos);
    set({
      replaceInfos: previousRules,
      ruleHistory: newHistory,
      rulesCollapsed: previousRules.map(() => false),
    });
    triggerConflicts(STRUCTURAL_DELAY_MS, get, set);
  },

  detectConflicts: () => {
    triggerConflicts(STRUCTURAL_DELAY_MS, get, set);
  },

  executeRenames: async () => {
    const { dirPath, filterFileList, replaceInfos } = get();
    try {
      const result = await renameApi.executeRenames(dirPath, filterFileList, replaceInfos);
      set({ status: result });
      get().loadFiles(dirPath);
    } catch (e) {
      set({ errorMessage: i18n.t("errors:executeRenameFailed", { error: String(e) }) });
    }
  },

  setDisplayLimit: (limit) => set({ displayLimit: limit }),

  loadMore: () => {
    const { displayLimit, filterFileList } = get();
    set({ displayLimit: Math.min(displayLimit + 500, filterFileList.length) });
  },

  setSelectedFile: (file) => set({ selectedFile: file }),
  setFilterCollapsed: (collapsed) => set({ filterCollapsed: collapsed }),

  toggleRuleCollapse: (index) => {
    const rulesCollapsed = [...get().rulesCollapsed];
    rulesCollapsed[index] = !rulesCollapsed[index];
    set({ rulesCollapsed });
  },

  clearStatus: () => set({ status: null }),

  chooseDirectory: async () => {
    try {
      const selected = await openDirectory();
      if (selected) get().loadFiles(selected);
    } catch (e) {
      set({ errorMessage: i18n.t("errors:selectDirectoryFailed", { error: String(e) }) });
    }
  },

  parentDirectory: async () => {
    const { dirPath } = get();
    if (!dirPath) return;
    try {
      const parent = await renameApi.parentPath(dirPath);
      if (parent && parent !== dirPath) get().loadFiles(parent);
    } catch (e) {
      set({ errorMessage: i18n.t("errors:getParentFailed", { error: String(e) }) });
    }
  },

  clearError: () => set({ errorMessage: null }),

  cleanupLoading: () => {
    set({ loading: false, loadingProgress: null });
  },
}));
