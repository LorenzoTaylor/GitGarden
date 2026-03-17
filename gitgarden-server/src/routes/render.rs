use std::io::Cursor;

use ab_glyph::{FontArc, PxScale};
use axum::{
    Router,
    extract::{Path, Query, State},
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
    routing::get,
};
use image::{
    AnimationDecoder, DynamicImage, GenericImageView, ImageFormat, Rgba, RgbaImage,
    codecs::gif::GifDecoder,
};
use imageproc::drawing::draw_text_mut;
use serde::Deserialize;
use tracing::error;
use uuid::Uuid;

use crate::AppState;
use crate::models::outfit::Outfit;
use crate::sprite;

const CARD_W: u32 = 900;
const CARD_H: u32 = 280;

static FONT_BYTES: &[u8] = include_bytes!("../../sprite_assets/PressStart2P-Regular.ttf");

async fn render_card(
    state: &AppState,
    outfit: Option<Outfit>,
    github_username: Option<String>,
) -> Result<Vec<u8>, StatusCode> {
    let mut canvas = RgbaImage::new(CARD_W, CARD_H);

    // Background GIF first frame
    let bg_path = state.assets_dir.join("DisplayBackground.gif");
    match std::fs::read(&bg_path) {
        Ok(gif_bytes) => match GifDecoder::new(Cursor::new(gif_bytes)) {
            Ok(decoder) => {
                let mut frames = decoder.into_frames();
                if let Some(Ok(frame)) = frames.next() {
                    let bg_img = DynamicImage::ImageRgba8(frame.into_buffer());
                    let scaled = bg_img.resize_to_fill(
                        CARD_W,
                        CARD_H,
                        image::imageops::FilterType::Lanczos3,
                    );
                    for y in 0..CARD_H {
                        for x in 0..CARD_W {
                            canvas.put_pixel(x, y, scaled.get_pixel(x, y));
                        }
                    }
                }
            }
            Err(e) => error!("Failed to decode DisplayBackground.gif: {}", e),
        },
        Err(e) => error!("Failed to read DisplayBackground.gif: {}", e),
    }

    // Dark overlay
    for y in 0..CARD_H {
        for x in 0..CARD_W {
            let px = canvas.get_pixel(x, y);
            let bg_a = px[3] as f32 / 255.0;
            let ov_a = 140.0f32 / 255.0;
            let out_a = ov_a + bg_a * (1.0 - ov_a);
            if out_a > 0.0 {
                let out_r = (px[0] as f32 * bg_a * (1.0 - ov_a)) / out_a;
                let out_g = (px[1] as f32 * bg_a * (1.0 - ov_a)) / out_a;
                let out_b = (px[2] as f32 * bg_a * (1.0 - ov_a)) / out_a;
                canvas.put_pixel(
                    x,
                    y,
                    Rgba([out_r as u8, out_g as u8, out_b as u8, (out_a * 255.0) as u8]),
                );
            } else {
                canvas.put_pixel(x, y, Rgba([0, 0, 0, 140]));
            }
        }
    }

    // Stats (only if github_username is set and token is available)
    if let Some(ref gh_user) = github_username {
        if !state.github_token.is_empty() {
            let font = FontArc::try_from_slice(FONT_BYTES).map_err(|e| {
                error!("Failed to load font: {}", e);
                StatusCode::INTERNAL_SERVER_ERROR
            })?;
            let white = Rgba([255u8, 255, 255, 255]);
            let green = Rgba([80u8, 200, 100, 255]);

            match crate::github::fetch_github_stats(
                gh_user,
                &state.github_token,
                &state.github_stats_cache,
            )
            .await
            {
                Ok(stats) => {
                    draw_text_mut(
                        &mut canvas,
                        white,
                        30,
                        35,
                        PxScale::from(14.0),
                        &font,
                        &format!("@{gh_user}"),
                    );

                    draw_text_mut(
                        &mut canvas,
                        green,
                        30,
                        90,
                        PxScale::from(8.0),
                        &font,
                        "COMMITS",
                    );
                    draw_text_mut(
                        &mut canvas,
                        white,
                        30,
                        108,
                        PxScale::from(12.0),
                        &font,
                        &stats.commits_last_year.to_string(),
                    );

                    draw_text_mut(
                        &mut canvas,
                        green,
                        30,
                        148,
                        PxScale::from(8.0),
                        &font,
                        "STREAK",
                    );
                    draw_text_mut(
                        &mut canvas,
                        white,
                        30,
                        166,
                        PxScale::from(12.0),
                        &font,
                        &format!("{} DAYS", stats.current_streak),
                    );

                    draw_text_mut(
                        &mut canvas,
                        green,
                        30,
                        206,
                        PxScale::from(8.0),
                        &font,
                        "STARS",
                    );
                    draw_text_mut(
                        &mut canvas,
                        white,
                        30,
                        224,
                        PxScale::from(12.0),
                        &font,
                        &stats.total_stars.to_string(),
                    );

                    draw_text_mut(
                        &mut canvas,
                        green,
                        280,
                        90,
                        PxScale::from(8.0),
                        &font,
                        "PULL REQUESTS",
                    );
                    draw_text_mut(
                        &mut canvas,
                        white,
                        280,
                        108,
                        PxScale::from(12.0),
                        &font,
                        &stats.merged_prs.to_string(),
                    );
                }
                Err(e) => error!("Failed to fetch GitHub stats for {}: {}", gh_user, e),
            }
        }
    }

    // Sprite (right side, centered at x:740 y:140, resized to 250x250)
    if let Some(outfit) = outfit {
        match sprite::render_sprite(
            &outfit.clothes,
            &outfit.colors,
            &state.assets_dir,
            &state.sprite_cache,
            4,
        )
        .await
        {
            Ok(png_bytes) => {
                match image::load_from_memory_with_format(&png_bytes, ImageFormat::Png) {
                    Ok(sprite_img) => {
                        let resized = image::imageops::resize(
                            &sprite_img.to_rgba8(),
                            250,
                            250,
                            image::imageops::FilterType::Nearest,
                        );
                        let sprite_rgba = resized;
                        let x_offset: i64 = 615;
                        let y_offset: i64 = 15;
                        for sy in 0..sprite_rgba.height() {
                            for sx in 0..sprite_rgba.width() {
                                let cx = x_offset + sx as i64;
                                let cy = y_offset + sy as i64;
                                if cx < 0 || cy < 0 || cx >= CARD_W as i64 || cy >= CARD_H as i64 {
                                    continue;
                                }
                                let src = sprite_rgba.get_pixel(sx, sy);
                                let src_a = src[3] as f32 / 255.0;
                                if src_a == 0.0 {
                                    continue;
                                }
                                let dst = canvas.get_pixel(cx as u32, cy as u32);
                                let dst_a = dst[3] as f32 / 255.0;
                                let out_a = src_a + dst_a * (1.0 - src_a);
                                if out_a > 0.0 {
                                    canvas.put_pixel(
                                        cx as u32,
                                        cy as u32,
                                        Rgba([
                                            ((src[0] as f32 * src_a
                                                + dst[0] as f32 * dst_a * (1.0 - src_a))
                                                / out_a)
                                                as u8,
                                            ((src[1] as f32 * src_a
                                                + dst[1] as f32 * dst_a * (1.0 - src_a))
                                                / out_a)
                                                as u8,
                                            ((src[2] as f32 * src_a
                                                + dst[2] as f32 * dst_a * (1.0 - src_a))
                                                / out_a)
                                                as u8,
                                            (out_a * 255.0) as u8,
                                        ]),
                                    );
                                }
                            }
                        }
                    }
                    Err(e) => error!("Failed to decode sprite PNG: {}", e),
                }
            }
            Err(e) => error!("Failed to render sprite: {}", e),
        }
    }

    // Encode to PNG
    let mut buf = Cursor::new(Vec::new());
    DynamicImage::ImageRgba8(canvas)
        .write_to(&mut buf, ImageFormat::Png)
        .map_err(|e| {
            error!("Failed to encode card PNG: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        })?;

    Ok(buf.into_inner())
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

    // Look up github_username via user_id
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

    let png = render_card(&state, Some(outfit), github_username).await?;
    card_response(png)
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

    let png = render_card(&state, outfit, row.github_username).await?;
    card_response(png)
}

fn card_response(png: Vec<u8>) -> Result<impl IntoResponse, StatusCode> {
    let mut headers = HeaderMap::new();
    headers.insert("Content-Type", "image/png".parse().unwrap());
    headers.insert("Cache-Control", "public, max-age=300".parse().unwrap());
    Ok((headers, png))
}
