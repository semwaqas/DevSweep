export type RiskLevel = "info" | "safe" | "medium" | "advanced" | "dangerous";

export type CleanupCategory =
  | "dev-projects"
  | "package-managers"
  | "ai-editors"
  | "mobile-development"
  | "xcode"
  | "docker"
  | "system"
  | "large-files";

export type Platform = "macos" | "windows" | "linux";

export type ScanType = "pattern" | "fixed-paths" | "fixed-path-children" | "command" | "scan-only";

export interface CleanupTarget {
  id: string;
  title: string;
  description: string;
  category: CleanupCategory;
  risk: RiskLevel;
  platform: Platform[];
  scanType: ScanType;
  patterns?: string[];
  paths?: string[];
  commandId?: string;
  defaultSelected: boolean;
  requiresConfirmation: boolean;
  requiresTypedConfirmation: boolean;
  isDeleteDisabled?: boolean;
  warning?: string;
}

export interface ScanItem {
  id: string;
  path: string;
  name: string;
  bytes: number;
  itemType: "file" | "folder" | "command" | "virtual";
  canDelete: boolean;
  risk: RiskLevel;
  warning?: string;
}

export interface ScanResult {
  targetId: string;
  title: string;
  category: CleanupCategory;
  risk: RiskLevel;
  items: ScanItem[];
  totalBytes: number;
  itemCount: number;
  defaultSelected: boolean;
  warnings: string[];
}

export interface CleanupRequest {
  selectedTargetIds: string[];
  selectedItemIds: string[];
  moveToTrash: boolean;
  typedConfirmation?: string;
  mode: "safe" | "advanced" | "full" | "custom";
}

export interface CleanupProgress {
  sessionId: string;
  currentItem: string;
  currentPath: string;
  completedItems: number;
  totalItems: number;
  recoveredBytes: number;
  status: "pending" | "running" | "warning" | "error" | "completed" | "cancelled";
  message: string;
}

export interface CleanupReport {
  sessionId: string;
  startedAt: string;
  completedAt: string;
  recoveredBytes: number;
  cleanedItems: number;
  skippedItems: number;
  failedItems: number;
  warnings: string[];
  errors: string[];
}
