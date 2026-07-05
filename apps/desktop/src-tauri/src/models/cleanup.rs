use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CleanupRequest {
    #[serde(rename = "selectedTargetIds")]
    pub selected_target_ids: Vec<String>,
    #[serde(rename = "selectedItemIds")]
    pub selected_item_ids: Vec<String>,
    #[serde(rename = "moveToTrash")]
    pub move_to_trash: bool,
    #[serde(rename = "typedConfirmation")]
    pub typed_confirmation: Option<String>,
    pub mode: String,
    pub items: Vec<CleanupItemRequest>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CleanupItemRequest {
    pub id: String,
    #[serde(rename = "targetId")]
    pub target_id: String,
    pub path: String,
    pub bytes: u64,
    pub risk: String,
    #[serde(rename = "itemType")]
    pub item_type: Option<String>,
    #[serde(rename = "canDelete")]
    pub can_delete: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CleanupProgress {
    #[serde(rename = "sessionId")]
    pub session_id: String,
    #[serde(rename = "currentItem")]
    pub current_item: String,
    #[serde(rename = "currentPath")]
    pub current_path: String,
    #[serde(rename = "completedItems")]
    pub completed_items: usize,
    #[serde(rename = "totalItems")]
    pub total_items: usize,
    #[serde(rename = "recoveredBytes")]
    pub recovered_bytes: u64,
    pub status: String,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CleanupReport {
    #[serde(rename = "sessionId")]
    pub session_id: String,
    #[serde(rename = "startedAt")]
    pub started_at: String,
    #[serde(rename = "completedAt")]
    pub completed_at: String,
    #[serde(rename = "recoveredBytes")]
    pub recovered_bytes: u64,
    #[serde(rename = "cleanedItems")]
    pub cleaned_items: usize,
    #[serde(rename = "skippedItems")]
    pub skipped_items: usize,
    #[serde(rename = "failedItems")]
    pub failed_items: usize,
    pub warnings: Vec<String>,
    pub errors: Vec<String>,
}
