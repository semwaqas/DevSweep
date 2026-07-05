import type { RiskLevel } from "../types";

export const riskLabels: Record<RiskLevel, string> = {
  info: "Info",
  safe: "Safe",
  medium: "Medium",
  advanced: "Advanced",
  dangerous: "Dangerous"
};

export const riskDescriptions: Record<RiskLevel, string> = {
  info: "Informational only. Review manually.",
  safe: "Usually safe. These files can normally be regenerated.",
  medium: "Can be regenerated, but may require reinstalling dependencies or rebuilding projects.",
  advanced: "Review carefully. May affect developer tools, simulator data, or build archives.",
  dangerous: "Can delete backups, databases, Docker volumes, or important local data."
};
