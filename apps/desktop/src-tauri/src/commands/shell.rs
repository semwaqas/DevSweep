use crate::services::commands_runner;

#[tauri::command]
pub async fn run_safe_command(command_id: String) -> Result<String, String> {
    commands_runner::run_safe_command(&command_id).map_err(|error| error.to_string())
}
