import { create } from "zustand";
import { getVersion } from "@tauri-apps/api/app";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { settingsStore } from "../lib/store";
import { validateAutoCheck } from "../lib/configValidator";
import { log } from "../lib/logger";
import { getEffectiveProxyUrl } from "../lib/tauri/proxyApi";
import type { UpdateStatus, UpdateProgress, UpdateErrorCode } from "@/types";

// ── Constants ──────────────────────────────────────────────

const CHECK_TIMEOUT_MS = 30_000;
const DOWNLOAD_TIMEOUT_MS = 300_000;
const MAX_RETRIES = 2;
const RETRY_BASE_DELAY_MS = 1_000;

// ── State interface ────────────────────────────────────────

interface UpdateState {
  currentVersion: string;
  latestVersion: string | null;
  releaseNotes: string | null;
  status: UpdateStatus;
  progress: UpdateProgress;
  error: string | null;
  errorCode: UpdateErrorCode;
  autoCheck: boolean;
  loaded: boolean;
  updateRef: Update | null;
  lastCheckTime: number | null;

  // Actions
  init: () => Promise<void>;
  checkForUpdate: () => Promise<void>;
  downloadAndInstall: () => Promise<void>;
  setAutoCheck: (enabled: boolean) => void;
}

// ── Helpers ────────────────────────────────────────────────

function classifyError(err: unknown): { code: UpdateErrorCode; message: string } {
  const raw = err instanceof Error ? err.message : String(err);
  const msg = raw.toLowerCase();

  if (/failed to fetch|networkerror|econnrefused|enotfound|dns|fetch failed|503|502|504/i.test(msg)) {
    return { code: "network", message: raw };
  }
  if (/timeout|timed.?out/i.test(msg)) {
    return { code: "timeout", message: raw };
  }
  if (/signature|verify|public.?key|invalid signature/i.test(msg)) {
    return { code: "signature", message: raw };
  }
  if (/json|parse|syntax|unexpected.*token/i.test(msg)) {
    return { code: "parse", message: raw };
  }
  return { code: null, message: raw };
}

async function checkWithRetry(
  timeout: number,
  maxRetries: number,
  baseDelay: number,
  proxyUrl: string | null,
): Promise<Update | null> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      log.info(`Check attempt ${attempt + 1}/${maxRetries + 1} (timeout: ${timeout}ms)${proxyUrl ? `, proxy: ${proxyUrl}` : ""}`);
      return await check({ timeout, ...(proxyUrl ? { proxy: proxyUrl } : {}) });
    } catch (err) {
      lastError = err;
      log.warn(`Attempt ${attempt + 1} failed`, err);

      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt);
        log.info(`Retrying in ${delay}ms...`);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }

  throw lastError;
}

// ── Store ──────────────────────────────────────────────────

export const useUpdateStore = create<UpdateState>((set, get) => ({
  currentVersion: "",
  latestVersion: null,
  releaseNotes: null,
  status: "idle",
  progress: { downloadedBytes: 0, totalBytes: null, percentage: 0 },
  error: null,
  errorCode: null,
  autoCheck: false,
  loaded: false,
  updateRef: null,
  lastCheckTime: null,

  // ── init ───────────────────────────────────────────────

  init: async () => {
    log.info("Initializing update store...");
    const [version, rawAutoCheck] = await Promise.all([
      getVersion(),
      settingsStore.get("autoCheckUpdate"),
    ]);
    log.info(`Current version: ${version}, autoCheck: ${rawAutoCheck}`);
    set({
      currentVersion: version,
      autoCheck: validateAutoCheck(rawAutoCheck),
      loaded: true,
    });
  },

  // ── checkForUpdate ─────────────────────────────────────

  checkForUpdate: async () => {
    const state = get();
    if (state.status === "checking" || state.status === "downloading") {
      log.debug("Already checking or downloading, skipping");
      return;
    }

    // Offline detection — fast fail before any network attempt
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      log.warn("Device appears to be offline, aborting check");
      set({
        status: "error",
        errorCode: "offline",
        error: "Device is offline. Please connect to the internet and try again.",
      });
      return;
    }

    // Close previous Update resource (prevents Rust-side resource leaks)
    if (state.updateRef) {
      try {
        await state.updateRef.close();
      } catch {
        /* Resource may already be closed — safe to ignore */
      }
    }

    set({
      status: "checking",
      error: null,
      errorCode: null,
      latestVersion: null,
      releaseNotes: null,
      updateRef: null,
    });

    log.info("Starting update check...");

    // Fetch effective proxy URL from current settings
    let proxyUrl: string | null = null;
    try {
      proxyUrl = await getEffectiveProxyUrl();
      if (proxyUrl) {
        log.info(`Using proxy for update check: ${proxyUrl}`);
      }
    } catch {
      log.warn("Failed to get effective proxy URL, proceeding without proxy");
    }

    try {
      const update = await checkWithRetry(CHECK_TIMEOUT_MS, MAX_RETRIES, RETRY_BASE_DELAY_MS, proxyUrl);

      if (update) {
        log.info(`Update available: v${update.version}`);
        set({
          status: "available",
          latestVersion: update.version,
          releaseNotes: update.body ?? null,
          updateRef: update,
          lastCheckTime: Date.now(),
        });
      } else {
        log.info("No update available (current version is latest)");
        set({
          status: "no-update",
          lastCheckTime: Date.now(),
        });
      }
    } catch (err) {
      const { code, message } = classifyError(err);
      log.error(`Check failed [${code ?? "unclassified"}]: ${message}`);
      set({
        status: "error",
        errorCode: code,
        error: message,
      });
    }
  },

  // ── downloadAndInstall ─────────────────────────────────

  downloadAndInstall: async () => {
    const state = get();
    if (state.status === "downloading" || state.status === "installing") {
      log.debug("Already downloading or installing, skipping");
      return;
    }

    set({
      status: "downloading",
      error: null,
      errorCode: null,
      progress: { downloadedBytes: 0, totalBytes: null, percentage: 0 },
    });

    try {
      // Reuse stored updateRef; fall back to a fresh check only if missing
      let update = state.updateRef;
      if (!update) {
        log.warn("No stored Update ref, calling check() as fallback");
        // Fetch effective proxy URL for the fallback check
        let proxyUrl: string | null = null;
        try {
          proxyUrl = await getEffectiveProxyUrl();
        } catch {
          log.warn("Failed to get effective proxy URL for fallback check");
        }
        update = await checkWithRetry(CHECK_TIMEOUT_MS, MAX_RETRIES, RETRY_BASE_DELAY_MS, proxyUrl);
        if (!update) {
          log.info("Fallback check returned no update");
          set({ status: "no-update" });
          return;
        }
      }

      log.info(`Starting download of v${update.version}...`);

      let downloadedBytes = 0;
      let contentLength: number | null = null;

      await update.downloadAndInstall(
        (event) => {
          if (event.event === "Started") {
            contentLength = event.data.contentLength ?? null;
            log.info(`Download started, total size: ${contentLength ?? "unknown"}`);
            set({
              progress: { downloadedBytes: 0, totalBytes: contentLength, percentage: 0 },
            });
          } else if (event.event === "Progress") {
            downloadedBytes += event.data.chunkLength;
            const percentage = contentLength
              ? Math.round((downloadedBytes / contentLength) * 100)
              : 0;
            set({
              progress: { downloadedBytes, totalBytes: contentLength, percentage },
            });
          } else if (event.event === "Finished") {
            log.info("Download finished, proceeding to install");
          }
        },
        { timeout: DOWNLOAD_TIMEOUT_MS },
      );

      log.info("Download and install complete, preparing to relaunch");
      set({ status: "downloaded" });

      await relaunch();
    } catch (err) {
      const { code, message } = classifyError(err);
      log.error(`Download/install failed [${code ?? "unclassified"}]: ${message}`);
      set({
        status: "error",
        errorCode: code,
        error: message,
      });
    }
  },

  // ── setAutoCheck ───────────────────────────────────────

  setAutoCheck: async (enabled) => {
    set({ autoCheck: enabled });
    await settingsStore.set("autoCheckUpdate", enabled);
    await settingsStore.save();
  },
}));

// ── Online/offline listener ──────────────────────────────

if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    const state = useUpdateStore.getState();
    if (state.errorCode === "offline") {
      log.info("Device came back online, clearing offline error state");
      useUpdateStore.setState({
        status: "idle",
        error: null,
        errorCode: null,
      });
    }
  });
}
