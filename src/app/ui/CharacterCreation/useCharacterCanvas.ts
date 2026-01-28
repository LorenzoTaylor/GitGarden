import { useEffect, useRef, useState, useMemo } from 'react';
import { loadImage, colorizeSprite, extractFrame, getCacheKey, type ColorizeMode } from './canvasUtils';

export interface LayerConfig {
  key: string;
  z: number;
  src: string;
  color: string | null;
  mode?: ColorizeMode;
  shadowStrength?: number;
}

interface UseCharacterCanvasOptions {
  layers: LayerConfig[];
  width?: number;
  height?: number;
  frameX?: number;
  frameY?: number;
  scale?: number;
  canvasWidth?: number;
  canvasHeight?: number;
}

interface UseCharacterCanvasResult {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  isLoading: boolean;
  error: string | null;
}

export function useCharacterCanvas({
  layers,
  width = 48,
  height = 48,
  frameX = 0,
  frameY = 0,
  scale = 3,
  canvasWidth,
  canvasHeight,
}: UseCharacterCanvasOptions): UseCharacterCanvasResult {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cache for loaded images
  const imageCache = useRef<Map<string, HTMLImageElement>>(new Map());
  // Cache for colorized layers
  const colorizedCache = useRef<Map<string, HTMLCanvasElement>>(new Map());

  // Sort layers by z-index for correct rendering order
  const sortedLayers = useMemo(
    () => [...layers].sort((a, b) => a.z - b.z),
    [layers]
  );

  useEffect(() => {
    let cancelled = false;

    async function render() {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        setError('Could not get canvas context');
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Load all unique images
        const uniqueSrcs = [...new Set(sortedLayers.map(l => l.src))];
        await Promise.all(
          uniqueSrcs.map(async (src) => {
            if (!imageCache.current.has(src)) {
              const img = await loadImage(src);
              if (!cancelled) {
                imageCache.current.set(src, img);
              }
            }
          })
        );

        if (cancelled) return;

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Disable image smoothing for crisp pixel art
        ctx.imageSmoothingEnabled = false;

        // Calculate centering offset
        const drawWidth = width * scale;
        const drawHeight = height * scale;
        const actualCanvasWidth = canvasWidth ?? drawWidth;
        const actualCanvasHeight = canvasHeight ?? drawHeight;
        const offsetX = Math.floor((actualCanvasWidth - drawWidth) / 2);
        const offsetY = Math.floor((actualCanvasHeight - drawHeight) / 2);

        // Process and draw each layer
        for (const layer of sortedLayers) {
          const img = imageCache.current.get(layer.src);
          if (!img) continue;

          const cacheKey = getCacheKey(layer.src, layer.color, layer.mode, layer.shadowStrength);
          let layerCanvas = colorizedCache.current.get(cacheKey);

          if (!layerCanvas) {
            // Create and cache the colorized (or extracted) layer
            if (layer.color) {
              layerCanvas = colorizeSprite(
                img,
                layer.color,
                frameX,
                frameY,
                width,
                height,
                layer.mode ?? 'normal',
                layer.shadowStrength ?? 0.6
              );
            } else {
              layerCanvas = extractFrame(img, frameX, frameY, width, height);
            }
            colorizedCache.current.set(cacheKey, layerCanvas);
          }

          // Draw the layer to the main canvas (scaled and centered)
          ctx.drawImage(layerCanvas, 0, 0, width, height, offsetX, offsetY, drawWidth, drawHeight);
        }

        setIsLoading(false);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unknown error');
          setIsLoading(false);
        }
      }
    }

    render();

    return () => {
      cancelled = true;
    };
  }, [sortedLayers, width, height, frameX, frameY, scale, canvasWidth, canvasHeight]);

  return { canvasRef, isLoading, error };
}
