import { Box } from "lucide-react";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative grid size-9 place-items-center rounded-lg bg-gradient-to-br from-cyan-300 via-blue-600 to-violet-600 shadow-glow">
        <Box className="size-5 text-white" />
      </div>
      {!compact && (
        <div className="text-lg font-semibold tracking-tight">
          Dev<span className="text-cyan-300">Sweep</span>
        </div>
      )}
    </div>
  );
}
