use crate::services::database;
use chrono::Utc;
use serde_json::Value;
use tauri::AppHandle;
use uuid::Uuid;

#[tauri::command]
pub async fn get_settings(app: AppHandle) -> Result<Value, String> {
    let conn = database::connection(&app).map_err(|error| error.to_string())?;
    let mut stmt = conn
        .prepare("SELECT key, value FROM settings")
        .map_err(|error| error.to_string())?;
    let rows = stmt
        .query_map([], |row| Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?)))
        .map_err(|error| error.to_string())?;

    let mut map = serde_json::Map::new();
    for row in rows {
        let (key, value) = row.map_err(|error| error.to_string())?;
        map.insert(key, serde_json::from_str(&value).unwrap_or(Value::String(value)));
    }

    let ignored = get_ignored_paths(&app)?;
    map.insert("ignoredPaths".to_string(), Value::Array(ignored.into_iter().map(Value::String).collect()));
    Ok(Value::Object(map))
}

#[tauri::command]
pub async fn save_settings(app: AppHandle, settings: Value) -> Result<(), String> {
    let conn = database::connection(&app).map_err(|error| error.to_string())?;
    let object = settings.as_object().ok_or_else(|| "Settings must be an object".to_string())?;

    for (key, value) in object {
        if key == "ignoredPaths" {
            continue;
        }

        conn.execute(
            "INSERT INTO settings (key, value, updated_at) VALUES (?1, ?2, ?3)
             ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
            (key, value.to_string(), Utc::now().to_rfc3339()),
        )
        .map_err(|error| error.to_string())?;
    }

    Ok(())
}

#[tauri::command]
pub async fn add_ignored_path(app: AppHandle, path: String) -> Result<(), String> {
    let conn = database::connection(&app).map_err(|error| error.to_string())?;
    conn.execute(
        "INSERT OR IGNORE INTO ignored_paths (id, path, created_at) VALUES (?1, ?2, ?3)",
        (Uuid::new_v4().to_string(), path, Utc::now().to_rfc3339()),
    )
    .map_err(|error| error.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn remove_ignored_path(app: AppHandle, path: String) -> Result<(), String> {
    let conn = database::connection(&app).map_err(|error| error.to_string())?;
    conn.execute("DELETE FROM ignored_paths WHERE path = ?1", [path])
        .map_err(|error| error.to_string())?;
    Ok(())
}

fn get_ignored_paths(app: &AppHandle) -> Result<Vec<String>, String> {
    let conn = database::connection(app).map_err(|error| error.to_string())?;
    let mut stmt = conn.prepare("SELECT path FROM ignored_paths ORDER BY path").map_err(|error| error.to_string())?;
    let rows = stmt.query_map([], |row| row.get(0)).map_err(|error| error.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|error| error.to_string())
}
