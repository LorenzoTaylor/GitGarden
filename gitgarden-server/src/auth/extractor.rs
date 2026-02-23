use axum::{
    extract::FromRequestParts,
    http::{header, request::Parts, StatusCode},
};

use crate::AppState;
use super::jwt::validate_token;

/// Required auth extractor - returns 401 if no valid token
pub struct AuthUser {
    pub user_id: i32,
}

impl FromRequestParts<AppState> for AuthUser {
    type Rejection = StatusCode;

    async fn from_request_parts(
        parts: &mut Parts,
        state: &AppState,
    ) -> Result<Self, Self::Rejection> {
        let token = parts
            .headers
            .get(header::AUTHORIZATION)
            .and_then(|v| v.to_str().ok())
            .and_then(|v| v.strip_prefix("Bearer "))
            .ok_or(StatusCode::UNAUTHORIZED)?;

        let claims =
            validate_token(token, &state.jwt_secret).map_err(|_| StatusCode::UNAUTHORIZED)?;

        Ok(AuthUser {
            user_id: claims.sub,
        })
    }
}

/// Optional auth extractor - returns None if no valid token
pub struct OptionalAuthUser {
    pub user_id: Option<i32>,
}

impl FromRequestParts<AppState> for OptionalAuthUser {
    type Rejection = StatusCode;

    async fn from_request_parts(
        parts: &mut Parts,
        state: &AppState,
    ) -> Result<Self, Self::Rejection> {
        let user_id = parts
            .headers
            .get(header::AUTHORIZATION)
            .and_then(|v| v.to_str().ok())
            .and_then(|v| v.strip_prefix("Bearer "))
            .and_then(|token| validate_token(token, &state.jwt_secret).ok())
            .map(|claims| claims.sub);

        Ok(OptionalAuthUser { user_id })
    }
}
