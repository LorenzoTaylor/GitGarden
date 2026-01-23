import type { ColorGroupKey } from './colorConfig';
import { getColorForLayer } from './colorConfig';

interface CharacterDisplayProps {
    accessoryA: string
    accessoryB: string
    accessoryC: string
    accessoryD: string
    arms: string
    backA: string
    backB: string
    body: string
    bottomA: string
    bottomB: string
    chopA: string
    chopB: string
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
    reap: string
    seed: string
    shoes: string
    shoulderA: string
    shoulderB: string
    socks: string
    strikeA: string
    strikeB: string
    topA: string
    topB: string
    water: string
    colors: Record<ColorGroupKey, string>
}

const CharacterDisplay = (props: CharacterDisplayProps) => {
    const { colors, ...assets } = props;

    // Layer order from back to front
    const layers = [
        { key: 'backA', z: 1 },
        { key: 'backB', z: 2 },
        { key: 'body', z: 10 },
        { key: 'head', z: 11 },
        { key: 'face', z: 12 },
        { key: 'ears', z: 13 },
        { key: 'eyes', z: 14 },
        { key: 'eyebrows', z: 15 },
        { key: 'hairA', z: 20 },
        { key: 'hairB', z: 21 },
        { key: 'hairC', z: 22 },
        { key: 'hairD', z: 23 },
        { key: 'horns', z: 24 },
        { key: 'arms', z: 30 },
        { key: 'gloves', z: 31 },
        { key: 'socks', z: 40 },
        { key: 'shoes', z: 41 },
        { key: 'bottomA', z: 50 },
        { key: 'bottomB', z: 51 },
        { key: 'topA', z: 60 },
        { key: 'topB', z: 61 },
        { key: 'mid', z: 62 },
        { key: 'jacketA', z: 70 },
        { key: 'jacketB', z: 71 },
        { key: 'shoulderA', z: 72 },
        { key: 'shoulderB', z: 73 },
        { key: 'accessoryA', z: 80 },
        { key: 'accessoryB', z: 81 },
        { key: 'accessoryC', z: 82 },
        { key: 'accessoryD', z: 83 },
        { key: 'chopA', z: 90 },
        { key: 'chopB', z: 91 },
        { key: 'strikeA', z: 92 },
        { key: 'strikeB', z: 93 },
        { key: 'reap', z: 94 },
        { key: 'seed', z: 95 },
        { key: 'water', z: 96 },
    ];

    return (
        <div className="relative w-64 h-64">
            <div className="absolute inset-0 origin-center flex items-center justify-center">
                <div className="relative w-16 h-16">
                    {layers.map(({ key, z }) => {
                        const src = assets[key as keyof typeof assets];
                        const color = getColorForLayer(key, colors);

                        if (color) {
                            // Use blend mode to colorize while preserving outlines/highlights
                            // isolation: isolate prevents blend from affecting layers below
                            return (
                                <div
                                    key={key}
                                    className="absolute inset-0 w-full h-full scale-[8] origin-center"
                                    style={{ zIndex: z, isolation: 'isolate' }}
                                >
                                    {/* Base sprite with details */}
                                    <img
                                        src={src}
                                        alt={key}
                                        className="absolute [image-rendering:pixelated] object-none object-[0_0]"
                                    />
                                    {/* Color overlay with multiply blend */}
                                    <div
                                        className="absolute inset-0 [image-rendering:pixelated]"
                                        style={{
                                            backgroundColor: color,
                                            mixBlendMode: 'multiply',
                                            WebkitMaskImage: `url(${src})`,
                                            WebkitMaskRepeat: 'no-repeat',
                                            WebkitMaskSize: 'auto',
                                            WebkitMaskPosition: '0 0',
                                            maskImage: `url(${src})`,
                                            maskRepeat: 'no-repeat',
                                            maskSize: 'auto',
                                            maskPosition: '0 0',
                                        }}
                                    />
                                </div>
                            );
                        } else {
                            // Use regular img for non-colorable layers (tools, etc.)
                            return (
                                <img
                                    key={key}
                                    src={src}
                                    alt={key}
                                    className="absolute inset-0 w-full h-full [image-rendering:pixelated] object-none object-[0_0] scale-[8] origin-center"
                                    style={{ zIndex: z }}
                                />
                            );
                        }
                    })}
                </div>
            </div>
        </div>
    )
}

export default CharacterDisplay
