import { useState } from "react"
import { assetRegistry, defaultAssets } from "../../../../public/assets/asset-registry"
import CharacterDisplay from "./CharacterDisplay"
import DisplayBackgroundGif from "./DisplayBackground.gif";
import type { ColorGroupKey } from "./colorConfig";
import {
  defaultColors,
  skinTones,
  hairColors,
  eyeColors,
  clothingColors,
  getColorGroupForLayer
} from "./colorConfig";

// Y offset for preview thumbnails (in pixels, negative = up, positive = down)
const previewOffsets: Record<string, number> = {
  // Head area (high on sprite)
  horns: 12,
  ears: 6,
  eyes: 6,
  eyebrows: 0,
  face: 4,
  head: 7,
  // Hair (slightly lower than face)
  hairA: 10,
  hairB: 10,
  hairC: 10,
  hairD: 1,
  // Body/torso area
  body: 0,
  arms: -5,
  // Tops
  topA: -3,
  topB: -3,
  mid: -7,
  jacketA: -3,
  jacketB: -3,
  shoulderA: -2,
  shoulderB: -4,
  // Accessories
  accessoryA: 5,
  accessoryB: 11,
  accessoryC: -1,
  accessoryD: 11,
  backA: -1,
  // Bottoms
  bottomA: -10,
  bottomB: -4,
  // Feet (lowest)
  socks: -14,
  shoes: -15,
  gloves: -7,
};

// Color selector component
const ColorSelector = ({
  colors,
  selectedColor,
  onSelect
}: {
  colors: { name: string; color: string }[]
  selectedColor: string
  onSelect: (color: string) => void
}) => (
  <div className="mb-3">
    <div className="flex gap-1 flex-wrap">
      {colors.map(({ name, color }) => (
        <button
          key={color}
          onClick={() => onSelect(color)}
          className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${
            selectedColor === color ? 'border-white ring-2 ring-blue-500' : 'border-neutral-600'
          }`}
          style={{ backgroundColor: color }}
          title={name}
        />
      ))}
    </div>
  </div>
);

const CharacterCreator = () => {
  const [selectedClothes, setSelectedClothes] = useState({...defaultAssets});
  const [colors, setColors] = useState<Record<ColorGroupKey, string>>({...defaultColors});
  const [clothingTab, setClothingTab] = useState<ColorGroupKey>('topA');

  const updateColor = (group: ColorGroupKey, color: string) => {
    setColors(prev => ({ ...prev, [group]: color }));
  };

  const colorGroup = getColorGroupForLayer(clothingTab);
  const currentColor = colorGroup ? colors[colorGroup] : undefined;

  // Get the right color palette for the current group
  const getColorPalette = (group: ColorGroupKey | null) => {
    if (!group) return clothingColors;
    if (group === 'skin') return skinTones;
    if (group === 'hair') return hairColors;
    if (group === 'eyes') return eyeColors;
    return clothingColors;
  };

  console.log('clothingTab:', clothingTab);
  console.log('colorGroup:', colorGroup);
  console.log('currentColor:', currentColor);

  return (
    <div className="max-w-4xl mx-auto py-4 pr-4 dark:bg-neutral-900 h-full w-full rounded-xl max-h-[80vh] flex flex-col">
      <h1 className="text-3xl mb-4 dark:text-neutral-100 pl-4">Character Creator</h1>
      <hr className="dark:border-neutral-800"/>
      <div className="flex flex-row w-full flex-1 gap-4">
        {/* Asset selector panel */}
        <div className="flex-1 bg-neutral-700 max-w-[30%] p-4 overflow-y-auto max-h-[70vh] rounded-lg">
          <h2 className="text-lg font-semibold dark:text-neutral-100 mb-3">Assets</h2>
          <ul className="w-full space-y-1">
            {Object.keys(assetRegistry).map((category) => (
              <div key={category} className="flex items-center gap-2 p-1 hover:bg-neutral-600 rounded cursor-pointer" onClick={() => {setClothingTab(category as ColorGroupKey)}}>
                <div className="w-10 h-10 overflow-hidden relative">
                  <img
                    src={(assetRegistry as Record<string, {url: string}[]>)[category][0]?.url}
                    alt={category}
                    className="absolute w-full h-full [image-rendering:pixelated] object-none scale-[2.5] origin-center"
                    style={{ objectPosition: `3px ${(previewOffsets[category] ?? 0) * 0.6}px` }}
                  />
                </div>
                <span className="text-sm dark:text-neutral-200">{category}</span>
              </div>
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-4 flex-1">
        <div className="flex-1 bg-neutral-700 p-4 overflow-y-auto max-h-[60vh] h-full rounded-lg flex flex-col items-center">
          <h3 className="text-sm font-medium dark:text-neutral-300 mb-2 capitalize text-center">{clothingTab}</h3>
          <div className="flex flex-wrap gap-2 justify-center w-full">
            {(assetRegistry as Record<string, {id: string; name: string; url: string}[]>)[clothingTab]?.map((asset) => (
                <button
                key={asset.id}
                onClick={() => setSelectedClothes(prev => ({ ...prev, [clothingTab]: asset.url }))}
                className={`relative w-16 h-16 overflow-hidden rounded border-2 transition-transform hover:scale-105 ${
                  selectedClothes[clothingTab as keyof typeof selectedClothes] === asset.url
                  ? 'border-blue-500 ring-2 ring-blue-500'
                  : 'border-neutral-600 hover:border-neutral-500'
                }`}
                >
                <img
                  src={asset.url}
                  alt={asset.name}
                  className="absolute w-full h-full [image-rendering:pixelated] object-none scale-[4] origin-center"
                  style={{ objectPosition: `6px ${previewOffsets[clothingTab] ?? 0}px` }}
                />
                </button>
            ))}
          </div>
        </div>

        <div className="flex-1 bg-neutral-700 p-4 overflow-y-auto max-h-[10vh] rounded-lg">
          {colorGroup && (
            <ColorSelector
              colors={getColorPalette(colorGroup)}
              selectedColor={currentColor ?? ''}
              onSelect={(c) => updateColor(colorGroup, c)}
            />
          )}
        </div>
        </div>

        {/* Character preview */}
        <div
          className="flex-1 flex items-center justify-center bg-neutral-600 rounded-xl overflow-hidden relative"
          style={{
            backgroundImage: `url(${DisplayBackgroundGif})`,
            backgroundSize: '430%',
            backgroundPosition: 'center bottom',
          }}
        >
          <div className="absolute inset-0 bg-neutral-800 opacity-30 z-0"></div>
            <div className="relative z-10 w-64 h-64">
            <CharacterDisplay {...selectedClothes} colors={colors} />
            </div>
        </div>
      </div>
      <hr className="dark:border-neutral-800"/>
    </div>
  )
}

export default CharacterCreator
