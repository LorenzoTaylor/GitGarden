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
use crate::routes::render::get_or_render_card;

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

    // Pre-warm the GIF cache in the background so the first README load is instant
    if let Some(user_id) = auth.user_id {
        let outfit = Outfit { id, clothes: payload.clothes, colors: payload.colors, user_id: Some(user_id) };
        let state_clone = state.clone();
        tokio::spawn(async move {
            let github_username: Option<String> =
                sqlx::query_scalar("SELECT github_username FROM users WHERE id = $1")
                    .bind(user_id)
                    .fetch_optional(&state_clone.pool)
                    .await
                    .ok()
                    .flatten()
                    .flatten();
            if let Err(e) = get_or_render_card(&state_clone, Some(outfit), Some(id), github_username).await {
                error!("Background pre-render failed for outfit {}: {:?}", id, e);
            }
        });
    }

    Ok((StatusCode::CREATED, Json(CreateOutfitResponse { id })))
}
