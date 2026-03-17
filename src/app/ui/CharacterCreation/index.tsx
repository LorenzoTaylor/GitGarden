import { useState, useCallback } from "react";
import { assetRegistry, defaultAssets } from "@/assets/asset-registry";
import CharacterDisplay from "./CharacterDisplay";
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
import { randomizeCharacter, randomizeColors } from "./creationUtils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/pixelact-ui/card";
import { Button } from "@/components/ui/pixelact-ui/button";
import { Icon } from "@iconify/react";
import { useAuth } from "../../context/AuthContext";
import { API_URL } from "../../config";
import AuthModal from "../AuthModal";

const displayNames: Record<string, string> = {
  body: 'Body',
  head: 'Head',
  face: 'Face',
  ears: 'Ears',
  horns: 'Horns',
  arms: 'Arms',
  eyes: 'Eyes',
  eyebrows: 'Brows',
  hairA: 'Front Hair',
  hairB: 'Back Hair',
  hairC: 'Side Hair',
  hairD: 'Bangs',
  topA: 'Shirt',
  topB: 'Undershirt',
  mid: 'Vest',
  jacketA: 'Jacket',
  jacketB: 'Coat',
  shoulderA: 'Pauldrons',
  shoulderB: 'Cape',
  bottomA: 'Pants',
  bottomB: 'Shorts',
  shoes: 'Shoes',
  socks: 'Socks',
  gloves: 'Gloves',
  accessoryA: 'Eyewear',
  accessoryB: 'Hat',
  accessoryC: 'Necklace',
  accessoryD: 'Earrings',
  backA: 'Wings',
  backB: 'Backpack',
};

const visibleCategories = Object.keys(displayNames);

const previewOffsets: Record<string, number> = {
  horns: 12,
  ears: 6,
  eyes: 6,
  eyebrows: 7,
  face: 4,
  head: 7,
  hairA: 10,
  hairB: 10,
  hairC: 10,
  hairD: 1,
  body: 0,
  arms: -5,
  topA: -3,
  topB: -3,
  mid: -7,
  jacketA: -3,
  jacketB: -3,
  shoulderA: -2,
  shoulderB: -4,
  accessoryA: 5,
  accessoryB: 11,
  accessoryC: -1,
  accessoryD: 11,
  backA: -1,
  bottomA: -10,
  bottomB: -4,
  socks: -14,
  shoes: -15,
  gloves: -7,
};

const ColorSelector = ({
  colors,
  selectedColor,
  onSelect
}: {
  colors: { name: string; color: string }[];
  selectedColor: string;
  onSelect: (color: string) => void;
}) => (
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
);

const CharacterCreator = () => {
  const { user, token } = useAuth();
  const [selectedClothes, setSelectedClothes] = useState({ ...defaultAssets });
  const [colors, setColors] = useState<Record<ColorGroupKey, string>>({ ...defaultColors });
  const [clothingTab, setClothingTab] = useState<ColorGroupKey>('topA');
  const [isSaving, setIsSaving] = useState(false);
  const [savedOutfitId, setSavedOutfitId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingSave, setPendingSave] = useState(false);
  const [settingActive, setSettingActive] = useState(false);

  const doSave = useCallback(async (authToken: string | null) => {
    setIsSaving(true);
    setSaveError(null);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (authToken) {
        headers["Authorization"] = `Bearer ${authToken}`;
      }
      const res = await fetch(`${API_URL}/outfit`, {
        method: "POST",
        headers,
        body: JSON.stringify({ clothes: selectedClothes, colors }),
      });
      if (!res.ok) throw new Error(`Save failed (${res.status})`);
      const data = await res.json();
      setSavedOutfitId(data.id);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Save failed");
      setTimeout(() => setSaveError(null), 3000);
    } finally {
      setIsSaving(false);
    }
  }, [selectedClothes, colors]);

  const handleSave = async () => {
    if (!user) {
      setPendingSave(true);
      setShowAuthModal(true);
      return;
    }
    await doSave(token);
  };

  const handleAuthSuccess = () => {
    if (pendingSave) {
      setPendingSave(false);
      const stored = localStorage.getItem("token");
      doSave(stored);
    }
  };

  const handleSetActive = async () => {
    if (!savedOutfitId || !token) return;
    setSettingActive(true);
    try {
      const res = await fetch(`${API_URL}/user/current-outfit`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ outfit_id: savedOutfitId }),
      });
      if (!res.ok) throw new Error("Failed to set active sprite");
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Failed to set active sprite");
      setTimeout(() => setSaveError(null), 3000);
    } finally {
      setSettingActive(false);
    }
  };

  const markdownSnippet = savedOutfitId ? `![My GitGarden Sprite](${API_URL}/sprite/${savedOutfitId})` : "";

  const updateColor = (group: ColorGroupKey, color: string) => {
    setColors(prev => ({ ...prev, [group]: color }));
  };

  const colorGroup = getColorGroupForLayer(clothingTab);
  const currentColor = colorGroup ? colors[colorGroup] : undefined;

  const getColorPalette = (group: ColorGroupKey | null) => {
    if (!group) return clothingColors;
    if (group === 'skin') return skinTones;
    if (group === 'hair' || group === 'face') return hairColors;
    if (group === 'eyes') return eyeColors;
    return clothingColors;
  };

  return (
    <div className="dark w-full max-w-4xl mx-auto p-4 bg-neutral-900 rounded-xl">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-lg md:text-xl text-neutral-100">Character Creator</h1>
        <div className="flex gap-2">
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-green-800 hover:bg-green-700 text-white font-bold py-2 px-4 rounded flex items-center gap-2"
          >
            <Icon icon="pixelarticons:save" className="w-6! h-6!" />
            {isSaving ? "Saving..." : "Save"}
          </Button>
          <Button
            onClick={() => {
              setSelectedClothes(randomizeCharacter() as typeof defaultAssets);
              setColors(randomizeColors());
            }}
            className="bg-green text-white font-bold py-2 px-4 rounded flex items-center gap-2"
          >
            <Icon icon="pixelarticons:dice" className="w-6! h-6!" />
            Randomize
          </Button>
        </div>
      </div>

      <hr className="border-neutral-800 mb-4" />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle>Assets</CardTitle>
          </CardHeader>
          <CardContent className="overflow-y-auto max-h-75 md:max-h-125">
            <ul className="w-full space-y-1">
              {visibleCategories.map((category) => (
                <div
                  key={category}
                  className="flex items-center gap-2 p-1 hover:bg-neutral-600 rounded cursor-pointer"
                  onClick={() => setClothingTab(category as ColorGroupKey)}
                >
                  <div className="w-10 h-10 overflow-hidden relative">
                    <img
                      src={(assetRegistry as Record<string, { url: string }[]>)[category]?.[0]?.url}
                      alt={displayNames[category]}
                      className="absolute w-full h-full [image-rendering:pixelated] object-none scale-[2.5] origin-center"
                      style={{ objectPosition: `3px ${(previewOffsets[category] ?? 0) * 0.6}px` }}
                    />
                  </div>
                  <span className="text-sm text-neutral-200">{displayNames[category]}</span>
                </div>
              ))}
            </ul>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Card className="overflow-scroll flex-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-center">{displayNames[clothingTab] || clothingTab}</CardTitle>
            </CardHeader>
            <CardContent className="max-h-50 md:max-h-75 flex flex-wrap gap-2 justify-center">
              {(assetRegistry as Record<string, { id: string; name: string; url: string }[]>)[clothingTab]?.map((asset) => (
                <button
                  key={asset.id}
                  onClick={() => setSelectedClothes(prev => ({ ...prev, [clothingTab]: asset.url }))}
                  className={`relative w-14 h-14 md:w-16 md:h-16 overflow-hidden rounded border-2 transition-transform hover:scale-105 ${
                    selectedClothes[clothingTab as keyof typeof selectedClothes] === asset.url
                      ? 'border-neutral-600 ring-2 ring-neutral-600'
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
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardContent className="py-3">
              {colorGroup && (
                <ColorSelector
                  colors={getColorPalette(colorGroup)}
                  selectedColor={currentColor ?? ''}
                  onSelect={(c) => updateColor(colorGroup, c)}
                />
              )}
            </CardContent>
          </Card>
        </div>

        <Card
          className="flex items-center justify-center overflow-hidden relative min-h-75 md:min-h-100"
          style={{
            backgroundImage: `url(${DisplayBackgroundGif})`,
            backgroundSize: '430%',
            backgroundPosition: 'center bottom',
          }}
        >
          <div className="absolute inset-0 bg-neutral-800 opacity-30 z-0" />
          <div className="relative z-10">
            <CharacterDisplay {...selectedClothes} colors={colors} />
          </div>
        </Card>
      </div>

      {savedOutfitId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setSavedOutfitId(null)}>
          <Card className="max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <CardTitle>Outfit Saved!</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-neutral-400">Paste into your GitHub README:</p>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={markdownSnippet}
                  className="flex-1 bg-neutral-800 text-neutral-200 text-sm px-3 py-2 rounded border border-neutral-700 font-mono"
                  onFocus={(e) => e.target.select()}
                />
                <Button
                  onClick={() => {
                    navigator.clipboard.writeText(markdownSnippet);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="px-3"
                >
                  <Icon icon={copied ? "pixelarticons:check" : "pixelarticons:copy"} className="w-5! h-5!" />
                </Button>
              </div>
              {user && (
                <Button
                  onClick={handleSetActive}
                  disabled={settingActive}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  {settingActive ? "Setting..." : "Set as active sprite"}
                </Button>
              )}
              <Button onClick={() => setSavedOutfitId(null)} className="w-full">
                Close
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {saveError && (
        <div className="fixed bottom-4 right-4 bg-red-900 text-red-200 px-4 py-2 rounded-lg shadow-lg z-50 text-sm">
          {saveError}
        </div>
      )}

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => {
          setShowAuthModal(false);
          setPendingSave(false);
        }}
        initialTab="signup"
        onSuccess={handleAuthSuccess}
      />
    </div>
  );
};

export default CharacterCreator;
