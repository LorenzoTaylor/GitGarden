use axum::{
    Json,
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
};
use tracing::error;
use uuid::Uuid;

use crate::AppState;
use crate::auth::extractor::OptionalAuthUser;
use crate::models::outfit::{CreateOutfitRequest, CreateOutfitResponse, Outfit};

pub async fn get_outfit(
    State(state): State<AppState>,
    Path(uuid): Path<Uuid>,
) -> Result<Json<Outfit>, StatusCode> {
    let outfit = sqlx::query_as::<_, Outfit>(
        "SELECT id, clothes, colors, user_id FROM outfits WHERE id = $1",
    )
    .bind(uuid)
    .fetch_optional(&state.pool)
    .await
    .map_err(|e| {
        error!("DB error in get_outfit {}: {}", uuid, e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?
    .ok_or(StatusCode::NOT_FOUND)?;

    Ok(Json(outfit))
}

pub async fn create_outfit(
    State(state): State<AppState>,
    auth: OptionalAuthUser,
    Json(payload): Json<CreateOutfitRequest>,
) -> Result<impl IntoResponse, StatusCode> {
    let id: Uuid = sqlx::query_scalar(
        "INSERT INTO outfits (clothes, colors, user_id) VALUES ($1, $2, $3) RETURNING id",
    )
    .bind(&payload.clothes)
    .bind(&payload.colors)
    .bind(auth.user_id)
    .fetch_one(&state.pool)
    .await
    .map_err(|e| {
        error!("DB error in create_outfit: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    Ok((StatusCode::CREATED, Json(CreateOutfitResponse { id })))
}
