use axum::routing::get;
mod render;

pub fn app_router() -> axum::Router {

  axum::Router::new()
    .route("/hello", get(|| async { "Hello, World!" }))
    .nest("/", render::create_render_routes())
}