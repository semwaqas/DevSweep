"use client";

import type { ReactNode } from "react";
import { Bell, Cog, Gauge, History, Moon, Rocket, ScanLine, Sparkles, Sun, Trash2 } from "lucide-react";
import { useAppStore } from "@/stores/app-store";
import { Button } from "@/components/ui/button";
import { Logo } from "./logo";
import { cn } from "@/lib/utils";
import { formatSize } from "@/lib/format";

const nav = [
  ["dashboard", Gauge, "Overview"],
  ["scan", ScanLine, "Scan"],
  ["review", Trash2, "Cleanup"],
  ["history", History, "History"],
  ["settings", Cog, "Settings"]
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { activeView, mode, setActiveView, systemInfo, theme, updateSetting } = useAppStore();
  const total = systemInfo?.totalDiskSpace ?? 0;
  const available = systemInfo?.availableDiskSpace ?? 0;
  const usedPercent = total > 0 ? Math.round(((total - available) / total) * 100) : 0;
  const diskLabel = total > 0 ? `${formatSize(available)} free of ${formatSize(total)}` : "Disk details unavailable";
  const nextMode = mode === "safe" ? "advanced" : "safe";
  const nextTheme = theme === "dark" ? "light" : "dark";

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50/70 text-slate-950 dark:bg-background/60 dark:text-slate-100">
      <aside className="hidden h-screen w-[260px] shrink-0 border-r border-slate-200/80 bg-white/85 p-4 shadow-[12px_0_40px_rgba(15,23,42,0.06)] backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-950/82 dark:shadow-none lg:flex lg:flex-col">
        <div className="rounded-lg border border-slate-200/80 bg-slate-50/80 p-3 dark:border-slate-800/70 dark:bg-slate-900/55">
          <Logo />
          <p className="mt-3 text-xs leading-5 text-slate-500 dark:text-slate-400">Developer cleanup with review-first safeguards.</p>
        </div>
        <nav className="mt-5 space-y-1.5">
          {nav.map(([view, Icon, label]) => (
            <button
              key={view}
              onClick={() => setActiveView(view)}
              className={cn(
                "group flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-slate-500 transition dark:text-slate-400",
                activeView === view
                  ? "bg-teal-50 text-teal-800 ring-1 ring-teal-200 dark:bg-teal-400/14 dark:text-teal-100 dark:ring-teal-300/25"
                  : "hover:bg-slate-100 hover:text-slate-950 dark:hover:bg-slate-800/70 dark:hover:text-white"
              )}
            >
              <span
                className={cn(
                  "grid size-8 place-items-center rounded-md border transition",
                  activeView === view
                    ? "border-teal-200 bg-white text-teal-700 shadow-sm dark:border-teal-300/20 dark:bg-teal-300/10 dark:text-teal-200"
                    : "border-transparent bg-transparent text-slate-400 group-hover:border-slate-200 group-hover:bg-white group-hover:text-slate-700 dark:text-slate-500 dark:group-hover:border-slate-700 dark:group-hover:bg-slate-900 dark:group-hover:text-slate-200"
                )}
              >
                <Icon className="size-4" />
              </span>
              {label}
            </button>
          ))}
        </nav>
        <div className="mt-auto space-y-3">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-400">
            <div className="mb-3 flex items-center gap-2 font-medium text-slate-900 dark:text-violet-100">
              <Rocket className="size-4 text-teal-600 dark:text-violet-300" />
              {mode === "safe" ? "Safe Mode" : "Advanced Mode"}
            </div>
            <button
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-left font-medium text-teal-700 transition hover:border-teal-300 hover:text-teal-900 dark:border-slate-700 dark:bg-slate-950/70 dark:text-cyan-300 dark:hover:border-cyan-300/40 dark:hover:text-cyan-100"
              onClick={() => void updateSetting("mode", nextMode)}
            >
              Switch to {nextMode === "safe" ? "Safe" : "Advanced"}
            </button>
          </div>
          <button
            type="button"
            onClick={() => void updateSetting("theme", nextTheme)}
            className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white p-3 text-sm font-medium text-slate-700 transition hover:border-teal-300 hover:text-slate-950 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-300 dark:hover:border-cyan-300/35 dark:hover:text-white"
          >
            <span className="flex items-center gap-2">
              {theme === "dark" ? <Moon className="size-4 text-cyan-300" /> : <Sun className="size-4 text-amber-500" />}
              {theme === "dark" ? "Dark Mode" : "Light Mode"}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-500">Switch</span>
          </button>
        </div>
      </aside>
      <main className="flex h-screen min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200/80 bg-white/65 px-4 backdrop-blur md:px-6 dark:border-slate-800/70 dark:bg-slate-950/45">
          <div className="flex items-center gap-3 lg:hidden">
            <Logo compact />
            <span className="font-semibold">DevSweep</span>
          </div>
          <div className="hidden items-center gap-2 rounded-md border border-teal-200 bg-teal-50 px-3 py-2 text-xs text-teal-800 dark:border-violet-400/25 dark:bg-violet-500/15 dark:text-violet-100 lg:flex">
            <Sparkles className="size-4 text-teal-600 dark:text-violet-200" />
            {mode === "safe" ? "Safe Mode" : "Advanced Mode"}
          </div>
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden items-center gap-3 text-right text-xs text-slate-500 dark:text-slate-400 md:flex">
              <div>
                <div className="font-medium text-slate-900 dark:text-slate-100">System Disk</div>
                <div>{diskLabel}</div>
              </div>
              <div className="grid size-10 place-items-center rounded-full border-2 border-teal-400 text-[11px] font-semibold text-teal-700 dark:border-cyan-300 dark:text-cyan-200">{usedPercent}%</div>
            </div>
            <Button variant="ghost" className="size-10 px-0" aria-label="Notifications">
              <Bell className="size-4" />
            </Button>
            <Button variant="ghost" className="size-10 px-0" aria-label="Settings" onClick={() => setActiveView("settings")}>
              <Cog className="size-4" />
            </Button>
          </div>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6">{children}</div>
        <div className="flex shrink-0 justify-around border-t border-slate-200 bg-white/90 p-2 dark:border-slate-800 dark:bg-slate-950/85 lg:hidden">
          {nav.map(([view, Icon, label]) => (
            <button key={view} onClick={() => setActiveView(view)} className={cn("rounded-md p-2 text-slate-500 dark:text-slate-400", activeView === view && "text-teal-700 dark:text-cyan-200")}>
              <Icon className="mx-auto size-5" />
              <span className="text-[10px]">{label}</span>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}
