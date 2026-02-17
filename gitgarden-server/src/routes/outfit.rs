use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use sqlx::PgPool;
use uuid::Uuid;

use crate::models::outfit::{CreateOutfitRequest, CreateOutfitResponse, Outfit};

pub async fn get_outfit(
    State(pool): State<PgPool>,
    Path(uuid): Path<Uuid>,
) -> Result<Json<Outfit>, StatusCode> {
    let outfit = sqlx::query_as::<_, Outfit>(
        "SELECT id, clothes, colors FROM outfits WHERE id = $1",
    )
    .bind(uuid)
    .fetch_optional(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
    .ok_or(StatusCode::NOT_FOUND)?;

    Ok(Json(outfit))
}

pub async fn create_outfit(
    State(pool): State<PgPool>,
    Json(payload): Json<CreateOutfitRequest>,
) -> Result<impl IntoResponse, StatusCode> {
    let id: Uuid = sqlx::query_scalar(
        "INSERT INTO outfits (clothes, colors) VALUES ($1, $2) RETURNING id",
    )
    .bind(&payload.clothes)
    .bind(&payload.colors)
    .fetch_one(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok((StatusCode::CREATED, Json(CreateOutfitResponse { id })))
}
