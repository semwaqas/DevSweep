# DevSweep

DevSweep is a cross-platform desktop app for reclaiming developer disk space safely. The macOS-first MVP scans developer folders, package caches, editor caches, mobile tooling caches, Docker artifacts, and large files, then asks for explicit confirmation before anything is moved to Trash.

## Stack

- Tauri v2
- Next.js static export
- TypeScript
- Tailwind CSS
- shadcn-style primitives
- Framer Motion
- Zustand
- Rust
- SQLite

## Development

```bash
pnpm install
pnpm dev
```

For Tauri:

```bash
pnpm --filter @devsweep/desktop tauri dev
```
# DevSweep
# DevSweep
