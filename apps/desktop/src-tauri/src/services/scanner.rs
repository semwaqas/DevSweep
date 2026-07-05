use crate::models::scan::{CleanupTargetInput, ScanItem, ScanProgress, ScanResult};
use crate::utils::{paths, size};
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Emitter};
use uuid::Uuid;
use walkdir::{DirEntry, WalkDir};

#[derive(Debug, Clone, Default)]
pub struct ScanOptions {
    pub show_hidden_folders: bool,
    pub ignored_paths: Vec<String>,
}

pub fn scan_target(app: &AppHandle, target: &CleanupTargetInput, base_path: &str, options: &ScanOptions) -> ScanResult {
    let mut warnings = Vec::new();
    let mut items = Vec::new();
    emit_progress(app, target, &paths::expand_home(base_path), 0, 0);

    match target.scan_type.as_str() {
        "pattern" => {
            let base = paths::expand_home(base_path);
            if !base.exists() {
                warnings.push(format!("Base folder does not exist: {}", base.display()));
            }
            if let Some(patterns) = &target.patterns {
                for entry in find_patterns(&base, patterns, options) {
                    let bytes = size::path_size(entry.path());
                    items.push(scan_item(target, entry.path(), bytes, "folder"));
                    emit_progress(app, target, entry.path(), items.len(), bytes);
                }
            }
        }
        "fixed-paths" => {
            for raw_path in target.paths.clone().unwrap_or_default() {
                let path = paths::expand_home(&raw_path);
                if path.exists() && !is_ignored(&path, options) {
                    let bytes = size::path_size(&path);
                    items.push(scan_item(target, &path, bytes, if path.is_file() { "file" } else { "folder" }));
                    emit_progress(app, target, &path, items.len(), bytes);
                }
            }
        }
        "fixed-path-children" => {
            for raw_path in target.paths.clone().unwrap_or_default() {
                let path = paths::expand_home(&raw_path);
                if let Ok(children) = std::fs::read_dir(&path) {
                    for child in children.flatten() {
                        let child_path = child.path();
                        if is_ignored(&child_path, options) || (!options.show_hidden_folders && is_hidden(&child_path)) {
                            continue;
                        }
                        let bytes = size::path_size(&child_path);
                        items.push(scan_item(target, &child_path, bytes, if child_path.is_file() { "file" } else { "folder" }));
                        emit_progress(app, target, &child_path, items.len(), bytes);
                    }
                }
            }
        }
        "command" => {
            items.push(ScanItem {
                id: Uuid::new_v4().to_string(),
                path: target.command_id.clone().unwrap_or_else(|| target.id.clone()),
                name: target.title.clone(),
                bytes: 0,
                item_type: "command".to_string(),
                can_delete: true,
                risk: target.risk.clone(),
                warning: target.warning.clone(),
            });
        }
        "scan-only" => {
            warnings.push("Scan-only target. Deletion is disabled by default.".to_string());
            for raw_path in target.paths.clone().unwrap_or_default() {
                let base = paths::expand_home(&raw_path);
                for file in find_large_files(&base, 1024 * 1024 * 1024, options).into_iter().take(100) {
                    let bytes = size::path_size(&file);
                    items.push(scan_item(target, &file, bytes, "file"));
                    emit_progress(app, target, &file, items.len(), bytes);
                }
            }
        }
        _ => warnings.push(format!("Unsupported scan type {}", target.scan_type)),
    }

    let total_bytes = items.iter().map(|item| item.bytes).sum();
    ScanResult {
        target_id: target.id.clone(),
        title: target.title.clone(),
        category: target.category.clone(),
        risk: target.risk.clone(),
        item_count: items.len(),
        default_selected: target.default_selected && !target.is_delete_disabled.unwrap_or(false),
        warnings,
        total_bytes,
        items,
    }
}

pub fn find_patterns(base: &Path, patterns: &[String], options: &ScanOptions) -> Vec<DirEntry> {
    WalkDir::new(base)
        .follow_links(false)
        .into_iter()
        .filter_entry(|entry| !should_skip(entry, options))
        .filter_map(Result::ok)
        .filter(|entry| entry.file_type().is_dir())
        .filter(|entry| {
            let name = entry.file_name().to_string_lossy();
            patterns.iter().any(|pattern| pattern == &name)
        })
        .collect()
}

pub fn find_large_files(base: &Path, minimum_bytes: u64, options: &ScanOptions) -> Vec<PathBuf> {
    WalkDir::new(base)
        .follow_links(false)
        .max_depth(8)
        .into_iter()
        .filter_entry(|entry| !should_skip(entry, options))
        .filter_map(Result::ok)
        .filter(|entry| entry.file_type().is_file())
        .filter_map(|entry| {
            let path = entry.path().to_path_buf();
            let bytes = entry.metadata().map(|meta| meta.len()).unwrap_or(0);
            (bytes >= minimum_bytes).then_some(path)
        })
        .collect()
}

fn should_skip(entry: &DirEntry, options: &ScanOptions) -> bool {
    let name = entry.file_name().to_string_lossy();
    name == ".git"
        || (!options.show_hidden_folders && entry.depth() > 0 && name.starts_with('.'))
        || name == "Library" && entry.depth() == 1
        || is_ignored(entry.path(), options)
}

fn is_ignored(path: &Path, options: &ScanOptions) -> bool {
    let display = paths::display_path(path);
    options.ignored_paths.iter().any(|ignored| display.starts_with(ignored) || path.starts_with(paths::expand_home(ignored)))
}

fn is_hidden(path: &Path) -> bool {
    path.file_name()
        .map(|name| name.to_string_lossy().starts_with('.'))
        .unwrap_or(false)
}

fn scan_item(target: &CleanupTargetInput, path: &Path, bytes: u64, item_type: &str) -> ScanItem {
    ScanItem {
        id: Uuid::new_v4().to_string(),
        path: paths::display_path(path),
        name: path.file_name().map(|name| name.to_string_lossy().to_string()).unwrap_or_else(|| target.title.clone()),
        bytes,
        item_type: item_type.to_string(),
        can_delete: !target.is_delete_disabled.unwrap_or(false),
        risk: target.risk.clone(),
        warning: target.warning.clone(),
    }
}

fn emit_progress(app: &AppHandle, target: &CleanupTargetInput, path: &Path, items_found: usize, estimated_bytes: u64) {
    let _ = app.emit(
        "scan-progress",
        ScanProgress {
            target: target.title.clone(),
            path: paths::display_path(path),
            items_found,
            estimated_bytes,
        },
    );
}
