use crate::models::scan::{CleanupTargetInput, ScanResult};
use crate::services::scanner::{self, ScanOptions};
use crate::utils::{paths, size};
use tauri::AppHandle;

#[tauri::command]
pub async fn scan_cleanup_targets(
    app: AppHandle,
    targets: Vec<CleanupTargetInput>,
    base_path: String,
    _mode: String,
    show_hidden_folders: Option<bool>,
    ignored_paths: Option<Vec<String>>,
) -> Result<Vec<ScanResult>, String> {
    let options = ScanOptions {
        show_hidden_folders: show_hidden_folders.unwrap_or(false),
        ignored_paths: ignored_paths.unwrap_or_default(),
    };
    Ok(targets.iter().map(|target| scanner::scan_target(&app, target, &base_path, &options)).collect())
}

#[tauri::command]
pub async fn scan_path_size(path: String) -> Result<u64, String> {
    Ok(size::path_size(&paths::expand_home(&path)))
}

#[tauri::command]
pub async fn find_by_patterns(base_path: String, patterns: Vec<String>) -> Result<Vec<String>, String> {
    let base = paths::expand_home(&base_path);
    Ok(scanner::find_patterns(&base, &patterns, &ScanOptions::default())
        .iter()
        .map(|entry| paths::display_path(entry.path()))
        .collect())
}
