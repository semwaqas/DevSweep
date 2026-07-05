mod commands;
mod models;
mod services;
mod utils;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            services::database::init_database(app.handle())?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::system::get_system_info,
            commands::scan::scan_cleanup_targets,
            commands::scan::scan_path_size,
            commands::scan::find_by_patterns,
            commands::cleanup::cleanup_selected_items,
            commands::shell::run_safe_command,
            commands::history::get_cleanup_history,
            commands::history::get_cleanup_session,
            commands::history::clear_cleanup_history,
            commands::settings::get_settings,
            commands::settings::save_settings,
            commands::settings::add_ignored_path,
            commands::settings::remove_ignored_path
        ])
        .run(tauri::generate_context!())
        .expect("error while running DevSweep");
}
