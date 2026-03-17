use std::{
    net::{IpAddr, Ipv4Addr},
    num::NonZeroU32,
    sync::Arc,
};

use axum::{
    body::Body,
    extract::Request,
    http::{HeaderMap, StatusCode},
    middleware::Next,
    response::{IntoResponse, Response},
};
use governor::{DefaultKeyedRateLimiter, Quota, RateLimiter};

pub type SharedRateLimiter = Arc<DefaultKeyedRateLimiter<IpAddr>>;

pub fn create_rate_limiter(requests_per_minute: u32) -> SharedRateLimiter {
    let quota = Quota::per_minute(NonZeroU32::new(requests_per_minute).unwrap());
    Arc::new(RateLimiter::keyed(quota))
}

fn extract_client_ip(headers: &HeaderMap) -> IpAddr {
    if let Some(val) = headers.get("x-forwarded-for") {
        if let Ok(s) = val.to_str() {
            if let Some(first) = s.split(',').next() {
                if let Ok(ip) = first.trim().parse() {
                    return ip;
                }
            }
        }
    }
    IpAddr::V4(Ipv4Addr::LOCALHOST)
}

pub async fn rate_limit_middleware(
    axum::extract::State(limiter): axum::extract::State<SharedRateLimiter>,
    request: Request<Body>,
    next: Next,
) -> Response {
    let ip = extract_client_ip(request.headers());
    match limiter.check_key(&ip) {
        Ok(_) => next.run(request).await,
        Err(_) => (
            StatusCode::TOO_MANY_REQUESTS,
            "Rate limit exceeded. Please slow down.",
        )
            .into_response(),
    }
}
