use std::collections::HashMap;
use std::io::Cursor;
use std::path::{Path, PathBuf};
use std::sync::Arc;

use image::{DynamicImage, GenericImageView, ImageFormat, RgbaImage};
use tokio::sync::RwLock;

#[derive(Clone, Copy)]
struct Rgb {
    r: f64,
    g: f64,
    b: f64,
}

#[derive(Clone, Copy)]
struct Hsl {
    h: f64,
    s: f64,
    l: f64,
}

fn hex_to_rgb(hex: &str) -> Rgb {
    let clean = hex.trim_start_matches('#');
    let full = if clean.len() == 3 {
        let chars: Vec<char> = clean.chars().collect();
        format!(
            "{}{}{}{}{}{}",
            chars[0], chars[0], chars[1], chars[1], chars[2], chars[2]
        )
    } else {
        clean.to_string()
    };

    let num = u32::from_str_radix(&full, 16).unwrap_or(0);
    Rgb {
        r: ((num >> 16) & 255) as f64,
        g: ((num >> 8) & 255) as f64,
        b: (num & 255) as f64,
    }
}

fn rgb_to_hsl(rgb: Rgb) -> Hsl {
    let r = rgb.r / 255.0;
    let g = rgb.g / 255.0;
    let b = rgb.b / 255.0;

    let max = r.max(g).max(b);
    let min = r.min(g).min(b);
    let l = (max + min) / 2.0;

    if (max - min).abs() < f64::EPSILON {
        return Hsl { h: 0.0, s: 0.0, l };
    }

    let d = max - min;
    let s = if l > 0.5 {
        d / (2.0 - max - min)
    } else {
        d / (max + min)
    };

    let h = if (max - r).abs() < f64::EPSILON {
        let mut h = (g - b) / d;
        if g < b {
            h += 6.0;
        }
        h / 6.0
    } else if (max - g).abs() < f64::EPSILON {
        ((b - r) / d + 2.0) / 6.0
    } else {
        ((r - g) / d + 4.0) / 6.0
    };

    Hsl { h: h * 360.0, s, l }
}

fn hue2rgb(p: f64, q: f64, mut t: f64) -> f64 {
    if t < 0.0 {
        t += 1.0;
    }
    if t > 1.0 {
        t -= 1.0;
    }
    if t < 1.0 / 6.0 {
        return p + (q - p) * 6.0 * t;
    }
    if t < 1.0 / 2.0 {
        return q;
    }
    if t < 2.0 / 3.0 {
        return p + (q - p) * (2.0 / 3.0 - t) * 6.0;
    }
    p
}

fn hsl_to_rgb(hsl: Hsl) -> Rgb {
    if hsl.s.abs() < f64::EPSILON {
        let gray = (hsl.l * 255.0).round();
        return Rgb {
            r: gray,
            g: gray,
            b: gray,
        };
    }

    let q = if hsl.l < 0.5 {
        hsl.l * (1.0 + hsl.s)
    } else {
        hsl.l + hsl.s - hsl.l * hsl.s
    };
    let p = 2.0 * hsl.l - q;
    let h_norm = hsl.h / 360.0;

    Rgb {
        r: (hue2rgb(p, q, h_norm + 1.0 / 3.0) * 255.0).round(),
        g: (hue2rgb(p, q, h_norm) * 255.0).round(),
        b: (hue2rgb(p, q, h_norm - 1.0 / 3.0) * 255.0).round(),
    }
}

fn generate_palette(rgb: Rgb) -> [Rgb; 4] {
    let hsl = rgb_to_hsl(rgb);
    [
        hsl_to_rgb(Hsl {
            h: hsl.h + 8.0,
            s: hsl.s * 0.58,
            l: hsl.l * 0.34,
        }),
        hsl_to_rgb(Hsl {
            h: hsl.h + 4.0,
            s: hsl.s * 0.85,
            l: hsl.l * 0.55,
        }),
        hsl_to_rgb(Hsl {
            h: hsl.h + 2.0,
            s: hsl.s * 0.95,
            l: hsl.l * 0.75,
        }),
        rgb,
    ]
}

const EYE_SCLERA: Rgb = Rgb {
    r: 255.0,
    g: 240.0,
    b: 247.0,
};

fn generate_eye_palette(rgb: Rgb) -> [Rgb; 4] {
    let hsl = rgb_to_hsl(rgb);
    [
        EYE_SCLERA,
        hsl_to_rgb(Hsl {
            h: hsl.h,
            s: hsl.s,
            l: hsl.l * 0.45,
        }),
        hsl_to_rgb(Hsl {
            h: hsl.h,
            s: hsl.s,
            l: hsl.l * 0.7,
        }),
        rgb,
    ]
}

fn find_closest_palette_index(gray: u8) -> usize {
    if gray <= 48 {
        0
    } else if gray <= 127 {
        1
    } else if gray <= 212 {
        2
    } else {
        3
    }
}

#[derive(Clone, Copy, PartialEq)]
pub enum ColorizeMode {
    Normal,
    Eyes,
}

fn colorize(img: &DynamicImage, hex: &str, mode: ColorizeMode) -> RgbaImage {
    let (w, h) = img.dimensions();
    // Crop top-left 48x48 frame
    let frame_w = w.min(48);
    let frame_h = h.min(48);
    let frame = img.crop_imm(0, 0, frame_w, frame_h);
    let mut buf = frame.to_rgba8();

    let rgb = hex_to_rgb(hex);
    let palette = if mode == ColorizeMode::Eyes {
        generate_eye_palette(rgb)
    } else {
        generate_palette(rgb)
    };

    for pixel in buf.pixels_mut() {
        if pixel[3] == 0 {
            continue;
        }
        let gray = pixel[0];
        let idx = find_closest_palette_index(gray);
        let c = &palette[idx];
        pixel[0] = c.r.clamp(0.0, 255.0) as u8;
        pixel[1] = c.g.clamp(0.0, 255.0) as u8;
        pixel[2] = c.b.clamp(0.0, 255.0) as u8;
    }

    buf
}

fn extract_frame(img: &DynamicImage) -> RgbaImage {
    let (w, h) = img.dimensions();
    let frame_w = w.min(48);
    let frame_h = h.min(48);
    img.crop_imm(0, 0, frame_w, frame_h).to_rgba8()
}

/// Sanitize a URL path from the clothes JSON to a safe filesystem path.
fn sanitize_asset_path(url: &str) -> Option<String> {
    let path = url.trim_start_matches('/');
    if path.contains("..") {
        return None;
    }
    Some(path.to_string())
}

async fn load_image_cached(
    path: &Path,
    cache: &RwLock<HashMap<String, Arc<DynamicImage>>>,
) -> Result<Arc<DynamicImage>, String> {
    let key = path.to_string_lossy().to_string();

    // Check read cache first
    {
        let read = cache.read().await;
        if let Some(img) = read.get(&key) {
            return Ok(Arc::clone(img));
        }
    }

    // Load from disk
    let img = image::open(path).map_err(|e| format!("Failed to load {key}: {e}"))?;
    let img = Arc::new(img);

    {
        let mut write = cache.write().await;
        write.insert(key, Arc::clone(&img));
    }

    Ok(img)
}

/// Layer definition matching CharacterDisplay.tsx
struct LayerDef {
    key: &'static str,
    z: u32,
    mode: ColorizeMode,
}

const LAYERS: &[LayerDef] = &[
    LayerDef {
        key: "backA",
        z: 1,
        mode: ColorizeMode::Normal,
    },
    LayerDef {
        key: "shoulderA",
        z: 2,
        mode: ColorizeMode::Normal,
    },
    LayerDef {
        key: "shoulderB",
        z: 3,
        mode: ColorizeMode::Normal,
    },
    LayerDef {
        key: "body",
        z: 10,
        mode: ColorizeMode::Normal,
    },
    LayerDef {
        key: "head",
        z: 11,
        mode: ColorizeMode::Normal,
    },
    LayerDef {
        key: "face",
        z: 12,
        mode: ColorizeMode::Normal,
    },
    LayerDef {
        key: "ears",
        z: 13,
        mode: ColorizeMode::Normal,
    },
    LayerDef {
        key: "horns",
        z: 14,
        mode: ColorizeMode::Normal,
    },
    LayerDef {
        key: "eyes",
        z: 15,
        mode: ColorizeMode::Eyes,
    },
    LayerDef {
        key: "eyebrows",
        z: 16,
        mode: ColorizeMode::Normal,
    },
    LayerDef {
        key: "hairA",
        z: 20,
        mode: ColorizeMode::Normal,
    },
    LayerDef {
        key: "hairB",
        z: 21,
        mode: ColorizeMode::Normal,
    },
    LayerDef {
        key: "hairC",
        z: 22,
        mode: ColorizeMode::Normal,
    },
    LayerDef {
        key: "hairD",
        z: 23,
        mode: ColorizeMode::Normal,
    },
    LayerDef {
        key: "arms",
        z: 30,
        mode: ColorizeMode::Normal,
    },
    LayerDef {
        key: "gloves",
        z: 31,
        mode: ColorizeMode::Normal,
    },
    LayerDef {
        key: "socks",
        z: 40,
        mode: ColorizeMode::Normal,
    },
    LayerDef {
        key: "shoes",
        z: 41,
        mode: ColorizeMode::Normal,
    },
    LayerDef {
        key: "bottomA",
        z: 50,
        mode: ColorizeMode::Normal,
    },
    LayerDef {
        key: "bottomB",
        z: 51,
        mode: ColorizeMode::Normal,
    },
    LayerDef {
        key: "mid",
        z: 55,
        mode: ColorizeMode::Normal,
    },
    LayerDef {
        key: "topA",
        z: 60,
        mode: ColorizeMode::Normal,
    },
    LayerDef {
        key: "topB",
        z: 61,
        mode: ColorizeMode::Normal,
    },
    LayerDef {
        key: "jacketA",
        z: 65,
        mode: ColorizeMode::Normal,
    },
    LayerDef {
        key: "jacketB",
        z: 66,
        mode: ColorizeMode::Normal,
    },
    LayerDef {
        key: "accessoryA",
        z: 70,
        mode: ColorizeMode::Normal,
    },
    LayerDef {
        key: "accessoryB",
        z: 71,
        mode: ColorizeMode::Normal,
    },
    LayerDef {
        key: "accessoryC",
        z: 72,
        mode: ColorizeMode::Normal,
    },
    LayerDef {
        key: "accessoryD",
        z: 73,
        mode: ColorizeMode::Normal,
    },
];

/// Color group mapping (mirrors colorConfig.ts)
fn get_color_group(layer_key: &str) -> Option<&'static str> {
    match layer_key {
        "body" | "head" | "ears" | "arms" => Some("skin"),
        "hairA" | "hairB" | "hairC" | "hairD" | "eyebrows" => Some("hair"),
        "face" => Some("face"),
        "eyes" => Some("eyes"),
        "horns" => Some("horns"),
        "backA" => Some("backA"),
        "topA" => Some("topA"),
        "topB" => Some("topB"),
        "bottomA" => Some("bottomA"),
        "bottomB" => Some("bottomB"),
        "shoes" => Some("shoes"),
        "socks" => Some("socks"),
        "gloves" => Some("gloves"),
        "jacketA" => Some("jacketA"),
        "jacketB" => Some("jacketB"),
        "shoulderA" => Some("shoulderA"),
        "shoulderB" => Some("shoulderB"),
        "accessoryA" => Some("accessoryA"),
        "accessoryB" => Some("accessoryB"),
        "accessoryC" => Some("accessoryC"),
        "accessoryD" => Some("accessoryD"),
        "mid" => Some("mid"),
        _ => None,
    }
}

pub async fn render_sprite(
    clothes: &serde_json::Value,
    colors: &serde_json::Value,
    assets_dir: &Path,
    cache: &RwLock<HashMap<String, Arc<DynamicImage>>>,
    scale: u32,
) -> Result<Vec<u8>, String> {
    // Build sorted layer list
    let mut render_layers: Vec<(&LayerDef, PathBuf, Option<String>)> = Vec::new();

    for layer in LAYERS {
        let src = clothes
            .get(layer.key)
            .and_then(|v| v.as_str())
            .unwrap_or("");

        if src.is_empty() {
            continue;
        }

        let relative = sanitize_asset_path(src)
            .ok_or_else(|| format!("Invalid asset path for layer {}: {}", layer.key, src))?;
        let full_path = assets_dir.join(&relative);

        let color_group = get_color_group(layer.key);
        let color = color_group
            .and_then(|g| colors.get(g))
            .and_then(|v| v.as_str())
            .map(|s| s.to_string());

        render_layers.push((layer, full_path, color));
    }

    render_layers.sort_by_key(|(l, _, _)| l.z);

    // Create 48x48 RGBA canvas
    let mut canvas = RgbaImage::new(48, 48);

    for (layer, path, color) in &render_layers {
        let img = load_image_cached(path, cache).await?;

        let frame = if let Some(hex) = color {
            colorize(&img, hex, layer.mode)
        } else {
            extract_frame(&img)
        };

        // Alpha-composite onto canvas
        for y in 0..frame.height().min(48) {
            for x in 0..frame.width().min(48) {
                let src_pixel = frame.get_pixel(x, y);
                let src_a = src_pixel[3] as f64 / 255.0;
                if src_a == 0.0 {
                    continue;
                }

                let dst_pixel = canvas.get_pixel(x, y);
                let dst_a = dst_pixel[3] as f64 / 255.0;

                let out_a = src_a + dst_a * (1.0 - src_a);
                if out_a == 0.0 {
                    continue;
                }

                let out_r = (src_pixel[0] as f64 * src_a
                    + dst_pixel[0] as f64 * dst_a * (1.0 - src_a))
                    / out_a;
                let out_g = (src_pixel[1] as f64 * src_a
                    + dst_pixel[1] as f64 * dst_a * (1.0 - src_a))
                    / out_a;
                let out_b = (src_pixel[2] as f64 * src_a
                    + dst_pixel[2] as f64 * dst_a * (1.0 - src_a))
                    / out_a;

                canvas.put_pixel(
                    x,
                    y,
                    image::Rgba([
                        out_r.round() as u8,
                        out_g.round() as u8,
                        out_b.round() as u8,
                        (out_a * 255.0).round() as u8,
                    ]),
                );
            }
        }
    }

    // Scale up using nearest-neighbor
    let scaled_w = 48 * scale;
    let scaled_h = 48 * scale;
    let dynamic = DynamicImage::ImageRgba8(canvas);
    let scaled = dynamic.resize_exact(scaled_w, scaled_h, image::imageops::FilterType::Nearest);

    // Encode to PNG
    let mut buf = Cursor::new(Vec::new());
    scaled
        .write_to(&mut buf, ImageFormat::Png)
        .map_err(|e| format!("PNG encode failed: {e}"))?;

    Ok(buf.into_inner())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_hex_to_rgb() {
        let rgb = hex_to_rgb("#e8b89d");
        assert_eq!(rgb.r as u8, 232);
        assert_eq!(rgb.g as u8, 184);
        assert_eq!(rgb.b as u8, 157);
    }

    #[test]
    fn test_hex_to_rgb_short() {
        let rgb = hex_to_rgb("#fff");
        assert_eq!(rgb.r as u8, 255);
        assert_eq!(rgb.g as u8, 255);
        assert_eq!(rgb.b as u8, 255);
    }

    #[test]
    fn test_rgb_hsl_roundtrip() {
        let original = Rgb {
            r: 232.0,
            g: 184.0,
            b: 157.0,
        };
        let hsl = rgb_to_hsl(original);
        let back = hsl_to_rgb(hsl);
        assert!((original.r - back.r).abs() < 1.5);
        assert!((original.g - back.g).abs() < 1.5);
        assert!((original.b - back.b).abs() < 1.5);
    }

    #[test]
    fn test_palette_generation() {
        let rgb = Rgb {
            r: 232.0,
            g: 184.0,
            b: 157.0,
        };
        let palette = generate_palette(rgb);
        assert_eq!(palette.len(), 4);
        // Last entry should be the original color
        assert_eq!(palette[3].r as u8, 232);
        assert_eq!(palette[3].g as u8, 184);
        assert_eq!(palette[3].b as u8, 157);
    }

    #[test]
    fn test_grayscale_mapping() {
        assert_eq!(find_closest_palette_index(0), 0);
        assert_eq!(find_closest_palette_index(48), 0);
        assert_eq!(find_closest_palette_index(49), 1);
        assert_eq!(find_closest_palette_index(127), 1);
        assert_eq!(find_closest_palette_index(128), 2);
        assert_eq!(find_closest_palette_index(212), 2);
        assert_eq!(find_closest_palette_index(213), 3);
        assert_eq!(find_closest_palette_index(255), 3);
    }

    #[test]
    fn test_sanitize_asset_path() {
        assert_eq!(
            sanitize_asset_path("/sprites/body.png"),
            Some("sprites/body.png".to_string())
        );
        assert_eq!(
            sanitize_asset_path("sprites/body.png"),
            Some("sprites/body.png".to_string())
        );
        assert_eq!(sanitize_asset_path("../etc/passwd"), None);
        assert_eq!(sanitize_asset_path("/sprites/../secret"), None);
    }

    #[test]
    fn test_color_group_mapping() {
        assert_eq!(get_color_group("body"), Some("skin"));
        assert_eq!(get_color_group("head"), Some("skin"));
        assert_eq!(get_color_group("hairA"), Some("hair"));
        assert_eq!(get_color_group("eyes"), Some("eyes"));
        assert_eq!(get_color_group("unknown"), None);
    }
}
