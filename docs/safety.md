# Safety

Hard rules:

- Do not run `sudo`.
- Do not accept arbitrary shell commands from the frontend.
- Do not delete system-level folders by default.
- Do not delete `/Library/Caches` by default.
- Do not delete full Cursor Application Support.
- Do not delete Docker volumes by default.
- Do not delete iPhone backups by default.
- Do not delete Xcode Archives by default.
- Do not follow symlinks by default.
- Prefer moving to Trash. If Trash fails, skip and report a warning for MVP.
