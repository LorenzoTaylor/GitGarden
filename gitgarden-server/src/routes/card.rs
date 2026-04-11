#![allow(dead_code)]

use std::io::Cursor;

use ab_glyph::{FontArc, PxScale};
use axum::{
    extract::{Path, State},
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
};
use image::{
    AnimationDecoder, DynamicImage, GenericImageView, ImageFormat, Rgba, RgbaImage,
    codecs::gif::GifDecoder,
};
use imageproc::drawing::draw_text_mut;
use tracing::error;

use crate::AppState;
use crate::github;
use crate::models::outfit::Outfit;

const CARD_W: u32 = 900;
const CARD_H: u32 = 280;

static FONT_BYTES: &[u8] = include_bytes!("../../sprite_assets/PressStart2P-Regular.ttf");

pub async fn get_card(
    State(state): State<AppState>,
    Path(github_username): Path<String>,
) -> Result<impl IntoResponse, StatusCode> {
    // Look up user by github_username
    let user = sqlx::query!(
        "SELECT id, current_outfit_id FROM users WHERE github_username = $1",
        github_username
    )
    .fetch_optional(&state.pool)
    .await
    .map_err(|e| {
        error!(
            "DB error looking up user by github_username {}: {}",
            github_username, e
        );
        StatusCode::INTERNAL_SERVER_ERROR
    })?
    .ok_or(StatusCode::NOT_FOUND)?;

    // Get current outfit if set
    let outfit: Option<Outfit> = if let Some(outfit_id) = user.current_outfit_id {
        sqlx::query_as::<_, Outfit>(
            "SELECT id, clothes, colors, user_id FROM outfits WHERE id = $1",
        )
        .bind(outfit_id)
        .fetch_optional(&state.pool)
        .await
        .map_err(|e| {
            error!("DB error fetching outfit {}: {}", outfit_id, e);
            StatusCode::INTERNAL_SERVER_ERROR
        })?
    } else {
        None
    };

    // Resolve the best available token: prefer the user's own OAuth token so private
    // contributions are included; fall back to the server-side GITHUB_TOKEN.
    let user_token = github::get_user_github_token(&state.pool, &github_username).await;
    let token = user_token
        .as_deref()
        .filter(|t| !t.is_empty())
        .unwrap_or(&state.github_token);

    if token.is_empty() {
        error!("No GitHub token available for {}", github_username);
        return Err(StatusCode::INTERNAL_SERVER_ERROR);
    }

    // Fetch GitHub stats
    let stats = github::fetch_github_stats(
        &github_username,
        token,
        &state.github_stats_cache,
    )
    .await
    .map_err(|e| {
        error!(
            "Failed to fetch GitHub stats for {}: {}",
            github_username, e
        );
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    // Build canvas
    let mut canvas = RgbaImage::new(CARD_W, CARD_H);

    // Load and draw background GIF (first frame)
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
            Err(e) => {
                error!("Failed to decode DisplayBackground.gif: {}", e);
            }
        },
        Err(e) => {
            error!("Failed to read DisplayBackground.gif: {}", e);
        }
    }

    // Dark overlay for readability
    let overlay_alpha = 140u8;
    for y in 0..CARD_H {
        for x in 0..CARD_W {
            let px = canvas.get_pixel(x, y);
            let bg_a = px[3] as f32 / 255.0;
            let ov_a = overlay_alpha as f32 / 255.0;
            let out_a = ov_a + bg_a * (1.0 - ov_a);
            if out_a > 0.0 {
                let out_r = (0.0 * ov_a + px[0] as f32 * bg_a * (1.0 - ov_a)) / out_a;
                let out_g = (0.0 * ov_a + px[1] as f32 * bg_a * (1.0 - ov_a)) / out_a;
                let out_b = (0.0 * ov_a + px[2] as f32 * bg_a * (1.0 - ov_a)) / out_a;
                canvas.put_pixel(
                    x,
                    y,
                    Rgba([
                        out_r.round() as u8,
                        out_g.round() as u8,
                        out_b.round() as u8,
                        (out_a * 255.0).round() as u8,
                    ]),
                );
            } else {
                canvas.put_pixel(x, y, Rgba([0, 0, 0, overlay_alpha]));
            }
        }
    }

    // Load font
    let font = FontArc::try_from_slice(FONT_BYTES).map_err(|e| {
        error!("Failed to load PressStart2P font: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    let white = Rgba([255u8, 255u8, 255u8, 255u8]);
    let green = Rgba([80u8, 200u8, 100u8, 255u8]);

    // Stats panel — left column starting at x=30
    // "@{github_username}" in white, scale 14.0, y=35
    draw_text_mut(
        &mut canvas,
        white,
        30,
        35,
        PxScale::from(14.0),
        &font,
        &format!("@{github_username}"),
    );

    // COMMITS label — green, scale 8.0, y=90
    draw_text_mut(
        &mut canvas,
        green,
        30,
        90,
        PxScale::from(8.0),
        &font,
        "COMMITS",
    );
    // commits value — white, scale 12.0, y=108
    draw_text_mut(
        &mut canvas,
        white,
        30,
        108,
        PxScale::from(12.0),
        &font,
        &stats.commits_last_year.to_string(),
    );

    // STREAK label — green, scale 8.0, y=148
    draw_text_mut(
        &mut canvas,
        green,
        30,
        148,
        PxScale::from(8.0),
        &font,
        "STREAK",
    );
    // streak value — white, scale 12.0, y=166
    draw_text_mut(
        &mut canvas,
        white,
        30,
        166,
        PxScale::from(12.0),
        &font,
        &format!("{} DAYS", stats.current_streak),
    );

    // STARS label — green, scale 8.0, y=206
    draw_text_mut(
        &mut canvas,
        green,
        30,
        206,
        PxScale::from(8.0),
        &font,
        "STARS",
    );
    // stars value — white, scale 12.0, y=224
    draw_text_mut(
        &mut canvas,
        white,
        30,
        224,
        PxScale::from(12.0),
        &font,
        &stats.total_stars.to_string(),
    );

    // Second column at x=280
    // PULL REQUESTS label — green, scale 8.0, y=90
    draw_text_mut(
        &mut canvas,
        green,
        280,
        90,
        PxScale::from(8.0),
        &font,
        "PULL REQUESTS",
    );
    // prs value — white, scale 12.0, y=108
    draw_text_mut(
        &mut canvas,
        white,
        280,
        108,
        PxScale::from(12.0),
        &font,
        &stats.merged_prs.to_string(),
    );

    // Sprite panel (right, x:580 to 900)
    if let Some(outfit) = outfit {
        match crate::sprite::render_sprite(
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
                        // Sprite at scale 4 is 192x192
                        // Center at x:740, y:140 → x_offset = 740-96=644, y_offset = 140-96=44
                        let sprite_rgba = sprite_img.to_rgba8();
                        let x_offset: i64 = 644;
                        let y_offset: i64 = 44;
                        let sw = sprite_rgba.width();
                        let sh = sprite_rgba.height();

                        for sy in 0..sh {
                            for sx in 0..sw {
                                let cx = x_offset + sx as i64;
                                let cy = y_offset + sy as i64;
                                if cx < 0 || cy < 0 || cx >= CARD_W as i64 || cy >= CARD_H as i64 {
                                    continue;
                                }
                                let src_px = sprite_rgba.get_pixel(sx, sy);
                                let src_a = src_px[3] as f32 / 255.0;
                                if src_a == 0.0 {
                                    continue;
                                }
                                let dst_px = canvas.get_pixel(cx as u32, cy as u32);
                                let dst_a = dst_px[3] as f32 / 255.0;
                                let out_a = src_a + dst_a * (1.0 - src_a);
                                if out_a > 0.0 {
                                    let out_r = (src_px[0] as f32 * src_a
                                        + dst_px[0] as f32 * dst_a * (1.0 - src_a))
                                        / out_a;
                                    let out_g = (src_px[1] as f32 * src_a
                                        + dst_px[1] as f32 * dst_a * (1.0 - src_a))
                                        / out_a;
                                    let out_b = (src_px[2] as f32 * src_a
                                        + dst_px[2] as f32 * dst_a * (1.0 - src_a))
                                        / out_a;
                                    canvas.put_pixel(
                                        cx as u32,
                                        cy as u32,
                                        Rgba([
                                            out_r.round() as u8,
                                            out_g.round() as u8,
                                            out_b.round() as u8,
                                            (out_a * 255.0).round() as u8,
                                        ]),
                                    );
                                }
                            }
                        }
                    }
                    Err(e) => {
                        error!("Failed to decode sprite PNG for card: {}", e);
                    }
                }
            }
            Err(e) => {
                error!("Failed to render sprite for card: {}", e);
            }
        }
    }

    // Encode canvas to PNG
    let dynamic = DynamicImage::ImageRgba8(canvas);
    let mut buf = Cursor::new(Vec::new());
    dynamic.write_to(&mut buf, ImageFormat::Png).map_err(|e| {
        error!("Failed to encode card PNG: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    let mut headers = HeaderMap::new();
    headers.insert("Content-Type", "image/png".parse().unwrap());
    headers.insert("Cache-Control", "public, max-age=300".parse().unwrap());

    Ok((headers, buf.into_inner()))
}
