use axum::{
    extract::{Path, Query, State},
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
    routing::get,
    Router,
};
use serde::Deserialize;
use uuid::Uuid;

use crate::models::outfit::Outfit;
use crate::sprite;
use crate::AppState;

async fn render_png(
    state: &AppState,
    outfit: Outfit,
    scale: u32,
) -> Result<impl IntoResponse + use<>, StatusCode> {
    let png_bytes = sprite::render_sprite(
        &outfit.clothes,
        &outfit.colors,
        &state.assets_dir,
        &state.sprite_cache,
        scale,
    )
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let mut headers = HeaderMap::new();
    headers.insert("Content-Type", "image/png".parse().unwrap());
    headers.insert("Cache-Control", "public, max-age=60".parse().unwrap());

    Ok((headers, png_bytes))
}

#[derive(Deserialize)]
pub struct SpriteQuery {
    scale: Option<u32>,
}

pub fn create_render_routes() -> Router<AppState> {
    Router::new()
        .route("/sprite/{uuid}", get(render_sprite_handler))
        .route("/user/{username}/sprite", get(render_active_sprite_handler))
}

async fn render_sprite_handler(
    State(state): State<AppState>,
    Path(uuid): Path<Uuid>,
    Query(query): Query<SpriteQuery>,
) -> Result<impl IntoResponse, StatusCode> {
    let scale = query.scale.unwrap_or(4).clamp(1, 8);

    let outfit = sqlx::query_as::<_, Outfit>(
        "SELECT id, clothes, colors, user_id FROM outfits WHERE id = $1",
    )
    .bind(uuid)
    .fetch_optional(&state.pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
    .ok_or(StatusCode::NOT_FOUND)?;

    render_png(&state, outfit, scale).await
}

async fn render_active_sprite_handler(
    State(state): State<AppState>,
    Path(username): Path<String>,
    Query(query): Query<SpriteQuery>,
) -> Result<impl IntoResponse, StatusCode> {
    let scale = query.scale.unwrap_or(4).clamp(1, 8);

    // Look up the user's current_outfit_id
    let outfit_id: Option<Uuid> = sqlx::query_scalar(
        "SELECT current_outfit_id FROM users WHERE username = $1",
    )
    .bind(&username)
    .fetch_optional(&state.pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
    .flatten();

    let outfit_id = outfit_id.ok_or(StatusCode::NOT_FOUND)?;

    let outfit = sqlx::query_as::<_, Outfit>(
        "SELECT id, clothes, colors, user_id FROM outfits WHERE id = $1",
    )
    .bind(outfit_id)
    .fetch_optional(&state.pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
    .ok_or(StatusCode::NOT_FOUND)?;

    render_png(&state, outfit, scale).await
}
