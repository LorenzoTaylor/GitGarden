use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use uuid::Uuid;

use crate::auth::extractor::OptionalAuthUser;
use crate::models::outfit::{CreateOutfitRequest, CreateOutfitResponse, Outfit};
use crate::AppState;

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
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
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
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok((StatusCode::CREATED, Json(CreateOutfitResponse { id })))
}
