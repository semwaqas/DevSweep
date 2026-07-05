use anyhow::{anyhow, Result};
use std::path::Path;

pub fn move_to_trash(path: &Path) -> Result<()> {
    if !path.exists() {
        return Err(anyhow!("Path does not exist"));
    }

    trash::delete(path)?;
    Ok(())
}
