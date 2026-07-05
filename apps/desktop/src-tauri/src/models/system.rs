use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemInfo {
    pub os: String,
    pub arch: String,
    pub username: String,
    #[serde(rename = "homeDir")]
    pub home_dir: String,
    #[serde(rename = "defaultDevFolders")]
    pub default_dev_folders: Vec<String>,
    #[serde(rename = "totalDiskSpace")]
    pub total_disk_space: u64,
    #[serde(rename = "availableDiskSpace")]
    pub available_disk_space: u64,
}
