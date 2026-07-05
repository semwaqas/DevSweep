"use client";

import type { ElementType } from "react";
import { useEffect, useMemo, useState } from "react";
import type { CleanupCategory, CleanupProgress, CleanupReport, RiskLevel, ScanResult } from "@devsweep/core";
import {
  AlertTriangle,
  Box,
  Check,
  Code2,
  FileText,
  Folder,
  HardDrive,
  Info,
  Pause,
  Search,
  Shield,
  Sparkles,
  Trash2,
  X
} from "lucide-react";
import { useAppStore } from "@/stores/app-store";
import { cn } from "@/lib/utils";
import { formatSize } from "@/lib/format";

type ModalStep = "review" | "progress" | "complete" | null;
type SafetyLevel = "recommended" | "review" | "careful";

interface CleanupCategoryRow {
  id: string;
  title: string;
  description: string;
  itemCount: number;
  sizeBytes: number;
  safety: SafetyLevel;
  icon: ElementType;
  accent: string;
  disabled: boolean;
  result: ScanResult;
}

const categoryMeta: Record<CleanupCategory, { icon: ElementType; accent: string }> = {
  "dev-projects": { icon: Folder, accent: "blue" },
  "package-managers": { icon: Box, accent: "purple" },
  "ai-editors": { icon: Code2, accent: "teal" },
  "mobile-development": { icon: FileText, accent: "red" },
  xcode: { icon: Code2, accent: "orange" },
  docker: { icon: HardDrive, accent: "blue" },
  system: { icon: Shield, accent: "slate" },
  "large-files": { icon: Search, accent: "slate" }
};

export default function Home() {
  const {
    cleanupProgress,
    cleanupReport,
    chooseFolder,
    defaultDevelopmentFolder,
    error,
    initialize,
    isInitialized,
    isCleaning,
    isScanning,
    isNative,
    canUseBrowserFolderPicker,
    moveToTrash,
    runScan,
    scanResults,
    selectedTargetIds,
    startCleanup,
    systemInfo,
    toggleTarget,
    updateSetting
  } = useAppStore();
  const [modal, setModal] = useState<ModalStep>(null);

  useEffect(() => {
    document.documentElement.classList.remove("dark");
    document.documentElement.classList.add("light");
    void initialize();
  }, [initialize]);

  useEffect(() => {
    if (cleanupReport && modal === "progress") setModal("complete");
  }, [cleanupReport, modal]);

  const rows = useMemo(() => scanResults.map(mapScanResultToRow), [scanResults]);
  const selectedRows = useMemo(() => rows.filter((row) => selectedTargetIds.includes(row.id)), [rows, selectedTargetIds]);
  const selectedTotalBytes = selectedRows.reduce((sum, row) => sum + row.sizeBytes, 0);
  const selectedItemCount = selectedRows.reduce((sum, row) => sum + row.itemCount, 0);
  const selectedCategoryCount = selectedRows.length;
  const hasDiskInfo = Boolean(systemInfo?.totalDiskSpace && systemInfo.availableDiskSpace >= 0);
  const totalDisk = hasDiskInfo && systemInfo ? formatSize(systemInfo.totalDiskSpace) : null;
  const availableDisk = hasDiskInfo && systemInfo ? formatSize(systemInfo.availableDiskSpace) : null;
  const usedPercent = hasDiskInfo && systemInfo ? Math.round(((systemInfo.totalDiskSpace - systemInfo.availableDiskSpace) / systemInfo.totalDiskSpace) * 100) : null;
  const canScan = isNative || canUseBrowserFolderPicker;

  async function pickFolder() {
    const selected = await chooseFolder();
    if (selected) await updateSetting("defaultDevelopmentFolder", selected);
  }

  function startReview() {
    setModal("review");
  }

  function startProgress() {
    setModal("progress");
    void startCleanup();
  }

  function showCompleteIfAvailable() {
    if (cleanupReport) setModal("complete");
  }

  return (
    <main data-runtime={isNative ? "native" : canUseBrowserFolderPicker ? "browser-picker" : "browser-preview"} className="min-h-screen overflow-x-hidden bg-[#edf3fb] p-4 text-[#071640] md:p-6">
      <div className="mx-auto min-h-[calc(100vh-2rem)] max-w-[1760px] rounded-[24px] border border-white/80 bg-white/86 p-7 shadow-[0_26px_80px_rgba(44,63,104,0.18)] backdrop-blur md:min-h-[calc(100vh-3rem)] md:p-10">
        <Header />

        <section className="mt-8 grid gap-8 xl:grid-cols-[minmax(0,1fr)_440px]">
          <div className="space-y-5">
            <HeroCard totalBytes={selectedTotalBytes} selectedCount={selectedCategoryCount} hasResults={rows.length > 0} canScan={canScan} canClean={isNative} onQuickClean={() => (isInitialized ? startProgress() : undefined)} onReview={startReview} scanning={isScanning} onScan={() => void runScan("safe")} />
            {error && <ErrorBanner message={error} />}
            <CleanupTable selectedIds={new Set(selectedTargetIds)} rows={rows} canScan={canScan} isScanning={isScanning} onScan={() => void runScan("safe")} onToggle={toggleTarget} />
          </div>

          <aside className="space-y-5">
            <StorageCard available={availableDisk} total={totalDisk} percent={usedPercent} />
            <ScanFolderCard folder={defaultDevelopmentFolder} canChooseFolder={canScan} onChange={pickFolder} />
            <BeforeCleaningCard enabled={moveToTrash} canClean={isNative} onToggle={() => void updateSetting("moveToTrash", !moveToTrash)} />
            <HowItWorksCard />
          </aside>
        </section>

        <FooterBar totalBytes={selectedTotalBytes} selectedCount={selectedCategoryCount} itemCount={selectedItemCount} canClean={isNative} onClean={startReview} />
      </div>

      {modal === "review" && <ReviewModal rows={selectedRows} totalBytes={selectedTotalBytes} itemCount={selectedItemCount} canClean={isNative} onBack={() => setModal(null)} onContinue={startProgress} />}
      {modal === "progress" && <ProgressModal progress={cleanupProgress} report={cleanupReport} isCleaning={isCleaning} error={error} onClose={() => setModal(null)} onComplete={showCompleteIfAvailable} totalBytes={selectedTotalBytes} selectedCount={selectedCategoryCount} selectedItemCount={selectedItemCount} />}
      {modal === "complete" && <CompleteModal categoryCount={selectedCategoryCount} movedCount={cleanupReport?.cleanedItems ?? selectedItemCount} totalBytes={cleanupReport?.recoveredBytes ?? selectedTotalBytes} skippedCount={cleanupReport?.skippedItems ?? 0} failedCount={cleanupReport?.failedItems ?? 0} onDone={() => setModal(null)} />}
    </main>
  );
}

function Header() {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <MacDots />
        <Brand />
        <p className="hidden text-lg font-medium text-[#586790] md:block">Free up disk space safely</p>
      </div>
    </header>
  );
}

function mapScanResultToRow(result: ScanResult): CleanupCategoryRow {
  const meta = categoryMeta[result.category];
  const safety = riskToSafety(result.risk);
  const firstPath = result.items.find((item) => item.path)?.path;

  return {
    id: result.targetId,
    title: result.title,
    description: firstPath ?? result.warnings[0] ?? "No matching cleanup paths found",
    itemCount: result.itemCount,
    sizeBytes: result.totalBytes,
    safety,
    icon: meta.icon,
    accent: safety === "careful" ? "red" : meta.accent,
    disabled: !result.items.some((item) => item.canDelete),
    result
  };
}

function riskToSafety(risk: RiskLevel): SafetyLevel {
  if (risk === "safe" || risk === "medium") return "recommended";
  if (risk === "advanced" || risk === "info") return "review";
  return "careful";
}

function formatItemCount(count: number) {
  return `${count.toLocaleString()} ${count === 1 ? "item" : "items"}`;
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="rounded-[16px] border border-[#ffd0d5] bg-[#fff4f4] px-5 py-4 text-sm font-semibold text-[#c8323d]">
      {message}
    </div>
  );
}

function Brand({ centered = false, compact = false }: { centered?: boolean; compact?: boolean }) {
  return (
    <div className={cn("flex items-center gap-4", compact && "gap-2 sm:gap-3", centered && "justify-center")}>
      <div className={cn("grid place-items-center rounded-2xl bg-[linear-gradient(145deg,#24d6e7_0%,#426dff_52%,#8b5cf6_100%)] shadow-[0_14px_28px_rgba(66,109,255,0.26)]", compact ? "size-9 rounded-xl sm:size-11" : "size-14")}>
        <Box className={cn("text-white", compact ? "size-5 sm:size-6" : "size-8")} />
      </div>
      <div className={cn("font-black tracking-[-0.03em] text-[#071640]", compact ? "text-lg sm:text-xl" : "text-4xl md:text-[34px]")}>DevSweep</div>
    </div>
  );
}

function MacDots() {
  return (
    <div className="flex gap-3">
      <span className="size-5 rounded-full bg-[#ff5f57]" />
      <span className="size-5 rounded-full bg-[#ffbd2e]" />
      <span className="size-5 rounded-full bg-[#28c840]" />
    </div>
  );
}

function HeroCard({
  totalBytes,
  selectedCount,
  hasResults,
  canScan,
  canClean,
  onQuickClean,
  onReview,
  scanning,
  onScan
}: {
  totalBytes: number;
  selectedCount: number;
  hasResults: boolean;
  canScan: boolean;
  canClean: boolean;
  onQuickClean: () => void;
  onReview: () => void;
  scanning: boolean;
  onScan: () => void;
}) {
  const totalLabel = formatSize(totalBytes);
  const hasSelection = selectedCount > 0 && totalBytes > 0;

  return (
    <section className="rounded-[24px] border border-[#d8e2f8] bg-[linear-gradient(110deg,#fbf8ff_0%,#eff8ff_100%)] p-5 shadow-[0_18px_50px_rgba(80,102,151,0.1)] sm:p-7 lg:p-9">
      <div className="grid items-center gap-6 lg:grid-cols-[220px_1fr] lg:gap-8">
        <div className="mx-auto grid size-36 place-items-center rounded-full bg-white/74 shadow-[inset_0_0_0_10px_rgba(255,255,255,0.62),0_20px_50px_rgba(62,92,166,0.1)] sm:size-44 sm:shadow-[inset_0_0_0_12px_rgba(255,255,255,0.62),0_20px_50px_rgba(62,92,166,0.1)]">
          <div className="relative grid size-24 place-items-center rounded-full bg-white shadow-[0_20px_45px_rgba(55,83,145,0.12)] sm:size-32">
            <Sparkles className="absolute left-5 top-8 size-4 text-[#9db7ff]" />
            <Trash2 className="size-12 -rotate-12 text-[#4777f6] sm:size-16" />
            <Sparkles className="absolute bottom-8 right-5 size-5 text-[#9db7ff]" />
          </div>
        </div>

        <div>
          <div className="flex flex-wrap items-end gap-4">
            <h1 className="text-5xl font-black tracking-[-0.04em] text-[#071640] sm:text-6xl md:text-7xl">{hasResults ? totalLabel : "--"}</h1>
            <p className="pb-2 text-2xl font-extrabold tracking-[-0.02em] sm:pb-3 sm:text-3xl">{hasResults ? "ready to clean" : "waiting for scan"}</p>
            <Sparkles className="mb-5 size-5 text-[#5a82ff]" />
          </div>
          <p className="mt-3 text-lg font-medium text-[#53638c]">
            {hasResults
              ? "Review real scan results before cleanup."
              : canScan
                ? "Choose a folder or run a scan to calculate real reclaimable space."
                : "Open the Tauri desktop app to scan real folders and calculate reclaimable space."}
          </p>
          <div className="mt-7 flex flex-wrap gap-5">
            <button className="inline-flex h-16 w-full items-center justify-center gap-3 rounded-lg bg-[linear-gradient(135deg,#3474ff,#7c4dff)] px-8 text-xl font-bold text-white shadow-[0_16px_30px_rgba(72,91,236,0.28)] transition hover:translate-y-[-1px] disabled:cursor-not-allowed disabled:opacity-45 sm:w-auto sm:min-w-60" onClick={onQuickClean} disabled={!hasSelection || !canClean}>
              <Sparkles className="size-6" />
              Quick Clean
            </button>
            <button className="inline-flex h-16 w-full items-center justify-center gap-3 rounded-lg border border-[#cbd9f7] bg-white px-8 text-xl font-bold text-[#2865f4] shadow-[0_10px_28px_rgba(73,96,145,0.08)] transition hover:translate-y-[-1px] disabled:cursor-not-allowed disabled:opacity-45 sm:w-auto sm:min-w-60" onClick={onReview} disabled={!hasSelection}>
              <FileText className="size-6" />
              Review Items
            </button>
            <button className="inline-flex h-12 w-full items-center justify-center rounded-lg border border-transparent px-3 text-sm font-bold text-[#6680ba] disabled:cursor-not-allowed disabled:opacity-45 sm:h-16 sm:w-auto" onClick={onScan} disabled={!canScan || scanning}>
              {scanning ? "Scanning..." : canScan ? "Refresh Scan" : "Desktop Scan Required"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function CleanupTable({
  rows,
  selectedIds,
  canScan,
  isScanning,
  onScan,
  onToggle
}: {
  rows: CleanupCategoryRow[];
  selectedIds: Set<string>;
  canScan: boolean;
  isScanning: boolean;
  onScan: () => void;
  onToggle: (id: string) => void;
}) {
  return (
    <section className="overflow-hidden rounded-[18px] border border-[#dfe7f5] bg-white shadow-[0_18px_45px_rgba(80,102,151,0.08)]">
      <div className="overflow-x-auto">
        <div className="min-w-[860px]">
          <div className="grid grid-cols-[52px_1.45fr_0.65fr_0.72fr_0.68fr] items-center border-b border-[#e7edf7] px-6 py-4 text-sm font-semibold text-[#56658b]">
            <CheckedBox checked />
            <span>Cleanup Categories</span>
            <span>Items Found</span>
            <span>Reclaimable Space</span>
            <span>Safety</span>
          </div>
          {rows.length === 0 ? (
            <div className="grid place-items-center px-6 py-16 text-center">
              <Search className="mx-auto size-12 text-[#4d78f6]" />
              <h2 className="mt-5 text-xl font-black text-[#071640]">{isScanning ? "Scanning real cleanup targets..." : "No scan results yet"}</h2>
              <p className="mt-2 max-w-md text-sm font-medium text-[#637298]">
                {canScan
                  ? "Run a scan to populate this table with actual files and reclaimable sizes from your selected folder."
                  : "The current browser preview cannot access local folders. Use the Tauri desktop app to scan actual files."}
              </p>
              <button className="mt-5 inline-flex h-12 items-center justify-center rounded-lg bg-[linear-gradient(135deg,#3474ff,#7c4dff)] px-6 font-bold text-white disabled:cursor-not-allowed disabled:opacity-45" disabled={!canScan || isScanning} onClick={onScan}>
                {isScanning ? "Scanning..." : canScan ? "Run Scan" : "Desktop App Required"}
              </button>
            </div>
          ) : rows.map((row) => (
            <div key={row.id} className="grid grid-cols-[52px_1.45fr_0.65fr_0.72fr_0.68fr] items-center border-b border-[#e7edf7] px-6 py-3 last:border-b-0">
              <button aria-label={`Select ${row.title}`} onClick={() => onToggle(row.id)} disabled={row.disabled} className="disabled:cursor-not-allowed disabled:opacity-40">
                <CheckedBox checked={selectedIds.has(row.id)} />
              </button>
              <div className="flex min-w-0 items-center gap-5">
                <IconTile row={row} />
                <div className="min-w-0">
                  <div className="text-base font-black text-[#071640]">{row.title}</div>
                  <div className="truncate text-sm font-medium text-[#586790]">{row.description}</div>
                </div>
              </div>
              <div className="font-bold text-[#071640]">{formatItemCount(row.itemCount)}</div>
              <div className="font-bold text-[#071640]">{formatSize(row.sizeBytes)}</div>
              <SafetyBadge safety={row.safety} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function IconTile({ row }: { row: CleanupCategoryRow }) {
  const Icon = row.icon;
  const styles: Record<string, string> = {
    blue: "bg-[#edf5ff] text-[#4c83f7] border-[#dceaff]",
    purple: "bg-[#f4efff] text-[#8357f4] border-[#e8dcff]",
    teal: "bg-[#ecfbff] text-[#28b8c7] border-[#d8f3f8]",
    orange: "bg-[#fff6ed] text-[#ff8a22] border-[#ffe5ca]",
    red: "bg-[#fff0f1] text-[#ff5d64] border-[#ffd7dc]",
    slate: "bg-[#f1f5fb] text-[#8b9bb8] border-[#dde7f6]"
  };

  return (
    <div className={cn("grid size-14 shrink-0 place-items-center rounded-lg border", styles[row.accent])}>
      <Icon className="size-7" />
    </div>
  );
}

function CheckedBox({ checked }: { checked: boolean }) {
  return (
    <span className={cn("grid size-5 place-items-center rounded-[5px] border text-white", checked ? "border-[#3c73f6] bg-[#4d7df7]" : "border-[#cbd8ee] bg-white")}>
      {checked && <Check className="size-4 stroke-[3]" />}
    </span>
  );
}

function SafetyBadge({ safety }: { safety: SafetyLevel }) {
  if (safety === "recommended") {
    return (
      <span className="inline-flex w-40 items-center justify-center gap-2 rounded-lg border border-[#bdebc8] bg-[#f0fff3] px-3 py-3 text-sm font-bold text-[#28ad48]">
        <Shield className="size-5" />
        Recommended
      </span>
    );
  }

  if (safety === "review") {
    return (
      <span className="inline-flex w-40 items-center justify-center gap-2 rounded-lg border border-[#ffd9b4] bg-[#fff9f1] px-3 py-3 text-sm font-bold text-[#f27b16]">
        <Search className="size-5" />
        Review
      </span>
    );
  }

  return (
    <span className="inline-flex w-40 items-center justify-center gap-2 rounded-lg border border-[#ffd0d5] bg-[#fff4f4] px-3 py-3 text-sm font-bold text-[#ff4f5b]">
      <AlertTriangle className="size-5" />
      Careful
    </span>
  );
}

function StorageCard({ available, total, percent }: { available: string | null; total: string | null; percent: number | null }) {
  const hasDiskInfo = available !== null && total !== null && percent !== null;

  return (
    <aside className="rounded-[16px] border border-[#dfe7f5] bg-white p-5 shadow-[0_18px_45px_rgba(80,102,151,0.08)]">
      <div className="flex items-center justify-between gap-5">
        <div className="flex items-center gap-5">
          <HardDrive className="size-14 text-[#8a9ab9]" />
          <div>
            <div className="text-base font-semibold text-[#637298]">{hasDiskInfo ? "Available Storage" : "Storage Unavailable"}</div>
            {hasDiskInfo ? (
              <div className="mt-1 text-xl font-black text-[#071640]">{available} <span className="font-semibold text-[#53638c]">free of {total}</span></div>
            ) : (
              <div className="mt-1 max-w-64 text-sm font-semibold leading-5 text-[#53638c]">Open the desktop app to read real disk capacity.</div>
            )}
          </div>
        </div>
        {hasDiskInfo ? <Ring percent={percent} size="sm" /> : <div className="grid size-16 place-items-center rounded-full border border-[#dfe7f5] bg-[#f7faff] text-sm font-black text-[#8a9ab9]">--</div>}
      </div>
    </aside>
  );
}

function ScanFolderCard({ folder, canChooseFolder, onChange }: { folder: string; canChooseFolder: boolean; onChange: () => void }) {
  return (
    <aside className="rounded-[16px] border border-[#dfe7f5] bg-white p-6 shadow-[0_18px_45px_rgba(80,102,151,0.08)]">
      <h2 className="text-xl font-black text-[#071640]">Scan Folder</h2>
      <div className="mt-4 flex items-center gap-4">
        <div className="grid size-11 place-items-center rounded-lg bg-[#edf5ff] text-[#4c83f7]">
          <Folder className="size-7" />
        </div>
        <p className="min-w-0 flex-1 truncate text-base font-semibold text-[#394a76]">{folder || "~/Development"}</p>
        <button className="h-11 rounded-lg border border-[#ccdaf6] px-5 text-sm font-bold text-[#2865f4] transition hover:bg-[#f5f8ff] disabled:cursor-not-allowed disabled:opacity-45" onClick={onChange} disabled={!canChooseFolder}>
          {canChooseFolder ? "Change" : "Desktop"}
        </button>
      </div>
      {!canChooseFolder && <p className="mt-4 text-sm font-semibold leading-5 text-[#637298]">Folder access is only available in the desktop app.</p>}
    </aside>
  );
}

function BeforeCleaningCard({ enabled, canClean, onToggle }: { enabled: boolean; canClean: boolean; onToggle: () => void }) {
  return (
    <aside className="rounded-[16px] border border-[#dfe7f5] bg-white p-6 shadow-[0_18px_45px_rgba(80,102,151,0.08)]">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black text-[#071640]">Before Cleaning</h2>
        <Info className="size-5 text-[#8fa0bf]" />
      </div>
      <p className="mt-3 max-w-64 text-base font-medium leading-6 text-[#53638c]">
        {canClean ? "Items will be moved to Trash where possible." : "The desktop app moves selected items to Trash where possible."}
      </p>
      <div className="mt-7 flex items-center justify-between">
        <span className="text-base font-black">Move to Trash</span>
        <button className={cn("relative h-9 w-16 rounded-full transition disabled:cursor-not-allowed disabled:opacity-45", enabled ? "bg-[linear-gradient(135deg,#2e6fff,#7058ff)]" : "bg-[#ccd6e8]")} onClick={onToggle} aria-label="Toggle move to trash" disabled={!canClean}>
          <span className={cn("absolute top-1 size-7 rounded-full bg-white shadow transition", enabled ? "left-8" : "left-1")} />
        </button>
      </div>
      {!canClean && <p className="mt-4 text-sm font-semibold leading-5 text-[#637298]">Cleanup settings apply when running inside the desktop app.</p>}
    </aside>
  );
}

function HowItWorksCard() {
  return (
    <aside className="rounded-[16px] border border-[#dfe7f5] bg-white p-6 shadow-[0_18px_45px_rgba(80,102,151,0.08)]">
      <h2 className="text-xl font-black text-[#071640]">How it works</h2>
      <div className="mt-6 space-y-6">
        <Step icon={Search} title="1. Scan your development folders" text="We find files that are safe to remove." />
        <Step icon={Check} title="2. Review and select" text="You're in control. Review items first." />
        <Step icon={Sparkles} title="3. Clean and reclaim space" text="Files go to Trash. Easy to undo." />
      </div>
      <SafeDesign className="mt-8" />
    </aside>
  );
}

function Step({ icon: Icon, title, text }: { icon: ElementType; title: string; text: string }) {
  return (
    <div className="flex gap-5">
      <div className="grid size-12 shrink-0 place-items-center rounded-full bg-[#edf3ff] text-[#4d78f6]">
        <Icon className="size-6" />
      </div>
      <div>
        <div className="text-base font-semibold text-[#394a76]">{title}</div>
        <div className="mt-1 text-sm font-medium text-[#637298]">{text}</div>
      </div>
    </div>
  );
}

function SafeDesign({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-5 rounded-[16px] border border-[#d8e8fa] bg-[linear-gradient(120deg,#f4fbff,#ffffff)] p-5", className)}>
      <Shield className="size-11 shrink-0 text-[#20b7cb]" />
      <div>
        <div className="text-lg font-black text-[#1265ff]">Safe by Design</div>
        <div className="mt-1 text-sm font-medium leading-5 text-[#637298]">We never delete important project files.</div>
      </div>
    </div>
  );
}

function FooterBar({ totalBytes, selectedCount, itemCount, canClean, onClean }: { totalBytes: number; selectedCount: number; itemCount: number; canClean: boolean; onClean: () => void }) {
  return (
    <footer className="mt-5 grid items-center gap-5 rounded-[18px] border border-[#e1e8f5] bg-white p-4 shadow-[0_18px_45px_rgba(80,102,151,0.08)] md:grid-cols-[1fr_auto_1fr]">
      <div className="flex items-center gap-5">
        <div className="grid size-14 place-items-center rounded-full bg-[#eaffed] text-[#26b64a]">
          <Shield className="size-8" />
        </div>
        <div>
          <div className="text-lg font-black text-[#071640]">You're in control</div>
          <div className="mt-1 text-sm font-medium text-[#53638c]">{selectedCount > 0 ? `${selectedCount} targets selected, ${itemCount.toLocaleString()} items found. ${canClean ? "Ready to move to Trash." : "Cleanup requires the desktop app."}` : "Run a scan and select cleanup targets before cleaning."}</div>
        </div>
      </div>
      <div className="text-right">
        <div className="text-sm font-medium text-[#53638c]">Total reclaimable space</div>
        <div className="mt-1 text-2xl font-black">{formatSize(totalBytes)}</div>
      </div>
      <button className="inline-flex h-16 items-center justify-center gap-3 rounded-lg bg-[linear-gradient(135deg,#3474ff,#7c4dff)] px-8 text-xl font-bold text-white shadow-[0_16px_30px_rgba(72,91,236,0.28)] disabled:cursor-not-allowed disabled:opacity-45" onClick={onClean} disabled={selectedCount === 0 || totalBytes <= 0}>
        <Sparkles className="size-6" />
        {canClean ? `Clean Selected Items (${formatSize(totalBytes)})` : `Review Selected Items (${formatSize(totalBytes)})`}
      </button>
    </footer>
  );
}

function ModalShell({ children, size = "md" }: { children: React.ReactNode; size?: "md" | "lg" }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[#dbe6f5]/72 p-3 backdrop-blur-sm sm:p-6">
      <div className={cn("relative flex max-h-[calc(100vh-1.5rem)] w-full flex-col overflow-hidden rounded-[18px] border border-[#dfe7f5] bg-white shadow-[0_32px_90px_rgba(29,42,77,0.22)] sm:max-h-[calc(100vh-3rem)]", size === "lg" ? "max-w-[720px]" : "max-w-[560px]")}>
        <div className="flex shrink-0 items-center justify-between border-b border-[#e8eef8] px-4 py-3 sm:px-5 sm:py-4">
          <MacDots />
          <Brand centered compact />
          <div className="w-[64px]" />
        </div>
        <div className="min-h-0 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

function ReviewModal({ rows, totalBytes, itemCount, canClean, onBack, onContinue }: { rows: CleanupCategoryRow[]; totalBytes: number; itemCount: number; canClean: boolean; onBack: () => void; onContinue: () => void }) {
  return (
    <ModalShell size="lg">
      <div className="p-4 sm:p-6">
        <div className="text-center">
          <h2 className="text-2xl font-black tracking-[-0.03em] text-[#071640] sm:text-3xl">Review items before cleaning</h2>
          <p className="mt-2 font-medium text-[#53638c]">Make sure everything looks good before we get started.</p>
        </div>
        <div className="mt-6 grid gap-4 rounded-[18px] border border-[#d8e2f8] bg-[linear-gradient(110deg,#fbf8ff,#eff8ff)] p-5 sm:grid-cols-[120px_1fr] sm:items-center">
          <div className="mx-auto grid size-24 place-items-center rounded-full bg-white shadow-[0_18px_38px_rgba(55,83,145,0.12)]">
            <Trash2 className="size-12 -rotate-12 text-[#4777f6]" />
          </div>
          <div>
            <div className="text-2xl font-black text-[#071640] sm:text-3xl">{formatSize(totalBytes)} <span className="text-xl sm:text-2xl">selected</span></div>
            <p className="mt-2 font-medium text-[#53638c]">{rows.length} targets, {itemCount.toLocaleString()} items ready to reclaim space.</p>
            <p className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-[#375785]"><Shield className="size-4 text-[#25b84a]" /> Safe to remove. Important files are protected.</p>
          </div>
        </div>
        <div className="mt-5 overflow-hidden rounded-[14px] border border-[#e4ebf7]">
          <div className="overflow-x-auto">
            <div className="min-w-[620px]">
              <div className="grid grid-cols-[1fr_140px_130px] bg-[#fbfcff] px-4 py-3 text-xs font-semibold text-[#637298]">
                <span>Selected Items</span>
                <span>Reclaimable Space</span>
                <span>Safety</span>
              </div>
              {rows.map((row) => (
                <div key={row.id} className="grid grid-cols-[1fr_140px_130px] items-center border-t border-[#e8eef8] px-4 py-2.5">
                  <div className="flex items-center gap-3">
                    <CheckedBox checked />
                    <IconTile row={row} />
                    <div>
                      <div className="text-sm font-black text-[#071640]">{row.title}</div>
                      <div className="text-xs font-medium text-[#637298]">{row.description}</div>
                    </div>
                  </div>
                  <div className="text-sm font-black">{formatSize(row.sizeBytes)}</div>
                  <SmallSafety safety={row.safety} />
                </div>
              ))}
            </div>
          </div>
        </div>
        <SafeDesign className="mt-5" />
        {!canClean && (
          <div className="mt-5 rounded-[14px] border border-[#ffd9b4] bg-[#fff9f1] px-4 py-3 text-sm font-semibold text-[#b86109]">
            Browser mode can scan and review real folder data. Run the desktop app to move selected items to Trash.
          </div>
        )}
        <div className="mt-5 grid gap-4 sm:grid-cols-[110px_1fr]">
          <button className="h-14 rounded-lg border border-[#ccdaf6] text-base font-bold text-[#2865f4]" onClick={onBack}>Back</button>
          <button className="inline-flex h-14 items-center justify-center gap-3 rounded-lg bg-[linear-gradient(135deg,#3474ff,#7c4dff)] text-lg font-bold text-white shadow-[0_14px_28px_rgba(72,91,236,0.24)] disabled:cursor-not-allowed disabled:opacity-45" disabled={!canClean} onClick={onContinue}>
            <Sparkles className="size-5" />
            {canClean ? "Continue to Clean" : "Desktop App Required"}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

function ProgressModal({
  progress,
  report,
  isCleaning,
  error,
  totalBytes,
  selectedCount,
  selectedItemCount,
  onClose,
  onComplete
}: {
  progress: CleanupProgress | null;
  report: CleanupReport | null;
  isCleaning: boolean;
  error: string | null;
  totalBytes: number;
  selectedCount: number;
  selectedItemCount: number;
  onClose: () => void;
  onComplete: () => void;
}) {
  const reportCompletedItems = report ? report.cleanedItems + report.skippedItems + report.failedItems : null;
  const totalItems = progress?.totalItems ?? selectedItemCount;
  const completedItems = reportCompletedItems ?? progress?.completedItems ?? 0;
  const percent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : report ? 100 : 0;
  const reclaimedBytes = report?.recoveredBytes ?? progress?.recoveredBytes ?? 0;
  const currentItem = progress?.currentItem ?? (isCleaning ? "Preparing cleanup" : "Waiting");

  return (
    <ModalShell>
      <div className="p-4 sm:p-7">
        <button className="absolute right-5 top-5 rounded-full p-2 text-[#9ba8c3] hover:bg-[#f3f6fb]" onClick={onClose} aria-label="Close progress">
          <X className="size-5" />
        </button>
        <div className="text-center">
          <h2 className="text-2xl font-black tracking-[-0.03em] sm:text-3xl">Cleaning in progress</h2>
          <p className="mt-2 font-medium text-[#53638c]">Please wait while DevSweep frees up space safely.</p>
        </div>
        <div className="relative mt-6 grid place-items-center">
          <div className="absolute top-14 h-24 w-80 rounded-full bg-[#eef4ff] blur-xl" />
          <Ring percent={percent} size="lg" label={isCleaning ? "Cleaning..." : report ? "Complete" : "Pending"} />
        </div>
        {error && <ErrorBanner message={error} />}
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <StatCard icon={CheckedBoxIcon} title="Current Item" value={currentItem} sub={progress?.currentPath ?? `${selectedCount} selected targets`} />
          <StatCard icon={Shield} title="Reclaimed So Far" value={formatSize(reclaimedBytes)} sub={`of ${formatSize(totalBytes)}`} />
          <StatCard icon={Pause} title="Items Completed" value={`${completedItems} of ${totalItems || selectedCount}`} sub={report ? "Complete" : isCleaning ? "In progress" : "Not started"} />
        </div>
        <div className="mt-4 rounded-[16px] border border-[#e4ebf7] p-4">
          <h3 className="font-black">Activity</h3>
          <div className="mt-3 space-y-2">
            <div className="grid grid-cols-[22px_1fr_auto] items-center gap-2 text-sm font-medium text-[#53638c]">
              <ActivityDot state={report ? "done" : isCleaning ? "active" : "waiting"} />
              <span>{progress?.message ?? (report ? "Cleanup completed" : "Waiting for cleanup to start")}</span>
              <span className="text-right text-xs">{new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
            </div>
            {progress?.currentPath && (
              <div className="truncate rounded-lg bg-[#f7faff] px-3 py-2 text-xs font-medium text-[#637298]">
                {progress.currentPath}
              </div>
            )}
          </div>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <button className="inline-flex h-14 items-center justify-center gap-3 rounded-lg border border-[#ccdaf6] text-base font-bold text-[#2865f4]">
            <Pause className="size-5" />
            Pause
          </button>
          <button className="h-14 rounded-lg border border-[#ccdaf6] text-base font-bold text-[#2865f4] disabled:cursor-not-allowed disabled:opacity-45" disabled={!report} onClick={onComplete}>View Complete</button>
        </div>
      </div>
    </ModalShell>
  );
}

function CompleteModal({ totalBytes, categoryCount, movedCount, skippedCount, failedCount, onDone }: { totalBytes: number; categoryCount: number; movedCount: number; skippedCount: number; failedCount: number; onDone: () => void }) {
  return (
    <ModalShell>
      <div className="p-4 text-center sm:p-8">
        <div className="relative mx-auto mt-4 grid size-36 place-items-center rounded-full bg-[#dffceb]">
          <Check className="size-24 rounded-full bg-[linear-gradient(135deg,#78ef9d,#23c66b)] p-6 text-white shadow-[0_20px_45px_rgba(35,198,107,0.28)]" />
        </div>
        <h2 className="mt-8 text-2xl font-black tracking-[-0.03em] sm:text-3xl">Cleanup completed</h2>
        <div className="mt-3 text-3xl font-black tracking-[-0.04em] sm:text-4xl"><span className="text-[#5b4df5]">{formatSize(totalBytes)}</span> reclaimed!</div>
        <p className="mt-3 text-lg font-medium text-[#637298]">Your Mac now has more room to breathe.</p>
        <div className="mt-7 rounded-[16px] border border-[#e0e8f6] text-left">
          <CompleteRow icon={Folder} label="Categories cleaned" value={String(categoryCount)} />
          <CompleteRow icon={Trash2} label="Items moved to Trash" value={movedCount.toLocaleString()} />
          <CompleteRow icon={Shield} label="Items skipped" value={skippedCount.toLocaleString()} />
          <CompleteRow icon={AlertTriangle} label="Failed items" value={failedCount.toLocaleString()} />
        </div>
        <SafeDesign className="mt-4 text-left" />
        <button className="mt-5 inline-flex h-16 w-full items-center justify-center gap-3 rounded-lg bg-[linear-gradient(135deg,#3474ff,#7c4dff)] text-xl font-bold text-white shadow-[0_16px_30px_rgba(72,91,236,0.28)]" onClick={onDone}>
          <Sparkles className="size-6" />
          Done
        </button>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <button className="h-14 rounded-lg border border-[#ccdaf6] text-base font-bold text-[#2865f4]">View Report</button>
          <button className="h-14 rounded-lg border border-[#ccdaf6] text-base font-bold text-[#2865f4]">Open Trash</button>
        </div>
      </div>
    </ModalShell>
  );
}

function Ring({ percent, size, label }: { percent: number; size: "sm" | "lg"; label?: string }) {
  const dimensions = size === "lg" ? "size-44" : "size-16";
  const inner = size === "lg" ? "size-32" : "size-12";
  const stroke = `conic-gradient(#4d78f6 ${percent * 3.6}deg, #edf2fb 0deg)`;

  return (
    <div className={cn("relative grid place-items-center rounded-full", dimensions)} style={{ background: stroke }}>
      <div className={cn("grid place-items-center rounded-full bg-white", inner)}>
        <div>
          <div className={cn("text-center font-black text-[#071640]", size === "lg" ? "text-4xl" : "text-sm")}>{percent}%</div>
          {label && <div className="mt-2 text-center text-sm font-bold text-[#5b6cf6]">{label}</div>}
        </div>
      </div>
    </div>
  );
}

function SmallSafety({ safety }: { safety: SafetyLevel }) {
  const className =
    safety === "recommended"
      ? "border-[#bdebc8] bg-[#f0fff3] text-[#28ad48]"
      : safety === "review"
        ? "border-[#ffd9b4] bg-[#fff9f1] text-[#f27b16]"
        : "border-[#ffd0d5] bg-[#fff4f4] text-[#ff4f5b]";
  return <span className={cn("rounded-lg border px-3 py-2 text-center text-xs font-black", className)}>{safety === "recommended" ? "Recommended" : safety === "review" ? "Review" : "Careful"}</span>;
}

function StatCard({ icon: Icon, title, value, sub }: { icon: ElementType; title: string; value: string; sub: string }) {
  return (
    <div className="rounded-[14px] border border-[#e4ebf7] p-4 text-left">
      <div className="flex items-center gap-2 text-xs font-semibold text-[#637298]">
        <Icon className="size-5 text-[#4d78f6]" />
        {title}
      </div>
      <div className="mt-4 text-xl font-black">{value}</div>
      <div className="mt-1 text-sm font-medium text-[#53638c]">{sub}</div>
    </div>
  );
}

function CheckedBoxIcon({ className }: { className?: string }) {
  return <CheckedBox checked={true} />;
}

function ActivityDot({ state }: { state: string }) {
  if (state === "done") return <Check className="size-4 rounded-full bg-[#39bf57] p-0.5 text-white" />;
  if (state === "active") return <span className="grid size-4 place-items-center rounded-full bg-[#ffb348] text-[10px] font-black text-white">!</span>;
  return <span className="size-4 rounded-full bg-[#d4ddeb]" />;
}

function CompleteRow({ icon: Icon, label, value }: { icon: ElementType; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-[#e8eef8] px-6 py-4 last:border-b-0">
      <div className="flex items-center gap-4 text-lg font-semibold text-[#394a76]">
        <Icon className="size-6 text-[#6c8ff3]" />
        {label}
      </div>
      <div className="text-xl font-black text-[#071640]">{value}</div>
    </div>
  );
}
