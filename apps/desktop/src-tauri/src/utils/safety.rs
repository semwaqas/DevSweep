use std::path::Path;

pub fn is_protected_path(path: &Path) -> bool {
    let raw = path.display().to_string();
    raw == "/"
        || raw == "/System"
        || raw == "/Library"
        || raw == "/Applications"
        || raw.starts_with("/System/")
        || raw.starts_with("/Library/")
        || raw.starts_with("/Applications/")
}

pub fn is_dangerous_risk(risk: &str) -> bool {
    risk == "dangerous"
}

pub fn is_dangerous_target(target_id: &str) -> bool {
    matches!(target_id, "xcode_archives" | "ios_simulator_devices" | "docker_prune_with_volumes")
}

pub fn is_cleanup_disabled_target(target_id: &str) -> bool {
    matches!(target_id, "docker_prune_with_volumes" | "large_files")
}

pub fn is_allowed_cleanup_item(target_id: &str, item_path: &Path, item_type: Option<&str>) -> bool {
    if item_type == Some("command") {
        return matches!(
            (target_id, item_path.to_string_lossy().as_ref()),
            ("npm_cache_clean", "npm_cache_clean")
                | ("pnpm_store_prune", "pnpm_store_prune")
                | ("yarn_cache_clean", "yarn_cache_clean")
                | ("docker_prune_without_volumes", "docker_prune_without_volumes")
                | ("docker_prune_with_volumes", "docker_prune_with_volumes")
        );
    }

    if is_protected_path(item_path) {
        return false;
    }

    let raw = item_path.display().to_string();
    let Some(home) = dirs::home_dir() else {
        return false;
    };

    match target_id {
        "node_modules" => item_path.file_name().is_some_and(|name| name == "node_modules"),
        "next_builds" => item_path.file_name().is_some_and(|name| name == ".next"),
        "build_folders" => item_path.file_name().is_some_and(|name| matches!(name.to_string_lossy().as_ref(), "dist" | "build" | "out")),
        "turbo_cache" => item_path.file_name().is_some_and(|name| name == ".turbo"),
        "cursor_cache" => raw.ends_with("/Library/Application Support/Cursor/Cache") || raw.ends_with("/Library/Application Support/Cursor/CachedData"),
        "codeium_cache" => item_path == home.join(".codeium"),
        "gradle_cache" => item_path == home.join(".gradle/caches"),
        "flutter_dart_cache" => {
            item_path == home.join(".pub-cache") || item_path == home.join(".dartServer") || item_path == home.join(".dart-tool")
        }
        "xcode_derived_data" => item_path == home.join("Library/Developer/Xcode/DerivedData"),
        "xcode_archives" => item_path == home.join("Library/Developer/Xcode/Archives"),
        "ios_simulator_devices" => item_path == home.join("Library/Developer/CoreSimulator/Devices"),
        "user_logs" => item_path.starts_with(home.join("Library/Logs")),
        "user_cache" => item_path.starts_with(home.join("Library/Caches")),
        _ => false,
    }
}
