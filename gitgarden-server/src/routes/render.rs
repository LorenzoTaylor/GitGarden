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

#[derive(Deserialize)]
pub struct SpriteQuery {
    scale: Option<u32>,
}

pub fn create_render_routes() -> Router<AppState> {
    Router::new().route("/sprite/{uuid}", get(render_sprite_handler))
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
    headers.insert("Cache-Control", "public, max-age=3600".parse().unwrap());

    Ok((headers, png_bytes))
}
