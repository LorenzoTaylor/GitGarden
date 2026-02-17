use axum::routing::{get, post};
use sqlx::PgPool;

mod outfit;
mod render;

pub fn app_router(pool: PgPool) -> axum::Router {
    axum::Router::new()
        .route("/hello", get(|| async { "Hello, World!" }))
        .route("/outfit/{uuid}", get(outfit::get_outfit))
        .route("/outfit", post(outfit::create_outfit))
        .merge(render::create_render_routes())
        .with_state(pool)
}
