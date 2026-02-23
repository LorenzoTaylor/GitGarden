use chrono::{DateTime, Utc};
use serde::Serialize;
use uuid::Uuid;

#[derive(Debug, Clone, sqlx::FromRow)]
pub struct User {
    pub id: i32,
    pub github_username: Option<String>,
    pub github_id: Option<i64>,
    pub username: String,
    pub email: String,
    pub password_hash: Option<String>,
    pub current_outfit_id: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize)]
pub struct UserResponse {
    pub id: i32,
    pub github_username: Option<String>,
    pub username: String,
    pub email: String,
    pub current_outfit_id: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl From<User> for UserResponse {
    fn from(user: User) -> Self {
        Self {
            id: user.id,
            github_username: user.github_username,
            username: user.username,
            email: user.email,
            current_outfit_id: user.current_outfit_id,
            created_at: user.created_at,
            updated_at: user.updated_at,
        }
    }
}
