"use client";

import { create } from "zustand";
import type { CleanupProgress, CleanupReport, CleanupTarget, ScanItem, ScanResult } from "@devsweep/core";
import { targetsForPlatform } from "@devsweep/core";
import { invokeCommand } from "@/lib/tauri";

export type AppView = "onboarding" | "dashboard" | "scan" | "review" | "progress" | "complete" | "history" | "settings";
export type AppMode = "safe" | "advanced";
export type ScanMode = "safe" | "full" | "custom";
export type AppTheme = "dark" | "light";

export interface CleanupSessionSummary {
  id: string;
  startedAt: string;
  completedAt: string;
  mode: string;
  recoveredBytes: number;
  cleanedCount: number;
  skippedCount: number;
  failedCount: number;
  durationMs: number;
}

interface AppSettings {
  onboardingCompleted: boolean;
  defaultDevelopmentFolder: string;
  mode: AppMode;
  moveToTrash: boolean;
  confirmAdvancedCleanup: boolean;
  showHiddenFolders: boolean;
  ignoredPaths: string[];
  theme: AppTheme;
}

export interface SystemInfo {
  os: string;
  arch: string;
  username: string;
  homeDir: string;
  defaultDevFolders: string[];
  totalDiskSpace: number;
  availableDiskSpace: number;
}

export interface ScanProgressEvent {
  target: string;
  path: string;
  itemsFound: number;
  estimatedBytes: number;
}

interface AppState extends AppSettings {
  activeView: AppView;
  scanMode: ScanMode;
  scanResults: ScanResult[];
  selectedTargetIds: string[];
  cleanupProgress: CleanupProgress | null;
  scanProgress: ScanProgressEvent | null;
  cleanupReport: CleanupReport | null;
  cleanupHistory: CleanupSessionSummary[];
  liveLog: string[];
  scanLog: string[];
  systemInfo: SystemInfo | null;
  typedConfirmation: string;
  isNative: boolean;
  canUseBrowserFolderPicker: boolean;
  isInitialized: boolean;
  isScanning: boolean;
  isCleaning: boolean;
  error: string | null;
  setActiveView: (view: AppView) => void;
  initialize: () => Promise<void>;
  finishOnboarding: (folder: string, mode: AppMode) => Promise<void>;
  runScan: (mode?: ScanMode) => Promise<void>;
  toggleTarget: (targetId: string) => void;
  selectAllSelectable: () => void;
  selectAllSafe: () => void;
  clearSelection: () => void;
  setTypedConfirmation: (value: string) => void;
  startCleanup: () => Promise<void>;
  loadHistory: () => Promise<void>;
  clearHistory: () => Promise<void>;
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => Promise<void>;
  addIgnoredPath: (path: string) => Promise<void>;
  removeIgnoredPath: (path: string) => Promise<void>;
  chooseFolder: () => Promise<string | null>;
}

const defaultSettings: AppSettings = {
  onboardingCompleted: false,
  defaultDevelopmentFolder: "~/Development",
  mode: "safe",
  moveToTrash: true,
  confirmAdvancedCleanup: true,
  showHiddenFolders: false,
  ignoredPaths: [],
  theme: "light"
};

interface BrowserFileHandle {
  kind: "file";
  name: string;
  getFile: () => Promise<File>;
}

interface BrowserDirectoryHandle {
  kind: "directory";
  name: string;
  entries: () => AsyncIterableIterator<[string, BrowserFileHandle | BrowserDirectoryHandle]>;
}

interface BrowserFileSelection {
  kind: "file-selection";
  name: string;
  files: File[];
}

type BrowserFolderSelection = BrowserDirectoryHandle | BrowserFileSelection;

let browserFolderSelection: BrowserFolderSelection | null = null;

function isTauriRuntime() {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

function targetsForScanMode(mode: ScanMode) {
  const targets = targetsForPlatform("macos");
  if (mode === "safe") {
    return targets.filter((target) => target.risk === "safe" || target.risk === "medium");
  }
  return targets;
}

function browserDirectoryPicker() {
  if (typeof window === "undefined") return null;
  return (window as unknown as { showDirectoryPicker?: () => Promise<BrowserDirectoryHandle> }).showDirectoryPicker ?? null;
}

function canUseBrowserDirectoryInput() {
  return typeof document !== "undefined";
}

async function pickBrowserDirectory() {
  const showDirectoryPicker = browserDirectoryPicker();
  if (showDirectoryPicker) {
    browserFolderSelection = await showDirectoryPicker();
    return browserFolderSelection;
  }

  if (!canUseBrowserDirectoryInput()) {
    throw new Error("This browser cannot scan folders. Run DevSweep as a desktop app.");
  }

  browserFolderSelection = await pickBrowserDirectoryFiles();
  return browserFolderSelection;
}

function pickBrowserDirectoryFiles(): Promise<BrowserFileSelection> {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input") as HTMLInputElement & { webkitdirectory?: boolean; directory?: boolean };
    input.type = "file";
    input.multiple = true;
    input.webkitdirectory = true;
    input.directory = true;
    input.style.display = "none";

    let settled = false;
    const cleanup = () => input.remove();
    const rejectSelection = () => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error("No folder was selected."));
    };

    input.addEventListener("change", () => {
      if (settled) return;
      const files = Array.from(input.files ?? []);

      if (files.length === 0) {
        rejectSelection();
        return;
      }

      settled = true;
      cleanup();
      const firstPath = files[0]?.webkitRelativePath || files[0]?.name || "Selected Folder";
      resolve({
        kind: "file-selection",
        name: firstPath.split("/").filter(Boolean)[0] || "Selected Folder",
        files
      });
    }, { once: true });
    input.addEventListener("cancel", rejectSelection, { once: true });

    document.body.appendChild(input);
    input.click();
  });
}

async function directorySize(handle: BrowserDirectoryHandle): Promise<{ bytes: number; itemCount: number }> {
  let bytes = 0;
  let itemCount = 0;

  for await (const [, entry] of handle.entries()) {
    itemCount += 1;
    if (entry.kind === "file") {
      const file = await entry.getFile();
      bytes += file.size;
      continue;
    }

    const child = await directorySize(entry);
    bytes += child.bytes;
    itemCount += child.itemCount;
  }

  return { bytes, itemCount };
}

async function findPatternMatches(
  handle: BrowserDirectoryHandle,
  patterns: Set<string>,
  target: CleanupTarget,
  basePath: string,
  relativePath = ""
): Promise<ScanItem[]> {
  const items: ScanItem[] = [];

  for await (const [name, entry] of handle.entries()) {
    if (entry.kind !== "directory") continue;

    const entryPath = relativePath ? `${relativePath}/${name}` : name;
    if (patterns.has(name)) {
      const size = await directorySize(entry);
      items.push({
        id: `${target.id}:${entryPath}`,
        path: `${basePath}/${entryPath}`,
        name,
        bytes: size.bytes,
        risk: target.risk,
        itemType: "folder",
        canDelete: true,
        warning: "Browser preview can scan this folder, but cleanup requires the desktop app to move items to Trash."
      } as ScanItem);
      continue;
    }

    items.push(...(await findPatternMatches(entry, patterns, target, basePath, entryPath)));
  }

  return items;
}

function scanBrowserFileSelection(target: CleanupTarget, selection: BrowserFileSelection): ScanItem[] {
  const matches = new Map<string, { bytes: number; name: string }>();
  const patterns = new Set(target.patterns ?? []);

  for (const file of selection.files) {
    const relativePath = file.webkitRelativePath || file.name;
    const parts = relativePath.split("/").filter(Boolean);
    if (parts.length < 2) continue;

    for (let index = 0; index < parts.length - 1; index += 1) {
      const name = parts[index];
      if (!patterns.has(name)) continue;

      const entryPath = parts.slice(0, index + 1).join("/");
      const existing = matches.get(entryPath) ?? { bytes: 0, name };
      existing.bytes += file.size;
      matches.set(entryPath, existing);
      break;
    }
  }

  return Array.from(matches.entries()).map(([entryPath, match]) => ({
    id: `${target.id}:${entryPath}`,
    path: `${selection.name}/${entryPath}`,
    name: match.name,
    bytes: match.bytes,
    risk: target.risk,
    itemType: "folder",
    canDelete: true,
    warning: "Browser preview can scan this folder, but cleanup requires the desktop app to move items to Trash."
  }));
}

async function scanBrowserCleanupTargets(targets: CleanupTarget[], basePath: string): Promise<ScanResult[]> {
  const selection = browserFolderSelection ?? (await pickBrowserDirectory());
  const browserBasePath = basePath || selection.name;
  const supportedTargets = targets.filter((target) => target.scanType === "pattern" && target.patterns?.length);

  return Promise.all(
    supportedTargets.map(async (target) => {
      const items = selection.kind === "file-selection"
        ? scanBrowserFileSelection(target, selection)
        : await findPatternMatches(selection, new Set(target.patterns), target, browserBasePath);
      const totalBytes = items.reduce((sum, item) => sum + item.bytes, 0);
      const itemCount = items.reduce((sum, item) => sum + 1, 0);

      return {
        targetId: target.id,
        title: target.title,
        category: target.category,
        risk: target.risk,
        items,
        totalBytes,
        itemCount,
        defaultSelected: target.defaultSelected,
        warnings: target.warning ? [target.warning] : []
      };
    })
  );
}

function selectedResults(state: AppState) {
  return state.scanResults.filter((result) => state.selectedTargetIds.includes(result.targetId));
}

function mergeSettings(input: unknown): AppSettings {
  if (!input || typeof input !== "object") return defaultSettings;
  const raw = input as Partial<Record<keyof AppSettings, unknown>>;
  return {
    onboardingCompleted: raw.onboardingCompleted === true,
    defaultDevelopmentFolder: typeof raw.defaultDevelopmentFolder === "string" ? raw.defaultDevelopmentFolder : defaultSettings.defaultDevelopmentFolder,
    mode: raw.mode === "advanced" ? "advanced" : "safe",
    moveToTrash: raw.moveToTrash !== false,
    confirmAdvancedCleanup: raw.confirmAdvancedCleanup !== false,
    showHiddenFolders: raw.showHiddenFolders === true,
    ignoredPaths: Array.isArray(raw.ignoredPaths) ? raw.ignoredPaths.filter((path): path is string => typeof path === "string") : [],
    theme: "light"
  };
}

async function saveSettings(settings: AppSettings) {
  if (!isTauriRuntime()) {
    window.localStorage.setItem("devsweep.settings", JSON.stringify(settings));
    return;
  }
  await invokeCommand<void>("save_settings", { settings });
}

function persistedSettings(state: AppState): AppSettings {
  return {
    onboardingCompleted: state.onboardingCompleted,
    defaultDevelopmentFolder: state.defaultDevelopmentFolder,
    mode: state.mode,
    moveToTrash: state.moveToTrash,
    confirmAdvancedCleanup: state.confirmAdvancedCleanup,
    showHiddenFolders: state.showHiddenFolders,
    ignoredPaths: state.ignoredPaths,
    theme: state.theme
  };
}

export const useAppStore = create<AppState>((set, get) => ({
  ...defaultSettings,
  activeView: "onboarding",
  scanMode: "safe",
  scanResults: [],
  selectedTargetIds: [],
  cleanupProgress: null,
  scanProgress: null,
  cleanupReport: null,
  cleanupHistory: [],
  liveLog: [],
  scanLog: [],
  systemInfo: null,
  typedConfirmation: "",
  isNative: false,
  canUseBrowserFolderPicker: false,
  isInitialized: false,
  isScanning: false,
  isCleaning: false,
  error: null,
  setActiveView: (view) => {
    set({ activeView: view, error: null });
    if (view === "history") void get().loadHistory();
  },
  initialize: async () => {
    const native = isTauriRuntime();
    let settings = defaultSettings;

    try {
      if (native) {
        settings = mergeSettings(await invokeCommand("get_settings"));
        const systemInfo = await invokeCommand<SystemInfo>("get_system_info");
        set({ systemInfo });
      } else {
        settings = mergeSettings(JSON.parse(window.localStorage.getItem("devsweep.settings") ?? "null"));
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Failed to load settings." });
    }

    set({
      ...settings,
      isNative: native,
      canUseBrowserFolderPicker: !native && (Boolean(browserDirectoryPicker()) || canUseBrowserDirectoryInput()),
      isInitialized: true,
      activeView: settings.onboardingCompleted ? "dashboard" : "onboarding"
    });

    if (native) void get().loadHistory();

    if (native) {
      const { listen } = await import("@tauri-apps/api/event");
      await listen<ScanProgressEvent>("scan-progress", (event) => {
        set((state) => ({
          scanProgress: event.payload,
          scanLog: [`${event.payload.target} - ${event.payload.path}`, ...state.scanLog].slice(0, 80)
        }));
      });
      await listen<CleanupProgress>("cleanup-progress", (event) => {
        set((state) => ({
          cleanupProgress: event.payload,
          liveLog: [`${new Date().toLocaleTimeString()} - ${event.payload.message}: ${event.payload.currentPath}`, ...state.liveLog].slice(0, 80)
        }));
      });
      await listen<string>("cleanup-warning", (event) => set((state) => ({ liveLog: [`${new Date().toLocaleTimeString()} - Warning: ${event.payload}`, ...state.liveLog].slice(0, 80) })));
      await listen<string>("cleanup-error", (event) => set((state) => ({ liveLog: [`${new Date().toLocaleTimeString()} - Error: ${event.payload}`, ...state.liveLog].slice(0, 80) })));
      await listen<CleanupReport>("cleanup-completed", (event) => set({ cleanupReport: event.payload, activeView: "complete", isCleaning: false }));
    }
  },
  finishOnboarding: async (folder, mode) => {
    const settings = { ...persistedSettings(get()), onboardingCompleted: true, defaultDevelopmentFolder: folder, mode };
    await saveSettings(settings);
    set({ onboardingCompleted: true, defaultDevelopmentFolder: folder, mode, activeView: "dashboard" });
  },
  runScan: async (mode = get().scanMode) => {
    set({ activeView: "scan", scanMode: mode, isScanning: true, error: null, scanResults: [], selectedTargetIds: [], scanProgress: null, scanLog: [] });

    try {
      let results: ScanResult[];
      if (get().isNative) {
        results = await invokeCommand<ScanResult[]>("scan_cleanup_targets", {
          targets: targetsForScanMode(mode),
          basePath: get().defaultDevelopmentFolder,
          mode,
          showHiddenFolders: get().showHiddenFolders,
          ignoredPaths: get().ignoredPaths
        });
      } else {
        if (!get().canUseBrowserFolderPicker) {
          throw new Error("This browser cannot access local folders. Run DevSweep as a desktop app to scan real cleanup targets.");
        }
        results = await scanBrowserCleanupTargets(targetsForScanMode(mode), get().defaultDevelopmentFolder);
      }

      const selectable = results.filter((result) => result.defaultSelected && result.items.some((item) => item.canDelete));
      set({ scanResults: results, selectedTargetIds: selectable.map((result) => result.targetId), isScanning: false, scanProgress: null });
    } catch (error) {
      set({ isScanning: false, error: error instanceof Error ? error.message : "Scan failed." });
    }
  },
  toggleTarget: (targetId) => {
    const result = get().scanResults.find((item) => item.targetId === targetId);
    if (!result || !result.items.some((item) => item.canDelete)) return;
    const selected = new Set(get().selectedTargetIds);
    if (selected.has(targetId)) selected.delete(targetId);
    else selected.add(targetId);
    set({ selectedTargetIds: Array.from(selected) });
  },
  selectAllSelectable: () => {
    set((state) => ({
      selectedTargetIds: state.scanResults
        .filter((result) => result.items.some((item) => item.canDelete))
        .map((result) => result.targetId)
    }));
  },
  selectAllSafe: () => {
    set((state) => ({
      selectedTargetIds: state.scanResults
        .filter((result) => (result.risk === "safe" || result.risk === "medium") && result.items.some((item) => item.canDelete))
        .map((result) => result.targetId)
    }));
  },
  clearSelection: () => set({ selectedTargetIds: [] }),
  setTypedConfirmation: (typedConfirmation) => set({ typedConfirmation }),
  startCleanup: async () => {
    const state = get();
    const results = selectedResults(state);
    const requestItems = results.flatMap((result) =>
      result.items
        .filter((item) => item.canDelete)
        .map((item) => ({
          id: item.id,
          targetId: result.targetId,
          path: item.path,
          bytes: Math.round(item.bytes),
          risk: item.risk,
          itemType: item.itemType,
          canDelete: item.canDelete
        }))
    );

    if (requestItems.length === 0) {
      set({ error: "Select at least one cleanup item first." });
      return;
    }

    const hasDangerous = requestItems.some((item) => item.risk === "dangerous");
    if (hasDangerous && state.typedConfirmation !== "CLEAN") {
      set({ error: "Type CLEAN to confirm dangerous cleanup items." });
      return;
    }

    set({
      activeView: "progress",
      isCleaning: true,
      error: null,
      liveLog: [],
      cleanupReport: null,
      cleanupProgress: {
        sessionId: "pending",
        currentItem: "Preparing cleanup",
        currentPath: state.defaultDevelopmentFolder,
        completedItems: 0,
        totalItems: requestItems.length,
        recoveredBytes: 0,
        status: "running",
        message: "Preparing cleanup"
      }
    });

    try {
      if (!state.isNative) throw new Error("Cleanup is disabled in browser preview. Run the Tauri desktop app to clean files.");
      const report = await invokeCommand<CleanupReport>("cleanup_selected_items", {
        request: {
          selectedTargetIds: results.map((result) => result.targetId),
          selectedItemIds: requestItems.map((item) => item.id),
          moveToTrash: state.moveToTrash,
          typedConfirmation: state.typedConfirmation || undefined,
          mode: state.mode,
          items: requestItems
        }
      });
      set({ cleanupReport: report, activeView: "complete", isCleaning: false, typedConfirmation: "" });
      await get().loadHistory();
    } catch (error) {
      set({ isCleaning: false, activeView: "review", error: error instanceof Error ? error.message : "Cleanup failed." });
    }
  },
  loadHistory: async () => {
    try {
      const cleanupHistory = get().isNative ? await invokeCommand<CleanupSessionSummary[]>("get_cleanup_history") : [];
      set({ cleanupHistory });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Failed to load history." });
    }
  },
  clearHistory: async () => {
    try {
      if (get().isNative) await invokeCommand<void>("clear_cleanup_history");
      set({ cleanupHistory: [] });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Failed to clear history." });
    }
  },
  updateSetting: async (key, value) => {
    const settings: AppSettings = { ...persistedSettings(get()), [key]: value };
    await saveSettings(settings);
    set({ [key]: value } as Partial<AppState>);
  },
  addIgnoredPath: async (path) => {
    const clean = path.trim();
    if (!clean) return;
    if (get().isNative) await invokeCommand<void>("add_ignored_path", { path: clean });
    const ignoredPaths = Array.from(new Set([...get().ignoredPaths, clean]));
    await get().updateSetting("ignoredPaths", ignoredPaths);
  },
  removeIgnoredPath: async (path) => {
    if (get().isNative) await invokeCommand<void>("remove_ignored_path", { path });
    await get().updateSetting("ignoredPaths", get().ignoredPaths.filter((item) => item !== path));
  },
  chooseFolder: async () => {
    if (!get().isNative) {
      if (!get().canUseBrowserFolderPicker) {
        throw new Error("This browser cannot choose local folders. Run DevSweep as a desktop app to scan real cleanup targets.");
      }
      const directory = await pickBrowserDirectory();
      return directory.name;
    }
    const { open } = await import("@tauri-apps/plugin-dialog");
    const selected = await open({ directory: true, multiple: false, title: "Choose development folder" });
    return typeof selected === "string" ? selected : null;
  }
}));
