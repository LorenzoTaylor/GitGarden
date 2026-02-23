use axum::routing::{get, post, put};

use crate::AppState;

mod auth;
mod outfit;
mod render;
mod user;
pub mod validation;

pub fn app_router(state: AppState) -> axum::Router {
    axum::Router::new()
        .route("/hello", get(|| async { "Hello, World!" }))
        .route("/outfit/{uuid}", get(outfit::get_outfit))
        .route("/outfit", post(outfit::create_outfit))
        .route("/auth/signup", post(auth::signup))
        .route("/auth/login", post(auth::login))
        .route("/auth/me", get(auth::me))
        .route("/auth/github", post(auth::github_auth))
        .route("/user/outfits", get(user::list_outfits))
        .route("/user/current-outfit", put(user::set_current_outfit))
        .merge(render::create_render_routes())
        .with_state(state)
}
