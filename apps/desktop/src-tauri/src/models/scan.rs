use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CleanupTargetInput {
    pub id: String,
    pub title: String,
    pub category: String,
    pub risk: String,
    #[serde(rename = "scanType")]
    pub scan_type: String,
    pub patterns: Option<Vec<String>>,
    pub paths: Option<Vec<String>>,
    #[serde(rename = "commandId")]
    pub command_id: Option<String>,
    #[serde(rename = "defaultSelected")]
    pub default_selected: bool,
    #[serde(rename = "requiresConfirmation")]
    pub requires_confirmation: bool,
    #[serde(rename = "requiresTypedConfirmation")]
    pub requires_typed_confirmation: bool,
    #[serde(rename = "isDeleteDisabled")]
    pub is_delete_disabled: Option<bool>,
    pub warning: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScanItem {
    pub id: String,
    pub path: String,
    pub name: String,
    pub bytes: u64,
    #[serde(rename = "itemType")]
    pub item_type: String,
    #[serde(rename = "canDelete")]
    pub can_delete: bool,
    pub risk: String,
    pub warning: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScanResult {
    #[serde(rename = "targetId")]
    pub target_id: String,
    pub title: String,
    pub category: String,
    pub risk: String,
    pub items: Vec<ScanItem>,
    #[serde(rename = "totalBytes")]
    pub total_bytes: u64,
    #[serde(rename = "itemCount")]
    pub item_count: usize,
    #[serde(rename = "defaultSelected")]
    pub default_selected: bool,
    pub warnings: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScanProgress {
    pub target: String,
    pub path: String,
    #[serde(rename = "itemsFound")]
    pub items_found: usize,
    #[serde(rename = "estimatedBytes")]
    pub estimated_bytes: u64,
}
