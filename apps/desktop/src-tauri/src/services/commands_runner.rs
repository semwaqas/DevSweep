use anyhow::{anyhow, Result};
use std::process::Command;

pub fn run_safe_command(command_id: &str) -> Result<String> {
    let (program, args): (&str, &[&str]) = match command_id {
        "npm_cache_clean" => ("npm", &["cache", "clean", "--force"]),
        "pnpm_store_prune" => ("pnpm", &["store", "prune"]),
        "yarn_cache_clean" => ("yarn", &["cache", "clean"]),
        "docker_prune_without_volumes" => ("docker", &["system", "prune", "-a", "-f"]),
        "docker_prune_with_volumes" => ("docker", &["system", "prune", "-a", "--volumes", "-f"]),
        _ => return Err(anyhow!("Unsupported command id")),
    };

    let output = Command::new(program).args(args).output()?;
    if !output.status.success() {
        return Err(anyhow!(String::from_utf8_lossy(&output.stderr).to_string()));
    }

    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}
