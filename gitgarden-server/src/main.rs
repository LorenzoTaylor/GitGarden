use axum::http::{HeaderValue, Method};
use axum::Router;
use routes::app_router;
use sqlx::postgres::PgPoolOptions;
use tower_http::cors::CorsLayer;

mod models;
mod routes;

#[tokio::main]
async fn main() {
    dotenvy::dotenv().ok();

    let database_url = std::env::var("DATABASE_URL").expect("DATABASE_URL must be set");

    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(&database_url)
        .await
        .expect("Failed to create pool");

    let cors = CorsLayer::new()
        .allow_origin([
            "http://localhost:5173".parse::<HeaderValue>().unwrap(),
            "https://git-garden.vercel.app".parse::<HeaderValue>().unwrap(),
        ])
        .allow_methods([Method::GET, Method::POST])
        .allow_headers([axum::http::header::CONTENT_TYPE]);

    let app = Router::new()
        .nest("/api", app_router(pool))
        .layer(cors);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap();
    println!("server listening on {}", listener.local_addr().unwrap());
    axum::serve(listener, app).await.unwrap();
}
