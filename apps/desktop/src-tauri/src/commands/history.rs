use crate::models::history::CleanupSessionSummary;
use crate::services::database;
use tauri::AppHandle;

#[tauri::command]
pub async fn get_cleanup_history(app: AppHandle) -> Result<Vec<CleanupSessionSummary>, String> {
    let conn = database::connection(&app).map_err(|error| error.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT id, started_at, completed_at, mode, recovered_bytes, cleaned_count, skipped_count, failed_count, duration_ms
             FROM cleanup_sessions ORDER BY started_at DESC LIMIT 100",
        )
        .map_err(|error| error.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            Ok(CleanupSessionSummary {
                id: row.get(0)?,
                started_at: row.get(1)?,
                completed_at: row.get(2)?,
                mode: row.get(3)?,
                recovered_bytes: row.get(4)?,
                cleaned_count: row.get(5)?,
                skipped_count: row.get(6)?,
                failed_count: row.get(7)?,
                duration_ms: row.get(8)?,
            })
        })
        .map_err(|error| error.to_string())?;

    rows.collect::<Result<Vec<_>, _>>().map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn get_cleanup_session(app: AppHandle, session_id: String) -> Result<Option<CleanupSessionSummary>, String> {
    let conn = database::connection(&app).map_err(|error| error.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT id, started_at, completed_at, mode, recovered_bytes, cleaned_count, skipped_count, failed_count, duration_ms
             FROM cleanup_sessions WHERE id = ?1",
        )
        .map_err(|error| error.to_string())?;

    let mut rows = stmt
        .query_map([session_id], |row| {
            Ok(CleanupSessionSummary {
                id: row.get(0)?,
                started_at: row.get(1)?,
                completed_at: row.get(2)?,
                mode: row.get(3)?,
                recovered_bytes: row.get(4)?,
                cleaned_count: row.get(5)?,
                skipped_count: row.get(6)?,
                failed_count: row.get(7)?,
                duration_ms: row.get(8)?,
            })
        })
        .map_err(|error| error.to_string())?;

    rows.next().transpose().map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn clear_cleanup_history(app: AppHandle) -> Result<(), String> {
    let conn = database::connection(&app).map_err(|error| error.to_string())?;
    conn.execute("DELETE FROM cleanup_items", [])
        .map_err(|error| error.to_string())?;
    conn.execute("DELETE FROM cleanup_sessions", [])
        .map_err(|error| error.to_string())?;
    Ok(())
}
