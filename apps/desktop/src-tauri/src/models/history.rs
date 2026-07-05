use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CleanupSessionSummary {
    pub id: String,
    #[serde(rename = "startedAt")]
    pub started_at: String,
    #[serde(rename = "completedAt")]
    pub completed_at: String,
    pub mode: String,
    #[serde(rename = "recoveredBytes")]
    pub recovered_bytes: i64,
    #[serde(rename = "cleanedCount")]
    pub cleaned_count: i64,
    #[serde(rename = "skippedCount")]
    pub skipped_count: i64,
    #[serde(rename = "failedCount")]
    pub failed_count: i64,
    #[serde(rename = "durationMs")]
    pub duration_ms: i64,
}
