/**
 * Canvas utility functions for pixel-based sprite colorization
 */

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface HSL {
  h: number;  // 0-360
  s: number;  // 0-1
  l: number;  // 0-1
}

/**
 * Convert RGB to HSL color space
 */
export function rgbToHsl(rgb: RGB): HSL {
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max === min) {
    // Achromatic (gray)
    return { h: 0, s: 0, l };
  }

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

  let h: number;
  switch (max) {
    case r:
      h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
      break;
    case g:
      h = ((b - r) / d + 2) / 6;
      break;
    default:
      h = ((r - g) / d + 4) / 6;
      break;
  }

  return { h: h * 360, s, l };
}

/**
 * Convert HSL to RGB color space
 */
export function hslToRgb(hsl: HSL): RGB {
  const { h, s, l } = hsl;

  if (s === 0) {
    // Achromatic (gray)
    const gray = Math.round(l * 255);
    return { r: gray, g: gray, b: gray };
  }

  const hue2rgb = (p: number, q: number, t: number): number => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hNorm = h / 360;

  return {
    r: Math.round(hue2rgb(p, q, hNorm + 1 / 3) * 255),
    g: Math.round(hue2rgb(p, q, hNorm) * 255),
    b: Math.round(hue2rgb(p, q, hNorm - 1 / 3) * 255),
  };
}

/**
 * Load an image and return a promise that resolves when loaded
 */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
}

/**
 * Parse a hex color string to RGB values
 */
export function hexToRgb(hex: string): RGB {
  // Remove # if present
  const cleanHex = hex.replace(/^#/, '');

  // Handle shorthand (#RGB)
  const fullHex = cleanHex.length === 3
    ? cleanHex.split('').map(c => c + c).join('')
    : cleanHex;

  const num = parseInt(fullHex, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

/**
 * Generate a cache key for a colorized sprite
 */
export function getCacheKey(
  url: string,
  color: string | null,
  mode: ColorizeMode = 'normal',
  shadowStrength: number = 0.7
): string {
  return `${url}|${color ?? 'none'}|${mode}|${shadowStrength}`;
}

/**
 * Extract a frame from a sprite sheet
 */
export function extractFrame(
  img: HTMLImageElement,
  frameX: number,
  frameY: number,
  width: number,
  height: number
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // Draw the frame from the sprite sheet
  ctx.drawImage(img, frameX, frameY, width, height, 0, 0, width, height);

  return canvas;
}

export type ColorizeMode = 'normal' | 'eyes';

/**
 * Generate a 4-color palette from a base color using HSL color space.
 * The user's chosen color becomes index 3 (lightest).
 * Darker shades reduce both lightness AND saturation to avoid overly intense shadows.
 *
 * Based on Memao palette analysis (e.g., skin tone #f8cbc1):
 * - Lightness ratios: ~0.34, ~0.55, ~0.75, 1.0
 * - Saturation ratios: ~0.58, ~0.80, ~0.95, 1.0 (darker = less saturated)
 * - Hue shifts slightly warmer for darker shades
 */
function generatePalette(rgb: RGB): RGB[] {
  const hsl = rgbToHsl(rgb);
  const baseL = hsl.l;
  const baseS = hsl.s;

  return [
    // [0] Darkest shadow - reduced saturation, slight hue shift
    hslToRgb({ h: hsl.h + 8, s: baseS * 0.58, l: baseL * 0.34 }),
    // [1] Dark shade
    hslToRgb({ h: hsl.h + 4, s: baseS * 0.85, l: baseL * 0.55 }),
    // [2] Mid shade
    hslToRgb({ h: hsl.h + 2, s: baseS * 0.95, l: baseL * 0.75 }),
    // [3] Base color (user's chosen color - lightest)
    rgb,
  ];
}

// Memao eye sclera color - always #fff0f7 (light pink-white)
const EYE_SCLERA: RGB = { r: 255, g: 240, b: 247 };

/**
 * Generate a 4-color eye palette from a base color.
 * Eye sprites have inverted grayscale: darkest pixels = sclera, lightest = eyelashes.
 * Based on Memao's eye coloring:
 * - Index 0 (darkest gray in sprite): Sclera (#fff0f7)
 * - Index 1: Selected color (pupil)
 * - Index 2: Darker pupil shade
 * - Index 3 (lightest gray in sprite): Darkest shade (eyelashes)
 */
function generateEyePalette(rgb: RGB): RGB[] {
  const hsl = rgbToHsl(rgb);
  const baseL = hsl.l;

  return [
    // [0] Sclera - always #fff0f7 (darkest gray in sprite)
    EYE_SCLERA,
    // [1] Eyelash (darkest output)
    hslToRgb({ h: hsl.h, s: hsl.s, l: baseL * 0.45 }),
    // [2] Darker pupil shade
    hslToRgb({ h: hsl.h, s: hsl.s, l: baseL * 0.7 }),
    // [3] Selected color (pupil) - lightest gray in sprite
    rgb,
  ];
}

/**
 * Find the palette index for a given gray value using range-based mapping.
 * Maps grayscale values to 4 palette indices (0-3):
 *   0-48 → 0 (darkest), 49-127 → 1 (dark), 128-212 → 2 (mid), 213-255 → 3 (lightest)
 */
function findClosestPaletteIndex(gray: number): number {
  if (gray <= 48) return 0;       // Darkest
  if (gray <= 127) return 1;      // Dark
  if (gray <= 212) return 2;      // Mid
  return 3;                        // Lightest (base color)
}

/**
 * Colorize a sprite using palette swap (like Memao Sprite Creator)
 *
 * Modes:
 * - 'normal': grayscale values mapped to 4 shades of target color (dark to light)
 * - 'eyes': lightest pixels become sclera (#fff0f7), darker pixels get eye color shades
 */
export function colorizeSprite(
  img: HTMLImageElement,
  color: string,
  frameX: number,
  frameY: number,
  width: number,
  height: number,
  mode: ColorizeMode = 'normal',
  _shadowStrength: number = 0.7  // Kept for API compatibility
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // Draw frame from sprite sheet
  ctx.drawImage(img, frameX, frameY, width, height, 0, 0, width, height);

  // Get pixel data
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const rgb = hexToRgb(color);

  // Use different palette for eyes vs normal sprites
  const palette = mode === 'eyes' ? generateEyePalette(rgb) : generatePalette(rgb);

  // Transform each pixel
  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3];
    if (alpha === 0) continue; // Skip transparent pixels

    // Get grayscale value (R channel, since image is grayscale R = G = B)
    const gray = data[i];

    // Palette swap: find closest grayscale value and use corresponding color
    const idx = findClosestPaletteIndex(gray);
    const c = palette[idx];
    data[i] = c.r;
    data[i + 1] = c.g;
    data[i + 2] = c.b;
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}
