import type { CleanupTarget } from "../types";

const placeholder = (id: string, title: string, category: CleanupTarget["category"]): CleanupTarget => ({
  id,
  title,
  description: "Windows support placeholder for a future DevSweep release.",
  category,
  risk: "info",
  platform: ["windows"],
  scanType: "scan-only",
  defaultSelected: false,
  requiresConfirmation: false,
  requiresTypedConfirmation: false,
  isDeleteDisabled: true
});

export const windowsTargets: CleanupTarget[] = [
  placeholder("windows_npm_cache", "NPM Cache", "package-managers"),
  placeholder("windows_pnpm_store", "PNPM Store", "package-managers"),
  placeholder("windows_yarn_cache", "Yarn Cache", "package-managers"),
  placeholder("windows_cursor_cache", "Cursor Cache", "ai-editors"),
  placeholder("windows_vscode_cache", "VS Code Cache", "ai-editors"),
  placeholder("windows_temp", "Windows Temp", "system"),
  placeholder("windows_gradle_cache", "Gradle Cache", "mobile-development"),
  placeholder("windows_flutter_cache", "Flutter Cache", "mobile-development"),
  placeholder("windows_node_modules", "Node Modules", "dev-projects"),
  placeholder("windows_next_builds", "Next.js Builds", "dev-projects"),
  placeholder("windows_dist", "Dist Folders", "dev-projects"),
  placeholder("windows_build", "Build Folders", "dev-projects"),
  placeholder("windows_docker_desktop", "Docker Desktop Cache", "docker"),
  placeholder("windows_wsl_cleanup", "WSL Cleanup", "system")
];
