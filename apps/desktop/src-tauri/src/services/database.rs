use anyhow::Result;
use rusqlite::Connection;
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

pub fn db_path(app: &AppHandle) -> Result<PathBuf> {
    let dir = app.path().app_data_dir()?;
    fs::create_dir_all(&dir)?;
    Ok(dir.join("devsweep.db"))
}

pub fn connection(app: &AppHandle) -> Result<Connection> {
    Ok(Connection::open(db_path(app)?)?)
}

pub fn init_database(app: &AppHandle) -> Result<()> {
    let conn = connection(app)?;
    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS cleanup_sessions (
          id TEXT PRIMARY KEY,
          started_at TEXT NOT NULL,
          completed_at TEXT NOT NULL,
          mode TEXT NOT NULL,
          recovered_bytes INTEGER NOT NULL,
          cleaned_count INTEGER NOT NULL,
          skipped_count INTEGER NOT NULL,
          failed_count INTEGER NOT NULL,
          duration_ms INTEGER NOT NULL,
          created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS cleanup_items (
          id TEXT PRIMARY KEY,
          session_id TEXT NOT NULL,
          target_id TEXT NOT NULL,
          path TEXT NOT NULL,
          bytes INTEGER NOT NULL,
          status TEXT NOT NULL,
          risk TEXT NOT NULL,
          message TEXT,
          created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS ignored_paths (
          id TEXT PRIMARY KEY,
          path TEXT UNIQUE NOT NULL,
          created_at TEXT NOT NULL
        );
        "
    )?;
    Ok(())
}
