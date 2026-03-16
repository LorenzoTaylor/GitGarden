use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Arc;

use axum::http::{header, HeaderValue, Method};
use axum::Router;
use image::DynamicImage;
use routes::app_router;
use sqlx::postgres::PgPoolOptions;
use sqlx::PgPool;
use tokio::sync::RwLock;
use tower_http::cors::CorsLayer;
use tracing::info;

mod auth;
mod models;
mod routes;
mod sprite;

#[derive(Clone)]
pub struct AppState {
    pub pool: PgPool,
    pub assets_dir: PathBuf,
    pub sprite_cache: Arc<RwLock<HashMap<String, Arc<DynamicImage>>>>,
    pub jwt_secret: String,
    pub github_client_id: String,
    pub github_client_secret: String,
}

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "info".into()),
        )
        .init();

    dotenvy::dotenv().ok();

    let database_url = std::env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let assets_dir = PathBuf::from(std::env::var("ASSETS_DIR").unwrap_or_else(|_| "../public".to_string()));
    let jwt_secret = std::env::var("JWT_SECRET").expect("JWT_SECRET must be set");
    let github_client_id = std::env::var("GITHUB_CLIENT_ID").unwrap_or_default();
    let github_client_secret = std::env::var("GITHUB_CLIENT_SECRET").unwrap_or_default();

    info!("Assets dir: {:?} (exists: {})", assets_dir, assets_dir.exists());

    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(&database_url)
        .await
        .expect("Failed to create pool");

    sqlx::migrate!("src/migrations/migrations")
        .run(&pool)
        .await
        .expect("Failed to run migrations");

    let state = AppState {
        pool,
        assets_dir,
        sprite_cache: Arc::new(RwLock::new(HashMap::new())),
        jwt_secret,
        github_client_id,
        github_client_secret,
    };

    let cors = CorsLayer::new()
        .allow_origin([
            "http://localhost:5173".parse::<HeaderValue>().unwrap(),
            "https://git-garden.vercel.app".parse::<HeaderValue>().unwrap(),
        ])
        .allow_methods([Method::GET, Method::POST, Method::PUT])
        .allow_headers([header::CONTENT_TYPE, header::AUTHORIZATION]);

    let app = Router::new()
        .nest("/api", app_router(state))
        .layer(cors);

    let port = std::env::var("PORT").unwrap_or_else(|_| "3000".to_string());
    let listener = tokio::net::TcpListener::bind(format!("0.0.0.0:{port}")).await.unwrap();
    println!("server listening on {}", listener.local_addr().unwrap());
    axum::serve(listener, app).await.unwrap();
}
