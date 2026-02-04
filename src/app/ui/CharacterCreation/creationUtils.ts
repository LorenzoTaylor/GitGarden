import { assetRegistry, defaultAssets } from "../../../assets/asset-registry";
import {
  skinTones,
  hairColors,
  eyeColors,
  clothingColors,
  type ColorGroupKey
} from "./colorConfig";

const SKIP_CATEGORIES = [
  'backA',
  'backB',
  'shoulderA',
  'shoulderB',
  'accessoryB',
  'accessoryC',
  'accessoryD',
];

function randomFromArray<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function randomizeCharacter() {
  const randomizedAssets: Record<string, string> = { ...defaultAssets };

  (Object.keys(assetRegistry) as Array<keyof typeof assetRegistry>).forEach((key) => {
    if (SKIP_CATEGORIES.includes(key)) return;
    randomizedAssets[key] = randomFromArray(assetRegistry[key]).url;
  });

  return randomizedAssets;
}

export function randomizeColors(): Record<ColorGroupKey, string> {
  return {
    skin: randomFromArray(skinTones).color,
    hair: randomFromArray(hairColors).color,
    face: randomFromArray(hairColors).color,
    eyes: randomFromArray(eyeColors).color,
    horns: randomFromArray(clothingColors).color,
    backA: randomFromArray(clothingColors).color,
    topA: randomFromArray(clothingColors).color,
    topB: randomFromArray(clothingColors).color,
    bottomA: randomFromArray(clothingColors).color,
    bottomB: randomFromArray(clothingColors).color,
    shoes: randomFromArray(clothingColors).color,
    socks: randomFromArray(clothingColors).color,
    gloves: randomFromArray(clothingColors).color,
    jacketA: randomFromArray(clothingColors).color,
    jacketB: randomFromArray(clothingColors).color,
    accessoryA: randomFromArray(clothingColors).color,
    accessoryB: randomFromArray(clothingColors).color,
    accessoryC: randomFromArray(clothingColors).color,
    accessoryD: randomFromArray(clothingColors).color,
  };
}
