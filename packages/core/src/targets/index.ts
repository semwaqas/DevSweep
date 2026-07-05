import type { Platform } from "../types";
import { macosTargets } from "./macos";
import { windowsTargets } from "./windows";

export const cleanupTargets = [...macosTargets, ...windowsTargets];

export function targetsForPlatform(platform: Platform) {
  return cleanupTargets.filter((target) => target.platform.includes(platform));
}
