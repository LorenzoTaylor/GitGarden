use std::io::Cursor;
use std::sync::Arc;
use std::time::Instant;

use ab_glyph::{FontArc, PxScale};
use axum::{
    Router,
    extract::{Path, Query, State},
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
    routing::get,
};
use image::{
    AnimationDecoder, DynamicImage, Rgba, RgbaImage,
    codecs::gif::{GifDecoder, GifEncoder, Repeat},
    Frame,
};
use imageproc::drawing::{draw_line_segment_mut, draw_text_mut};
use serde::Deserialize;
use tracing::error;
use uuid::Uuid;

use crate::AppState;
use crate::BakedBg;
use crate::models::outfit::Outfit;
use crate::sprite;

const GIF_CACHE_TTL: std::time::Duration = std::time::Duration::from_secs(120);

const CARD_W: u32 = 900;
const CARD_H: u32 = 280;
const SPRITE_X: i64 = 615;
const SPRITE_Y: i64 = 15;
const SPRITE_SIZE: u32 = 250;

/// Animation sequence as (col, row) pairs into the 48×48 sprite sheet grid (0-indexed).
/// Row 1 (idx 0) first 4 frames × 2, then Row 3 (idx 2) first 4 frames.
const ANIM_SEQ: &[(u32, u32)] = &[
    (0, 0), (1, 0), (2, 0), (3, 0),
    (0, 0), (1, 0), (2, 0), (3, 0),
    (0, 2), (1, 2), (2, 2), (3, 2),
];

static FONT_BYTES: &[u8] = include_bytes!("../../sprite_assets/PressStart2P-Regular.ttf");

fn gcd(a: usize, b: usize) -> usize {
    if b == 0 { a } else { gcd(b, a % b) }
}

fn lcm(a: usize, b: usize) -> usize {
    if a == 0 || b == 0 { 0 } else { a / gcd(a, b) * b }
}

/// Alpha-composite `src` onto `dst` at (`x`, `y`). Out-of-bounds pixels are skipped.
fn composite(dst: &mut RgbaImage, src: &RgbaImage, x: i64, y: i64) {
    for sy in 0..src.height() {
        for sx in 0..src.width() {
            let cx = x + sx as i64;
            let cy = y + sy as i64;
            if cx < 0 || cy < 0 || cx >= CARD_W as i64 || cy >= CARD_H as i64 {
                continue;
            }
            let s = src.get_pixel(sx, sy);
            let sa = s[3] as f32 / 255.0;
            if sa == 0.0 {
                continue;
            }
            let d = dst.get_pixel(cx as u32, cy as u32);
            let da = d[3] as f32 / 255.0;
            let oa = sa + da * (1.0 - sa);
            if oa > 0.0 {
                dst.put_pixel(
                    cx as u32,
                    cy as u32,
                    Rgba([
                        ((s[0] as f32 * sa + d[0] as f32 * da * (1.0 - sa)) / oa) as u8,
                        ((s[1] as f32 * sa + d[1] as f32 * da * (1.0 - sa)) / oa) as u8,
                        ((s[2] as f32 * sa + d[2] as f32 * da * (1.0 - sa)) / oa) as u8,
                        (oa * 255.0) as u8,
                    ]),
                );
            }
        }
    }
}

/// How many pixels to shift the background crop downward into the source image.
const BG_Y_SHIFT: u32 = 120;

/// Scale, crop (shifted down), and apply dark overlay to one background GIF frame.
fn bake_bg_frame(raw: &RgbaImage) -> RgbaImage {
    let (orig_w, orig_h) = raw.dimensions();

    // Scale to fill both card dimensions (like resize_to_fill but manual so we can shift crop)
    let scale_w = CARD_W as f64 / orig_w as f64;
    let scale_h = CARD_H as f64 / orig_h as f64;
    let scale = scale_w.max(scale_h);
    let fill_w = ((orig_w as f64 * scale).round() as u32).max(CARD_W);
    let fill_h = ((orig_h as f64 * scale).round() as u32).max(CARD_H);

    let scaled = DynamicImage::ImageRgba8(raw.clone())
        .resize_exact(fill_w, fill_h, image::imageops::FilterType::Nearest)
        .to_rgba8();

    // Center horizontally, shift downward vertically
    let x_off = fill_w.saturating_sub(CARD_W) / 2;
    let y_center = fill_h.saturating_sub(CARD_H) / 2;
    let y_off = (y_center + BG_Y_SHIFT).min(fill_h.saturating_sub(CARD_H));

    let cropped = image::imageops::crop_imm(&scaled, x_off, y_off, CARD_W, CARD_H).to_image();

    let mut out = RgbaImage::new(CARD_W, CARD_H);
    let ov_a = 95.0f32 / 255.0;
    for y in 0..CARD_H {
        for x in 0..CARD_W {
            let px = cropped.get_pixel(x, y);
            let bg_a = px[3] as f32 / 255.0;
            let out_a = ov_a + bg_a * (1.0 - ov_a);
            if out_a > 0.0 {
                let out_r = (px[0] as f32 * bg_a * (1.0 - ov_a)) / out_a;
                let out_g = (px[1] as f32 * bg_a * (1.0 - ov_a)) / out_a;
                let out_b = (px[2] as f32 * bg_a * (1.0 - ov_a)) / out_a;
                out.put_pixel(x, y, Rgba([out_r as u8, out_g as u8, out_b as u8, (out_a * 255.0) as u8]));
            } else {
                out.put_pixel(x, y, Rgba([0, 0, 0, 95]));
            }
        }
    }
    out
}

async fn get_baked_bg(state: &AppState) -> Arc<BakedBg> {
    // Fast path: already cached
    {
        let guard = state.baked_bg.read().await;
        if let Some(ref cached) = *guard {
            return Arc::clone(cached);
        }
    }
    // Slow path: compute and cache
    let mut guard = state.baked_bg.write().await;
    if let Some(ref cached) = *guard {
        return Arc::clone(cached);
    }
    let bg_path = state.assets_dir.join("DisplayBackground.gif");
    let (baked_frames, delays): (Vec<RgbaImage>, Vec<image::Delay>) =
        match std::fs::read(&bg_path) {
            Ok(gif_bytes) => match GifDecoder::new(Cursor::new(gif_bytes)) {
                Ok(decoder) => decoder
                    .into_frames()
                    .filter_map(|f| f.ok())
                    .map(|f| {
                        let delay = f.delay();
                        (bake_bg_frame(f.buffer()), delay)
                    })
                    .unzip(),
                Err(e) => {
                    error!("Failed to decode DisplayBackground.gif: {}", e);
                    (vec![], vec![])
                }
            },
            Err(e) => {
                error!("Failed to read DisplayBackground.gif: {}", e);
                (vec![], vec![])
            }
        };
    let arc = Arc::new((baked_frames, delays));
    *guard = Some(Arc::clone(&arc));
    arc
}

fn compute_rank(stats: &crate::github::GitHubStats) -> &'static str {
    let score = (stats.commits_last_year as f64).sqrt() * 3.0
        + (stats.merged_prs as f64).sqrt() * 4.0
        + (stats.total_stars as f64).sqrt() * 5.0
        + (stats.current_streak as f64).sqrt() * 2.0;
    if score >= 90.0 { "S" }
    else if score >= 70.0 { "A+" }
    else if score >= 55.0 { "A" }
    else if score >= 40.0 { "B+" }
    else if score >= 25.0 { "B" }
    else if score >= 15.0 { "C+" }
    else { "C" }
}

/// Render stats text onto a transparent CARD_W×CARD_H image.
fn bake_stats_overlay(
    gh_user: &str,
    stats: &crate::github::GitHubStats,
    font: &FontArc,
) -> RgbaImage {
    let mut overlay = RgbaImage::new(CARD_W, CARD_H);
    let white = Rgba([255u8, 255, 255, 255]);
    let green = Rgba([80u8, 200, 100, 255]);
    let rank = compute_rank(stats);

    // Username
    draw_text_mut(&mut overlay, white, 30, 25, PxScale::from(20.0), font, &format!("@{gh_user}"));

    // Column 1 — COMMITS, STREAK, RANK
    draw_text_mut(&mut overlay, green, 30, 76, PxScale::from(14.0), font, "COMMITS");
    draw_text_mut(&mut overlay, white, 30, 94, PxScale::from(12.0), font, "(LAST YEAR)");
    draw_text_mut(&mut overlay, white, 30, 112, PxScale::from(16.0), font, &stats.commits_last_year.to_string());

    draw_text_mut(&mut overlay, green, 30, 148, PxScale::from(14.0), font, "STREAK");
    draw_text_mut(&mut overlay, white, 30, 166, PxScale::from(16.0), font, &format!("{} DAYS", stats.current_streak));

    // Inline RANK: A
    draw_text_mut(&mut overlay, green, 30, 210, PxScale::from(16.0), font, "RANK:");
    draw_text_mut(&mut overlay, white, 120, 210, PxScale::from(18.0), font, rank);

    // Column 2 — PULL REQUESTS, STARS
    draw_text_mut(&mut overlay, green, 280, 76, PxScale::from(14.0), font, "PULL REQUESTS");
    draw_text_mut(&mut overlay, white, 280, 94, PxScale::from(16.0), font, &stats.merged_prs.to_string());

    draw_text_mut(&mut overlay, green, 280, 136, PxScale::from(14.0), font, "STARS");
    draw_text_mut(&mut overlay, white, 280, 154, PxScale::from(16.0), font, &stats.total_stars.to_string());

    overlay
}

async fn render_card(
    state: &AppState,
    outfit: Option<Outfit>,
    github_username: Option<String>,
) -> Result<Vec<u8>, StatusCode> {
    // ── 1. Get pre-baked BG frames (cached for server lifetime) ──────────────
    let baked = get_baked_bg(state).await;
    let (baked_bg, bg_delays) = baked.as_ref();
    let bg_count = baked_bg.len().max(1);

    // ── 2. Pre-render all animation frames from the sprite sheet ─────────────
    // Each entry in ANIM_SEQ is a (col, row) tile coordinate (0-indexed) in the
    // 48×48 grid. Row 9 (idx 8) = 8-frame idle; Row 4 (idx 3) first 4 frames.
    let sprite_frames: Vec<Option<RgbaImage>> = if let Some(ref outfit) = outfit {
        let mut frames = Vec::with_capacity(ANIM_SEQ.len());
        for &(col, row) in ANIM_SEQ {
            let raw = sprite::render_sprite_raw(
                &outfit.clothes,
                &outfit.colors,
                &state.assets_dir,
                &state.sprite_cache,
                4,
                col,
                row,
            )
            .await;
            frames.push(match raw {
                Ok(img) => Some(image::imageops::resize(
                    &img,
                    SPRITE_SIZE,
                    SPRITE_SIZE,
                    image::imageops::FilterType::Nearest,
                )),
                Err(e) => {
                    error!("Failed to pre-render sprite frame ({},{}): {}", col, row, e);
                    None
                }
            });
        }
        frames
    } else {
        vec![]
    };
    let sprite_frame_count = ANIM_SEQ.len();

    // ── 4. Fetch stats + bake text overlay ───────────────────────────────────
    let stats_overlay: Option<RgbaImage> = if let Some(ref gh_user) = github_username {
        if !state.github_token.is_empty() {
            match crate::github::fetch_github_stats(
                gh_user,
                &state.github_token,
                &state.github_stats_cache,
            )
            .await
            {
                Ok(stats) => match FontArc::try_from_slice(FONT_BYTES) {
                    Ok(font) => Some(bake_stats_overlay(gh_user, &stats, &font)),
                    Err(e) => {
                        error!("Failed to load font: {}", e);
                        None
                    }
                },
                Err(e) => {
                    error!("Failed to fetch GitHub stats for {}: {}", gh_user, e);
                    None
                }
            }
        } else {
            None
        }
    } else {
        None
    };

    // ── 5. Compute total frame count ─────────────────────────────────────────
    let total_frames = lcm(bg_count, sprite_frame_count).min(120).max(1);

    // ── 6. Encode animated GIF ────────────────────────────────────────────────
    let mut gif_buf = Cursor::new(Vec::new());
    {
        let mut encoder = GifEncoder::new_with_speed(&mut gif_buf, 10);
        encoder.set_repeat(Repeat::Infinite).map_err(|e| {
            error!("GIF set_repeat failed: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        })?;

        for i in 0..total_frames {
            // Clone the pre-baked background (memcpy, no resize/overlay work)
            let mut canvas = if !baked_bg.is_empty() {
                baked_bg[i % bg_count].clone()
            } else {
                RgbaImage::new(CARD_W, CARD_H)
            };

            // Composite pre-rendered stats text
            if let Some(ref overlay) = stats_overlay {
                composite(&mut canvas, overlay, 0, 0);
            }

            // Composite pre-rendered sprite frame
            if !sprite_frames.is_empty() {
                if let Some(ref sprite_img) = sprite_frames[i % sprite_frame_count] {
                    composite(&mut canvas, sprite_img, SPRITE_X, SPRITE_Y);
                }
            }

            let delay = {
                let base = if !bg_delays.is_empty() {
                    bg_delays[i % bg_count]
                } else {
                    image::Delay::from_numer_denom_ms(100, 1)
                };
                let (n, d) = base.numer_denom_ms();
                image::Delay::from_numer_denom_ms(n.saturating_mul(3), d)
            };

            encoder
                .encode_frame(Frame::from_parts(canvas, 0, 0, delay))
                .map_err(|e| {
                    error!("GIF encode_frame failed at frame {}: {}", i, e);
                    StatusCode::INTERNAL_SERVER_ERROR
                })?;
        }
    }

    Ok(gif_buf.into_inner())
}

async fn get_or_render_card(
    state: &AppState,
    outfit: Option<Outfit>,
    outfit_id: Option<Uuid>,
    github_username: Option<String>,
) -> Result<Vec<u8>, StatusCode> {
    let outfit_id_str = outfit_id.map(|id| id.to_string()).unwrap_or_default();
    let username_str = github_username.clone().unwrap_or_default();
    let cache_key = format!("{}:{}", outfit_id_str, username_str);

    // Cache hit check
    {
        let guard = state.gif_cache.read().await;
        if let Some((bytes, created_at)) = guard.get(&cache_key) {
            if created_at.elapsed() < GIF_CACHE_TTL {
                return Ok(bytes.clone());
            }
        }
    }

    // Cache miss: render, then store
    let bytes = render_card(state, outfit, github_username).await?;
    {
        let mut guard = state.gif_cache.write().await;
        guard.insert(cache_key, (bytes.clone(), Instant::now()));
    }
    Ok(bytes)
}

#[derive(Deserialize)]
pub struct SpriteQuery {
    scale: Option<u32>,
}

pub fn create_render_routes() -> Router<AppState> {
    Router::new()
        .route("/sprite/{uuid}", get(render_sprite_handler))
        .route("/sprite/{uuid}/preview", get(preview_sprite_handler))
        .route("/user/{username}/sprite", get(render_active_sprite_handler))
}

async fn preview_sprite_handler(
    State(state): State<AppState>,
    Path(uuid): Path<Uuid>,
    Query(query): Query<SpriteQuery>,
) -> Result<impl IntoResponse, StatusCode> {
    let outfit = sqlx::query_as::<_, Outfit>(
        "SELECT id, clothes, colors, user_id FROM outfits WHERE id = $1",
    )
    .bind(uuid)
    .fetch_optional(&state.pool)
    .await
    .map_err(|e| {
        error!("DB error in preview_sprite_handler: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?
    .ok_or(StatusCode::NOT_FOUND)?;

    let scale = query.scale.unwrap_or(4).clamp(1, 8);
    let png = sprite::render_sprite(
        &outfit.clothes,
        &outfit.colors,
        &state.assets_dir,
        &state.sprite_cache,
        scale,
    )
    .await
    .map_err(|e| {
        error!("render_sprite failed in preview: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    let mut headers = HeaderMap::new();
    headers.insert("Content-Type", "image/png".parse().unwrap());
    headers.insert("Cache-Control", "public, max-age=60".parse().unwrap());
    Ok((headers, png))
}

async fn render_sprite_handler(
    State(state): State<AppState>,
    Path(uuid): Path<Uuid>,
    _query: Query<SpriteQuery>,
) -> Result<impl IntoResponse, StatusCode> {
    let outfit = sqlx::query_as::<_, Outfit>(
        "SELECT id, clothes, colors, user_id FROM outfits WHERE id = $1",
    )
    .bind(uuid)
    .fetch_optional(&state.pool)
    .await
    .map_err(|e| {
        error!("DB error in render_sprite_handler: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?
    .ok_or(StatusCode::NOT_FOUND)?;

    let github_username: Option<String> = if let Some(user_id) = outfit.user_id {
        sqlx::query_scalar("SELECT github_username FROM users WHERE id = $1")
            .bind(user_id)
            .fetch_optional(&state.pool)
            .await
            .map_err(|e| {
                error!("DB error fetching user for sprite {}: {}", uuid, e);
                StatusCode::INTERNAL_SERVER_ERROR
            })?
            .flatten()
    } else {
        None
    };

    let outfit_id = outfit.id;
    let gif = get_or_render_card(&state, Some(outfit), Some(outfit_id), github_username).await?;
    card_response(gif)
}

async fn render_active_sprite_handler(
    State(state): State<AppState>,
    Path(username): Path<String>,
    _query: Query<SpriteQuery>,
) -> Result<impl IntoResponse, StatusCode> {
    let row = sqlx::query!(
        "SELECT current_outfit_id, github_username FROM users WHERE username = $1",
        username
    )
    .fetch_optional(&state.pool)
    .await
    .map_err(|e| {
        error!("DB error looking up user {}: {}", username, e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?
    .ok_or(StatusCode::NOT_FOUND)?;

    let outfit: Option<Outfit> = if let Some(outfit_id) = row.current_outfit_id {
        sqlx::query_as::<_, Outfit>(
            "SELECT id, clothes, colors, user_id FROM outfits WHERE id = $1",
        )
        .bind(outfit_id)
        .fetch_optional(&state.pool)
        .await
        .map_err(|e| {
            error!("DB error fetching outfit for {}: {}", username, e);
            StatusCode::INTERNAL_SERVER_ERROR
        })?
    } else {
        None
    };

    let gif = get_or_render_card(&state, outfit, row.current_outfit_id, row.github_username).await?;
    card_response(gif)
}

fn card_response(gif: Vec<u8>) -> Result<impl IntoResponse, StatusCode> {
    let mut headers = HeaderMap::new();
    headers.insert("Content-Type", "image/gif".parse().unwrap());
    headers.insert("Cache-Control", "public, max-age=300".parse().unwrap());
    Ok((headers, gif))
}
