use axum::{extract::State, http::StatusCode, Json};
use serde::Deserialize;
use uuid::Uuid;

use crate::auth::extractor::AuthUser;
use crate::models::outfit::Outfit;
use crate::AppState;

#[derive(Deserialize)]
pub struct SetCurrentOutfitRequest {
    pub outfit_id: Uuid,
}

pub async fn list_outfits(
    State(state): State<AppState>,
    auth: AuthUser,
) -> Result<Json<Vec<Outfit>>, StatusCode> {
    let outfits = sqlx::query_as::<_, Outfit>(
        "SELECT id, clothes, colors, user_id FROM outfits WHERE user_id = $1 ORDER BY created_at DESC",
    )
    .bind(auth.user_id)
    .fetch_all(&state.pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(outfits))
}

pub async fn set_current_outfit(
    State(state): State<AppState>,
    auth: AuthUser,
    Json(payload): Json<SetCurrentOutfitRequest>,
) -> Result<StatusCode, StatusCode> {
    sqlx::query("UPDATE users SET current_outfit_id = $1 WHERE id = $2")
        .bind(payload.outfit_id)
        .bind(auth.user_id)
        .execute(&state.pool)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(StatusCode::OK)
}
