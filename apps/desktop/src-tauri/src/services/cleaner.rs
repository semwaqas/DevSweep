use crate::models::cleanup::{CleanupProgress, CleanupReport, CleanupRequest};
use crate::services::{commands_runner, database, trash};
use crate::utils::{paths, safety};
use anyhow::{anyhow, Result};
use chrono::Utc;
use tauri::{AppHandle, Emitter};
use uuid::Uuid;

pub fn cleanup(app: &AppHandle, request: CleanupRequest) -> Result<CleanupReport> {
    if !request.move_to_trash {
        return Err(anyhow!("Permanent deletion is disabled. DevSweep only moves files to Trash."));
    }

    if request.items.iter().any(|item| safety::is_dangerous_risk(&item.risk) || safety::is_dangerous_target(&item.target_id)) && request.typed_confirmation.as_deref() != Some("CLEAN") {
        return Err(anyhow!("Dangerous cleanup requires typed confirmation"));
    }

    let session_id = Uuid::new_v4().to_string();
    let started = Utc::now();
    app.emit("cleanup-started", &session_id).ok();

    let mut recovered = 0;
    let mut cleaned = 0;
    let mut skipped = 0;
    let mut failed = 0;
    let mut warnings = Vec::new();
    let mut errors = Vec::new();
    let total = request.items.len();

    for (index, item) in request.items.iter().enumerate() {
        let path = paths::expand_home(&item.path);
        emit_progress(app, &session_id, item, index, total, recovered, "running", "Cleaning item");

        let selected = request.selected_item_ids.contains(&item.id) && request.selected_target_ids.contains(&item.target_id);
        if !selected
            || !item.can_delete
            || safety::is_cleanup_disabled_target(&item.target_id)
            || safety::is_protected_path(&path)
            || !safety::is_allowed_cleanup_item(&item.target_id, &path, item.item_type.as_deref())
        {
            skipped += 1;
            warnings.push(format!("Skipped unsafe, protected, or disabled path: {}", item.path));
            save_item(app, &session_id, item, "skipped", "Unsafe, protected, or disabled path")?;
            app.emit("cleanup-warning", &item.path).ok();
            continue;
        }

        let result = if item.item_type.as_deref() == Some("command") {
            commands_runner::run_safe_command(&item.path).map(|_| ())
        } else {
            trash::move_to_trash(&path)
        };

        match result {
            Ok(_) => {
                recovered += item.bytes;
                cleaned += 1;
                save_item(app, &session_id, item, "cleaned", "Completed")?;
                app.emit("cleanup-item-completed", &item.id).ok();
            }
            Err(error) => {
                failed += 1;
                errors.push(format!("{}: {}", item.path, error));
                save_item(app, &session_id, item, "failed", &error.to_string())?;
                app.emit("cleanup-error", error.to_string()).ok();
            }
        }
    }

    let completed = Utc::now();
    let report = CleanupReport {
        session_id: session_id.clone(),
        started_at: started.to_rfc3339(),
        completed_at: completed.to_rfc3339(),
        recovered_bytes: recovered,
        cleaned_items: cleaned,
        skipped_items: skipped,
        failed_items: failed,
        warnings,
        errors,
    };

    save_report(app, &request.mode, &report, (completed - started).num_milliseconds())?;
    app.emit("cleanup-completed", &report).ok();
    Ok(report)
}

fn save_item(app: &AppHandle, session_id: &str, item: &crate::models::cleanup::CleanupItemRequest, status: &str, message: &str) -> Result<()> {
    let conn = database::connection(app)?;
    conn.execute(
        "INSERT INTO cleanup_items (id, session_id, target_id, path, bytes, status, risk, message, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
        (
            Uuid::new_v4().to_string(),
            session_id,
            &item.target_id,
            &item.path,
            item.bytes as i64,
            status,
            &item.risk,
            message,
            Utc::now().to_rfc3339(),
        ),
    )?;
    Ok(())
}

fn emit_progress(
    app: &AppHandle,
    session_id: &str,
    item: &crate::models::cleanup::CleanupItemRequest,
    index: usize,
    total: usize,
    recovered_bytes: u64,
    status: &str,
    message: &str,
) {
    app.emit(
        "cleanup-progress",
        CleanupProgress {
            session_id: session_id.to_string(),
            current_item: item.target_id.clone(),
            current_path: item.path.clone(),
            completed_items: index,
            total_items: total,
            recovered_bytes,
            status: status.to_string(),
            message: message.to_string(),
        },
    )
    .ok();
}

fn save_report(app: &AppHandle, mode: &str, report: &CleanupReport, duration_ms: i64) -> Result<()> {
    let conn = database::connection(app)?;
    conn.execute(
        "INSERT INTO cleanup_sessions (id, started_at, completed_at, mode, recovered_bytes, cleaned_count, skipped_count, failed_count, duration_ms, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
        (
            &report.session_id,
            &report.started_at,
            &report.completed_at,
            mode,
            report.recovered_bytes as i64,
            report.cleaned_items as i64,
            report.skipped_items as i64,
            report.failed_items as i64,
            duration_ms,
            Utc::now().to_rfc3339(),
        ),
    )?;
    Ok(())
}
