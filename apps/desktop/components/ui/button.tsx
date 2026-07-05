"use client";

import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger";

export function Button({ className, variant = "primary", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={cn(
        "inline-flex h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium transition duration-200 focus:outline-none focus:ring-2 focus:ring-teal-300/50 disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" && "bg-gradient-to-r from-teal-400 via-cyan-400 to-blue-500 text-slate-950 shadow-glow hover:brightness-105",
        variant === "secondary" && "border border-slate-200 bg-white/80 text-slate-800 hover:border-teal-300/60 hover:bg-teal-50 dark:border-slate-600/80 dark:bg-slate-800/75 dark:text-slate-100 dark:hover:border-teal-300/50 dark:hover:bg-slate-700/80",
        variant === "ghost" && "text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800/75 dark:hover:text-white",
        variant === "danger" && "border border-red-500/40 bg-red-500/10 text-red-200 hover:bg-red-500/20",
        className
      )}
      {...props}
    />
  );
}
