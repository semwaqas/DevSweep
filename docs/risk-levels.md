# Risk Levels

- Info: informational and scan-only.
- Safe: normally regeneratable files such as build output or low-risk cache.
- Medium: regeneratable, but may require reinstalling dependencies or rebuilding projects.
- Advanced: affects developer tooling caches, simulator data, or heavier system caches.
- Dangerous: can remove backups, Docker volumes, archives, databases, or important local state.

The frontend must surface risk badges and the Rust backend must validate dangerous operations before cleanup.
