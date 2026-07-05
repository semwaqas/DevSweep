use crate::models::cleanup::{CleanupReport, CleanupRequest};
use crate::services::cleaner;
use tauri::AppHandle;

#[tauri::command]
pub async fn cleanup_selected_items(app: AppHandle, request: CleanupRequest) -> Result<CleanupReport, String> {
    cleaner::cleanup(&app, request).map_err(|error| error.to_string())
}
