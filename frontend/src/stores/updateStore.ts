import { create } from "zustand";
import { getVersion } from "@tauri-apps/api/app";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { settingsStore } from "../lib/store";
import { validateAutoCheck } from "../lib/configValidator";
import type { UpdateStatus, UpdateProgress } from "@/types";

interface UpdateState {
  currentVersion: string;
  latestVersion: string | null;
  releaseNotes: string | null;
  status: UpdateStatus;
  progress: UpdateProgress;
  error: string | null;
  autoCheck: boolean;
  loaded: boolean;

  // Actions
  init: () => Promise<void>;
  checkForUpdate: () => Promise<void>;
  downloadAndInstall: () => Promise<void>;
  setAutoCheck: (enabled: boolean) => void;
}

export const useUpdateStore = create<UpdateState>((set, get) => ({
  currentVersion: "",
  latestVersion: null,
  releaseNotes: null,
  status: "idle",
  progress: { downloadedBytes: 0, totalBytes: null, percentage: 0 },
  error: null,
  autoCheck: false,
  loaded: false,

  init: async () => {
    const [version, rawAutoCheck] = await Promise.all([
      getVersion(),
      settingsStore.get("autoCheckUpdate"),
    ]);
    set({
      currentVersion: version,
      autoCheck: validateAutoCheck(rawAutoCheck),
      loaded: true,
    });
  },

  checkForUpdate: async () => {
    const state = get();
    if (state.status === "checking" || state.status === "downloading") return;

    set({ status: "checking", error: null, latestVersion: null, releaseNotes: null });

    try {
      const update: Update | null = await check();

      if (update) {
        set({
          status: "available",
          latestVersion: update.version,
          releaseNotes: update.body ?? null,
          // Store the update reference isn't needed; we'll call check() again in downloadAndInstall
        });
      } else {
        set({ status: "no-update" });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      set({ status: "error", error: message });
    }
  },

  downloadAndInstall: async () => {
    const state = get();
    if (state.status === "downloading" || state.status === "installing") return;

    set({
      status: "downloading",
      error: null,
      progress: { downloadedBytes: 0, totalBytes: null, percentage: 0 },
    });

    try {
      const update: Update | null = await check();
      if (!update) {
        set({ status: "no-update" });
        return;
      }

      let downloadedBytes = 0;
      let contentLength: number | null = null;

      await update.downloadAndInstall((event) => {
        if (event.event === "Started") {
          contentLength = event.data.contentLength ?? null;
          set({
            progress: {
              downloadedBytes: 0,
              totalBytes: contentLength,
              percentage: 0,
            },
          });
        } else if (event.event === "Progress") {
          downloadedBytes += event.data.chunkLength;
          const percentage = contentLength
            ? Math.round((downloadedBytes / contentLength) * 100)
            : 0;
          set({
            progress: {
              downloadedBytes,
              totalBytes: contentLength,
              percentage,
            },
          });
        }
      });

      set({ status: "downloaded" });

      // Auto-relaunch after install
      await relaunch();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      set({ status: "error", error: message });
    }
  },

  setAutoCheck: (enabled) => {
    set({ autoCheck: enabled });
    settingsStore.set("autoCheckUpdate", enabled);
  },
}));
