use axum::{
    Router,
    http::StatusCode,
    middleware,
    routing::{get, post, put},
};

use crate::{AppState, middleware::SharedRateLimiter};

mod auth;
mod outfit;
mod render;
mod user;
pub mod validation;

pub mod card;

async fn health() -> StatusCode {
    StatusCode::OK
}

pub fn app_router(state: AppState, auth_limiter: SharedRateLimiter) -> axum::Router {
    let auth_routes = Router::new()
        .route("/auth/signup", post(auth::signup))
        .route("/auth/login", post(auth::login))
        .route("/auth/github", post(auth::github_auth))
        .route("/auth/resend-verification", post(auth::resend_verification))
        .layer(middleware::from_fn_with_state(
            auth_limiter,
            crate::middleware::rate_limit_middleware,
        ));

    axum::Router::new()
        .route("/health", get(health))
        .route("/hello", get(|| async { "Hello, World!" }))
        .route("/outfit/{uuid}", get(outfit::get_outfit))
        .route("/outfit", post(outfit::create_outfit))
        .route("/auth/me", get(auth::me))
        .route("/auth/verify-email", get(auth::verify_email))
        .route("/user/outfits", get(user::list_outfits))
        .route("/user/current-outfit", put(user::set_current_outfit))
        .route("/user/github-username", put(user::update_github_username))
        .merge(render::create_render_routes())
        .merge(auth_routes)
        .with_state(state)
}
