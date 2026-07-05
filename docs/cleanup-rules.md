# Cleanup Rules

DevSweep scans first, explains each target, and only cleans selected items after review.

Version 1 focuses on macOS:

- Dev Projects: `node_modules`, `.next`, `dist`, `build`, `out`, `.turbo`
- Package Managers: npm cache, pnpm store prune, yarn cache
- AI Editors: Cursor cache, Codeium cache
- Mobile Development: Gradle cache, Flutter/Dart cache
- Xcode: DerivedData, Archives, Simulator Devices
- Docker: system prune, volumes prune
- System: user logs, user caches
- Large Files: scan-only finder

Dangerous targets are never selected by default and require typed confirmation.
