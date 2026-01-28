import { useMemo } from 'react';
import type { ColorGroupKey } from './colorConfig';
import { getColorForLayer } from './colorConfig';
import { useCharacterCanvas, type LayerConfig } from './useCharacterCanvas';

interface CharacterDisplayProps {
    accessoryA: string
    accessoryB: string
    accessoryC: string
    accessoryD: string
    arms: string
    backA: string
    body: string
    bottomA: string
    bottomB: string
    ears: string
    eyebrows: string
    eyes: string
    face: string
    gloves: string
    hairA: string
    hairB: string
    hairC: string
    hairD: string
    head: string
    horns: string
    jacketA: string
    jacketB: string
    mid: string
    shoes: string
    shoulderA: string
    shoulderB: string
    socks: string
    topA: string
    topB: string
    colors: Record<ColorGroupKey, string>
}

const CharacterDisplay = (props: CharacterDisplayProps) => {
    const { colors, ...assets } = props;

    const layers: LayerConfig[] = useMemo(() => [
        // Back layers
        { key: 'backA', z: 1, src: assets.backA, color: getColorForLayer('backA', colors) },
        // Body & head
        { key: 'body', z: 10, src: assets.body, color: getColorForLayer('body', colors) },
        { key: 'head', z: 11, src: assets.head, color: getColorForLayer('head', colors) },
        { key: 'face', z: 12, src: assets.face, color: getColorForLayer('face', colors) },
        { key: 'ears', z: 13, src: assets.ears, color: getColorForLayer('ears', colors) },
        { key: 'horns', z: 14, src: assets.horns, color: getColorForLayer('horns', colors) },
        { key: 'eyes', z: 15, src: assets.eyes, color: getColorForLayer('eyes', colors), mode: 'eyes' },
        { key: 'eyebrows', z: 16, src: assets.eyebrows, color: getColorForLayer('eyebrows', colors) },
        // Hair
        { key: 'hairA', z: 20, src: assets.hairA, color: getColorForLayer('hairA', colors) },
        { key: 'hairB', z: 21, src: assets.hairB, color: getColorForLayer('hairB', colors) },
        { key: 'hairC', z: 22, src: assets.hairC, color: getColorForLayer('hairC', colors) },
        { key: 'hairD', z: 23, src: assets.hairD, color: getColorForLayer('hairD', colors) },
        // Arms & gloves
        { key: 'arms', z: 30, src: assets.arms, color: getColorForLayer('arms', colors) },
        { key: 'gloves', z: 31, src: assets.gloves, color: getColorForLayer('gloves', colors) },
        // Legs & feet
        { key: 'socks', z: 40, src: assets.socks, color: getColorForLayer('socks', colors) },
        { key: 'shoes', z: 41, src: assets.shoes, color: getColorForLayer('shoes', colors) },
        // Clothing - bottom
        { key: 'bottomA', z: 50, src: assets.bottomA, color: getColorForLayer('bottomA', colors) },
        { key: 'bottomB', z: 51, src: assets.bottomB, color: getColorForLayer('bottomB', colors) },
        // Clothing - mid & top
        { key: 'mid', z: 55, src: assets.mid, color: getColorForLayer('mid', colors) },
        { key: 'topA', z: 60, src: assets.topA, color: getColorForLayer('topA', colors) },
        { key: 'topB', z: 61, src: assets.topB, color: getColorForLayer('topB', colors) },
        // Jackets & shoulders
        { key: 'jacketA', z: 65, src: assets.jacketA, color: getColorForLayer('jacketA', colors) },
        { key: 'jacketB', z: 66, src: assets.jacketB, color: getColorForLayer('jacketB', colors) },
        { key: 'shoulderA', z: 2, src: assets.shoulderA, color: getColorForLayer('shoulderA', colors) },
        { key: 'shoulderB', z: 3, src: assets.shoulderB, color: getColorForLayer('shoulderB', colors) },
        // Accessories
        { key: 'accessoryA', z: 70, src: assets.accessoryA, color: getColorForLayer('accessoryA', colors) },
        { key: 'accessoryB', z: 71, src: assets.accessoryB, color: getColorForLayer('accessoryB', colors) },
        { key: 'accessoryC', z: 72, src: assets.accessoryC, color: getColorForLayer('accessoryC', colors) },
        { key: 'accessoryD', z: 73, src: assets.accessoryD, color: getColorForLayer('accessoryD', colors) },
    ], [assets, colors]);

    const { canvasRef, isLoading } = useCharacterCanvas({
        layers,
        width: 48,
        height: 48,
        frameX: 0,
        frameY: 0,
        scale: 7,
        canvasWidth: 240,
        canvasHeight: 280,
    });

    return (
        <div className="relative w-64 h-64 flex items-center justify-center">
            {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                </div>
            )}
            <canvas
                ref={canvasRef}
                width={240}
                height={280}
                className="[image-rendering:pixelated]"
                style={{ opacity: isLoading ? 0 : 1 }}
            />
        </div>
    );
};

export default CharacterDisplay;
