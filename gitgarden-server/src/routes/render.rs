pub fn create_render_routes() -> axum::Router {
  axum::Router::new()
    .route("/render", axum::routing::post(render))
}

struct RenderQuery {
    uuid: String,
}

async fn render(render_query: RenderQuery) -> () {
    let current_character = sqlx::query!(
        "SELECT current_character FROM users WHERE uuid = $1",
        render_query.uuid
    );

    println!("Current character: {:?}", current_character);
}
