export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface HSL {
  h: number;
  s: number;
  l: number;
}

export function rgbToHsl(rgb: RGB): HSL {
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max === min) {
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

export function hslToRgb(hsl: HSL): RGB {
  const { h, s, l } = hsl;

  if (s === 0) {
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

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
}

export function hexToRgb(hex: string): RGB {
  const cleanHex = hex.replace(/^#/, '');
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

export function getCacheKey(
  url: string,
  color: string | null,
  mode: ColorizeMode = 'normal',
  shadowStrength: number = 0.7
): string {
  return `${url}|${color ?? 'none'}|${mode}|${shadowStrength}`;
}

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
  ctx.drawImage(img, frameX, frameY, width, height, 0, 0, width, height);
  return canvas;
}

export type ColorizeMode = 'normal' | 'eyes';

/*
 * Palette generation uses HSL to create natural-looking shades.
 * Based on Memao's approach: darker shades have reduced saturation
 * and slightly warmer hue to prevent oversaturated shadows.
 * Ratios derived from analyzing Memao skin tone palettes.
 */
function generatePalette(rgb: RGB): RGB[] {
  const hsl = rgbToHsl(rgb);
  const baseL = hsl.l;
  const baseS = hsl.s;

  return [
    hslToRgb({ h: hsl.h + 8, s: baseS * 0.58, l: baseL * 0.34 }),
    hslToRgb({ h: hsl.h + 4, s: baseS * 0.85, l: baseL * 0.55 }),
    hslToRgb({ h: hsl.h + 2, s: baseS * 0.95, l: baseL * 0.75 }),
    rgb,
  ];
}

const EYE_SCLERA: RGB = { r: 255, g: 240, b: 247 };

/*
 * Eye sprites have inverted grayscale mapping (darkest pixels = sclera).
 * Sclera is always #fff0f7 to match Memao's style.
 */
function generateEyePalette(rgb: RGB): RGB[] {
  const hsl = rgbToHsl(rgb);
  const baseL = hsl.l;

  return [
    EYE_SCLERA,
    hslToRgb({ h: hsl.h, s: hsl.s, l: baseL * 0.45 }),
    hslToRgb({ h: hsl.h, s: hsl.s, l: baseL * 0.7 }),
    rgb,
  ];
}

function findClosestPaletteIndex(gray: number): number {
  if (gray <= 48) return 0;
  if (gray <= 127) return 1;
  if (gray <= 212) return 2;
  return 3;
}

export function colorizeSprite(
  img: HTMLImageElement,
  color: string,
  frameX: number,
  frameY: number,
  width: number,
  height: number,
  mode: ColorizeMode = 'normal',
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  ctx.drawImage(img, frameX, frameY, width, height, 0, 0, width, height);

  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const rgb = hexToRgb(color);
  const palette = mode === 'eyes' ? generateEyePalette(rgb) : generatePalette(rgb);

  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3];
    if (alpha === 0) continue;

    const gray = data[i];
    const idx = findClosestPaletteIndex(gray);
    const c = palette[idx];
    data[i] = c.r;
    data[i + 1] = c.g;
    data[i + 2] = c.b;
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}
