use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Arc;

use axum::Router;
use axum::http::{HeaderValue, Method, header};
use github::GitHubStatsCache;
use image::DynamicImage;
use routes::app_router;
use sqlx::PgPool;
use sqlx::postgres::PgPoolOptions;
use tokio::sync::RwLock;
use tower_http::cors::CorsLayer;
use tracing::info;

mod auth;
mod email;
mod github;
mod middleware;
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
    pub github_token: String,
    pub github_stats_cache: GitHubStatsCache,
    pub email_config: Option<Arc<email::EmailConfig>>,
}

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env().unwrap_or_else(|_| "info".into()),
        )
        .init();

    dotenvy::dotenv().ok();

    let database_url = std::env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let assets_dir = if cfg!(debug_assertions) {
        PathBuf::from("sprite_assets")
    } else {
        PathBuf::from("/app/sprite_assets")
    };
    let jwt_secret = std::env::var("JWT_SECRET").expect("JWT_SECRET must be set");
    let github_client_id = std::env::var("GITHUB_CLIENT_ID").unwrap_or_default();
    let github_client_secret = std::env::var("GITHUB_CLIENT_SECRET").unwrap_or_default();
    let github_token = std::env::var("GITHUB_TOKEN").unwrap_or_default();

    let email_config = match (
        std::env::var("SMTP_HOST"),
        std::env::var("SMTP_USERNAME"),
        std::env::var("SMTP_PASSWORD"),
        std::env::var("SMTP_FROM"),
        std::env::var("APP_URL"),
    ) {
        (Ok(host), Ok(username), Ok(password), Ok(from), Ok(app_url)) => {
            let port = std::env::var("SMTP_PORT")
                .ok()
                .and_then(|p| p.parse().ok())
                .unwrap_or(587u16);
            info!("Email configured via SMTP host: {}", host);
            Some(Arc::new(email::EmailConfig {
                smtp_host: host,
                smtp_port: port,
                smtp_username: username,
                smtp_password: password,
                smtp_from: from,
                app_url,
            }))
        }
        _ => {
            info!("SMTP not configured — email verification will be skipped");
            None
        }
    };

    info!(
        "Assets dir: {:?} (exists: {})",
        assets_dir,
        assets_dir.exists()
    );

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
        github_token,
        github_stats_cache: Arc::new(RwLock::new(HashMap::new())),
        email_config,
    };

    let allowed_origins: Vec<HeaderValue> = {
        let mut origins = vec!["http://localhost:5173".parse::<HeaderValue>().unwrap()];
        if let Ok(origin) = std::env::var("ALLOWED_ORIGIN") {
            if let Ok(val) = origin.parse::<HeaderValue>() {
                origins.push(val);
            }
        } else {
            origins.push(
                "https://git-garden.vercel.app"
                    .parse::<HeaderValue>()
                    .unwrap(),
            );
        }
        origins
    };

    let cors = CorsLayer::new()
        .allow_origin(allowed_origins)
        .allow_methods([Method::GET, Method::POST, Method::PUT, Method::OPTIONS])
        .allow_headers([header::CONTENT_TYPE, header::AUTHORIZATION]);

    let auth_limiter = middleware::create_rate_limiter(20);

    let app = Router::new()
        .nest("/api", app_router(state, auth_limiter))
        .layer(cors);

    let port = std::env::var("PORT").unwrap_or_else(|_| "3000".to_string());
    let listener = tokio::net::TcpListener::bind(format!("0.0.0.0:{port}"))
        .await
        .unwrap();
    println!("server listening on {}", listener.local_addr().unwrap());
    axum::serve(listener, app).await.unwrap();
}
