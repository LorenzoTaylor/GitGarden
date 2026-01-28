/**
 * Canvas utility functions for pixel-based sprite colorization
 */

export interface RGB {
  r: number;
  g: number;
  b: number;
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
 * Colorize a sprite using pixel manipulation
 *
 * Modes:
 * - 'normal': grayscale 0 -> shadow color, grayscale 255 -> target color
 * - 'eyes': dark pixels become white (sclera), light pixels become target color (iris/pupil)
 */
export function colorizeSprite(
  img: HTMLImageElement,
  color: string,
  frameX: number,
  frameY: number,
  width: number,
  height: number,
  mode: ColorizeMode = 'normal',
  shadowStrength: number = 0.7  // 0 = no shadow (flat color), 1 = full black shadows
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

  // Transform each pixel
  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3];
    if (alpha === 0) continue; // Skip transparent pixels

    // Get grayscale value (R channel, since image is grayscale R = G = B)
    const gray = data[i];

    if (mode === 'eyes') {
      // For eyes: dark pixels (sclera) become white, light pixels get the eye color
      const threshold = 128;
      if (gray < threshold) {
        // Sclera - make it white
        data[i] = 255;
        data[i + 1] = 255;
        data[i + 2] = 255;
      } else {
        // Iris/pupil - apply color
        const factor = (gray - threshold) / (255 - threshold);
        data[i] = Math.round(factor * rgb.r);
        data[i + 1] = Math.round(factor * rgb.g);
        data[i + 2] = Math.round(factor * rgb.b);
      }
    } else {
      // Normal mode with adjustable shadow strength
      const factor = gray / 255;
      // Lerp between flat color and fully shaded
      const minBrightness = 1 - shadowStrength;
      const adjustedFactor = minBrightness + factor * shadowStrength;

      data[i] = Math.round(adjustedFactor * rgb.r);
      data[i + 1] = Math.round(adjustedFactor * rgb.g);
      data[i + 2] = Math.round(adjustedFactor * rgb.b);
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}
