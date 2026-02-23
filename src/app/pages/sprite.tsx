import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import CharacterDisplay from "../ui/CharacterCreation/CharacterDisplay";
import type { ColorGroupKey } from "../ui/CharacterCreation/colorConfig";
import { defaultColors } from "../ui/CharacterCreation/colorConfig";
import { API_URL } from "../config";

interface OutfitData {
  id: string;
  clothes: Record<string, string>;
  colors: Record<ColorGroupKey, string>;
}

export default function SpritePage() {
  const { uuid } = useParams<{ uuid: string }>();
  const [outfit, setOutfit] = useState<OutfitData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!uuid) return;

    fetch(`${API_URL}/outfit/${uuid}`)
      .then((res) => {
        if (!res.ok) throw new Error("Outfit not found");
        return res.json();
      })
      .then((data: OutfitData) => {
        setOutfit(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [uuid]);

  const handleCopyEmbed = async () => {
    const embedUrl = `${API_URL}/sprite/${uuid}`;
    const markdown = `![GitGarden Sprite](${embedUrl})`;
    await navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportPng = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.download = `gitgarden-${uuid}.png`;
    link.href = dataUrl;
    link.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !outfit) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-400">{error || "Outfit not found"}</p>
      </div>
    );
  }

  const clothes = outfit.clothes;
  const colors: Record<ColorGroupKey, string> = {
    ...defaultColors,
    ...outfit.colors,
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6 p-8">
      <CharacterDisplay
        ref={canvasRef}
        accessoryA={clothes.accessoryA || ""}
        accessoryB={clothes.accessoryB || ""}
        accessoryC={clothes.accessoryC || ""}
        accessoryD={clothes.accessoryD || ""}
        arms={clothes.arms || ""}
        backA={clothes.backA || ""}
        body={clothes.body || ""}
        bottomA={clothes.bottomA || ""}
        bottomB={clothes.bottomB || ""}
        ears={clothes.ears || ""}
        eyebrows={clothes.eyebrows || ""}
        eyes={clothes.eyes || ""}
        face={clothes.face || ""}
        gloves={clothes.gloves || ""}
        hairA={clothes.hairA || ""}
        hairB={clothes.hairB || ""}
        hairC={clothes.hairC || ""}
        hairD={clothes.hairD || ""}
        head={clothes.head || ""}
        horns={clothes.horns || ""}
        jacketA={clothes.jacketA || ""}
        jacketB={clothes.jacketB || ""}
        mid={clothes.mid || ""}
        shoes={clothes.shoes || ""}
        shoulderA={clothes.shoulderA || ""}
        shoulderB={clothes.shoulderB || ""}
        socks={clothes.socks || ""}
        topA={clothes.topA || ""}
        topB={clothes.topB || ""}
        colors={colors}
      />

      <div className="flex gap-3">
        <button
          onClick={handleCopyEmbed}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          {copied ? "Copied!" : "Copy Embed Link"}
        </button>
        <button
          onClick={handleExportPng}
          className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
        >
          Export PNG
        </button>
      </div>
    </div>
  );
}
