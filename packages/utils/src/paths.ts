export function compactHomePath(path: string, home = "~"): string {
  return path.replace(/^\/Users\/[^/]+/, home);
}
