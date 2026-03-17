use axum::{
    Json,
    extract::{Query, State},
    http::StatusCode,
    response::IntoResponse,
};
use rand::Rng;
use serde::{Deserialize, Serialize};
use serde_json::json;

use crate::AppState;
use crate::auth::extractor::AuthUser;
use crate::auth::jwt::create_token;
use crate::auth::password::{hash_password, verify_password};
use crate::email::send_verification_email;
use crate::models::users::{User, UserResponse};
use crate::routes::validation::{validate_password, validate_username};

type ApiError = (StatusCode, Json<serde_json::Value>);

fn bad_request(msg: &str) -> ApiError {
    (StatusCode::BAD_REQUEST, Json(json!({ "error": msg })))
}

fn unauthorized(msg: &str) -> ApiError {
    (StatusCode::UNAUTHORIZED, Json(json!({ "error": msg })))
}

fn forbidden(msg: &str) -> ApiError {
    (StatusCode::FORBIDDEN, Json(json!({ "error": msg })))
}

fn conflict(msg: &str) -> ApiError {
    (StatusCode::CONFLICT, Json(json!({ "error": msg })))
}

fn internal() -> ApiError {
    (
        StatusCode::INTERNAL_SERVER_ERROR,
        Json(json!({ "error": "Internal server error" })),
    )
}

fn not_found(msg: &str) -> ApiError {
    (StatusCode::NOT_FOUND, Json(json!({ "error": msg })))
}

const USER_SELECT: &str = "id, github_username, github_id, username, email, email_verified, password_hash, current_outfit_id, created_at, updated_at";

fn generate_token() -> String {
    let mut rng = rand::thread_rng();
    (0..48)
        .map(|_| format!("{:02x}", rng.r#gen::<u8>()))
        .collect()
}

#[derive(Deserialize)]
pub struct SignupRequest {
    pub username: String,
    pub email: String,
    pub password: String,
    pub github_username: Option<String>,
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
pub struct VerifyEmailQuery {
    pub token: String,
}

#[derive(Deserialize)]
pub struct ResendVerificationRequest {
    pub email: String,
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
        &format!("INSERT INTO users (username, email, password_hash, github_username, email_verified) VALUES ($1, $2, $3, $4, FALSE) RETURNING {USER_SELECT}"),
    )
    .bind(&payload.username)
    .bind(&payload.email)
    .bind(&password_hash)
    .bind(payload.github_username.as_deref())
    .fetch_one(&state.pool)
    .await
    .map_err(|_| conflict("Email or username already taken"))?;

    // Generate and store verification token (expires in 24h)
    let token = generate_token();
    sqlx::query(
        "INSERT INTO email_verification_tokens (token, user_id, expires_at) VALUES ($1, $2, NOW() + INTERVAL '24 hours')",
    )
    .bind(&token)
    .bind(user.id)
    .execute(&state.pool)
    .await
    .map_err(|_| internal())?;

    // Send verification email (non-fatal: log but don't fail signup)
    if let Some(email_config) = &state.email_config {
        send_verification_email(email_config, &payload.email, &token).await;
    }

    Ok((
        StatusCode::CREATED,
        Json(
            json!({ "message": "Account created. Please check your email to verify your account." }),
        ),
    ))
}

pub async fn verify_email(
    State(state): State<AppState>,
    Query(query): Query<VerifyEmailQuery>,
) -> Result<Json<AuthResponse>, ApiError> {
    // Look up the token
    let row = sqlx::query_as::<_, (i32,)>(
        "SELECT user_id FROM email_verification_tokens WHERE token = $1 AND expires_at > NOW()",
    )
    .bind(&query.token)
    .fetch_optional(&state.pool)
    .await
    .map_err(|_| internal())?
    .ok_or_else(|| bad_request("Invalid or expired verification token"))?;

    let user_id = row.0;

    // Mark user as verified
    sqlx::query("UPDATE users SET email_verified = TRUE WHERE id = $1")
        .bind(user_id)
        .execute(&state.pool)
        .await
        .map_err(|_| internal())?;

    // Delete used token
    sqlx::query("DELETE FROM email_verification_tokens WHERE token = $1")
        .bind(&query.token)
        .execute(&state.pool)
        .await
        .ok();

    let user = sqlx::query_as::<_, User>(&format!("SELECT {USER_SELECT} FROM users WHERE id = $1"))
        .bind(user_id)
        .fetch_optional(&state.pool)
        .await
        .map_err(|_| internal())?
        .ok_or_else(|| not_found("User not found"))?;

    let token = create_token(user.id, &state.jwt_secret).map_err(|_| internal())?;

    Ok(Json(AuthResponse {
        token,
        user: user.into(),
    }))
}

pub async fn resend_verification(
    State(state): State<AppState>,
    Json(payload): Json<ResendVerificationRequest>,
) -> Result<impl IntoResponse, ApiError> {
    let user =
        sqlx::query_as::<_, User>(&format!("SELECT {USER_SELECT} FROM users WHERE email = $1"))
            .bind(&payload.email)
            .fetch_optional(&state.pool)
            .await
            .map_err(|_| internal())?
            .ok_or_else(|| not_found("No account with that email"))?;

    if user.email_verified {
        return Ok((
            StatusCode::OK,
            Json(json!({ "message": "Email is already verified" })),
        ));
    }

    // Delete any existing tokens for this user
    sqlx::query("DELETE FROM email_verification_tokens WHERE user_id = $1")
        .bind(user.id)
        .execute(&state.pool)
        .await
        .ok();

    let token = generate_token();
    sqlx::query(
        "INSERT INTO email_verification_tokens (token, user_id, expires_at) VALUES ($1, $2, NOW() + INTERVAL '24 hours')",
    )
    .bind(&token)
    .bind(user.id)
    .execute(&state.pool)
    .await
    .map_err(|_| internal())?;

    if let Some(email_config) = &state.email_config {
        send_verification_email(email_config, &payload.email, &token).await;
    }

    Ok((
        StatusCode::OK,
        Json(json!({ "message": "Verification email sent" })),
    ))
}

pub async fn login(
    State(state): State<AppState>,
    Json(payload): Json<LoginRequest>,
) -> Result<Json<AuthResponse>, ApiError> {
    let user =
        sqlx::query_as::<_, User>(&format!("SELECT {USER_SELECT} FROM users WHERE email = $1"))
            .bind(&payload.email)
            .fetch_optional(&state.pool)
            .await
            .map_err(|_| internal())?
            .ok_or_else(|| unauthorized("Invalid email or password"))?;

    let password_hash = user
        .password_hash
        .as_deref()
        .ok_or_else(|| unauthorized("This account uses GitHub login"))?;
    let valid = verify_password(&payload.password, password_hash).map_err(|_| internal())?;
    if !valid {
        return Err(unauthorized("Invalid email or password"));
    }

    if !user.email_verified {
        return Err(forbidden("Please verify your email before logging in"));
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
    let user = sqlx::query_as::<_, User>(&format!("SELECT {USER_SELECT} FROM users WHERE id = $1"))
        .bind(auth.user_id)
        .fetch_optional(&state.pool)
        .await
        .map_err(|_| internal())?
        .ok_or_else(|| {
            (
                StatusCode::NOT_FOUND,
                Json(json!({ "error": "User not found" })),
            )
        })?;

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
        .header(
            "Authorization",
            format!("Bearer {}", token_response.access_token),
        )
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

    // Find or create user — GitHub accounts are auto-verified
    let user = sqlx::query_as::<_, User>(&format!(
        "INSERT INTO users (github_id, github_username, username, email, email_verified)
         VALUES ($1, $2, $3, $4, TRUE)
         ON CONFLICT (github_id) DO UPDATE SET github_username = $2
         RETURNING {USER_SELECT}"
    ))
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
