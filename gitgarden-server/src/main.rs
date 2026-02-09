use axum::{Router};
use routes::app_router;
mod routes;


#[tokio::main]
async fn main() {
  
  let app = Router::new().nest("/api", app_router());

  let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap();
  println!("server listen on port : {}", listener.local_addr().unwrap());
  axum::serve(listener, app).await.unwrap();
}