use crate::models::system::SystemInfo;
use std::ffi::CString;

#[tauri::command]
pub fn get_system_info() -> SystemInfo {
    let home = dirs::home_dir().unwrap_or_default();
    let username = home
        .file_name()
        .map(|name| name.to_string_lossy().to_string())
        .unwrap_or_else(|| "developer".to_string());

    let default_dev_folders = ["Development", "Projects", "Code"]
        .iter()
        .map(|folder| home.join(folder).display().to_string())
        .collect();
    let (total_disk_space, available_disk_space) = disk_space_for_path(&home);

    SystemInfo {
        os: std::env::consts::OS.to_string(),
        arch: std::env::consts::ARCH.to_string(),
        username,
        home_dir: home.display().to_string(),
        default_dev_folders,
        total_disk_space,
        available_disk_space,
    }
}

fn disk_space_for_path(path: &std::path::Path) -> (u64, u64) {
    let Some(path_string) = path.to_str() else {
        return (0, 0);
    };
    let Ok(c_path) = CString::new(path_string) else {
        return (0, 0);
    };

    let mut stats = std::mem::MaybeUninit::<libc::statfs>::uninit();
    let result = unsafe { libc::statfs(c_path.as_ptr(), stats.as_mut_ptr()) };
    if result != 0 {
        return (0, 0);
    }

    let stats = unsafe { stats.assume_init() };
    let block_size = stats.f_bsize as u64;
    let total = stats.f_blocks.saturating_mul(block_size);
    let available = stats.f_bavail.saturating_mul(block_size);
    (total, available)
}
