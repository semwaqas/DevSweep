export function currentPlatform(): "macos" | "windows" | "linux" {
  if (typeof navigator === "undefined") return "macos";
  const platform = navigator.platform.toLowerCase();
  if (platform.includes("win")) return "windows";
  if (platform.includes("linux")) return "linux";
  return "macos";
}
