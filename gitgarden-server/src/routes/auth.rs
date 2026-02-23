use axum::{extract::State, http::StatusCode, response::IntoResponse, Json};
use serde::{Deserialize, Serialize};
use serde_json::json;

use crate::auth::extractor::AuthUser;
use crate::auth::jwt::create_token;
use crate::auth::password::{hash_password, verify_password};
use crate::models::users::{User, UserResponse};
use crate::routes::validation::{validate_password, validate_username};
use crate::AppState;

type ApiError = (StatusCode, Json<serde_json::Value>);

fn bad_request(msg: &str) -> ApiError {
    (StatusCode::BAD_REQUEST, Json(json!({ "error": msg })))
}

fn unauthorized(msg: &str) -> ApiError {
    (StatusCode::UNAUTHORIZED, Json(json!({ "error": msg })))
}

fn conflict(msg: &str) -> ApiError {
    (StatusCode::CONFLICT, Json(json!({ "error": msg })))
}

fn internal() -> ApiError {
    (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({ "error": "Internal server error" })))
}

#[derive(Deserialize)]
pub struct SignupRequest {
    pub username: String,
    pub email: String,
    pub password: String,
}

#[derive(Deserialize)]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
}

#[derive(Serialize)]
pub struct AuthResponse {
    pub token: String,
    pub user: UserResponse,
}

#[derive(Deserialize)]
pub struct GithubAuthRequest {
    pub code: String,
}

#[derive(Deserialize)]
struct GithubTokenResponse {
    access_token: String,
}

#[derive(Deserialize)]
struct GithubUser {
    id: i64,
    login: String,
    email: Option<String>,
}

pub async fn signup(
    State(state): State<AppState>,
    Json(payload): Json<SignupRequest>,
) -> Result<impl IntoResponse, ApiError> {
    validate_username(&payload.username).map_err(|e| bad_request(e.message()))?;
    validate_password(&payload.password).map_err(|e| bad_request(e.message()))?;

    let password_hash = hash_password(&payload.password).map_err(|_| internal())?;

    let user = sqlx::query_as::<_, User>(
        "INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, github_username, github_id, username, email, password_hash, current_outfit_id, created_at, updated_at",
    )
    .bind(&payload.username)
    .bind(&payload.email)
    .bind(&password_hash)
    .fetch_one(&state.pool)
    .await
    .map_err(|_| conflict("Email or username already taken"))?;

    let token = create_token(user.id, &state.jwt_secret).map_err(|_| internal())?;

    Ok((
        StatusCode::CREATED,
        Json(AuthResponse {
            token,
            user: user.into(),
        }),
    ))
}

pub async fn login(
    State(state): State<AppState>,
    Json(payload): Json<LoginRequest>,
) -> Result<Json<AuthResponse>, ApiError> {
    let user = sqlx::query_as::<_, User>(
        "SELECT id, github_username, github_id, username, email, password_hash, current_outfit_id, created_at, updated_at FROM users WHERE email = $1",
    )
    .bind(&payload.email)
    .fetch_optional(&state.pool)
    .await
    .map_err(|_| internal())?
    .ok_or_else(|| unauthorized("Invalid email or password"))?;

    let password_hash = user.password_hash.as_deref()
        .ok_or_else(|| unauthorized("This account uses GitHub login"))?;
    let valid = verify_password(&payload.password, password_hash).map_err(|_| internal())?;
    if !valid {
        return Err(unauthorized("Invalid email or password"));
    }

    let token = create_token(user.id, &state.jwt_secret).map_err(|_| internal())?;

    Ok(Json(AuthResponse {
        token,
        user: user.into(),
    }))
}

pub async fn me(
    State(state): State<AppState>,
    auth: AuthUser,
) -> Result<Json<UserResponse>, ApiError> {
    let user = sqlx::query_as::<_, User>(
        "SELECT id, github_username, github_id, username, email, password_hash, current_outfit_id, created_at, updated_at FROM users WHERE id = $1",
    )
    .bind(auth.user_id)
    .fetch_optional(&state.pool)
    .await
    .map_err(|_| internal())?
    .ok_or_else(|| (StatusCode::NOT_FOUND, Json(json!({ "error": "User not found" }))))?;

    Ok(Json(user.into()))
}

pub async fn github_auth(
    State(state): State<AppState>,
    Json(payload): Json<GithubAuthRequest>,
) -> Result<Json<AuthResponse>, ApiError> {
    // Exchange code for access token
    let client = reqwest::Client::new();
    let token_response = client
        .post("https://github.com/login/oauth/access_token")
        .json(&serde_json::json!({
            "client_id": state.github_client_id,
            "client_secret": state.github_client_secret,
            "code": payload.code,
        }))
        .header("Accept", "application/json")
        .send()
        .await
        .map_err(|_| internal())?
        .json::<GithubTokenResponse>()
        .await
        .map_err(|_| internal())?;

    // Fetch GitHub user info
    let github_user = client
        .get("https://api.github.com/user")
        .header("Authorization", format!("Bearer {}", token_response.access_token))
        .header("User-Agent", "GitGarden")
        .send()
        .await
        .map_err(|_| internal())?
        .json::<GithubUser>()
        .await
        .map_err(|_| internal())?;

    let email = github_user
        .email
        .unwrap_or_else(|| format!("{}@github.local", github_user.login));

    // Find or create user
    let user = sqlx::query_as::<_, User>(
        "INSERT INTO users (github_id, github_username, username, email)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (github_id) DO UPDATE SET github_username = $2
         RETURNING id, github_username, github_id, username, email, password_hash, current_outfit_id, created_at, updated_at",
    )
    .bind(github_user.id)
    .bind(&github_user.login)
    .bind(&github_user.login)
    .bind(&email)
    .fetch_one(&state.pool)
    .await
    .map_err(|_| internal())?;

    let token = create_token(user.id, &state.jwt_secret).map_err(|_| internal())?;

    Ok(Json(AuthResponse {
        token,
        user: user.into(),
    }))
}
