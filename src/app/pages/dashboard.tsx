import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/pixelact-ui/card";
import { Button } from "@/components/ui/pixelact-ui/button";
import { Icon } from "@iconify/react";
import Navbar from "../ui/Navbar";
import { useAuth } from "../context/AuthContext";
import { API_URL } from "../config";

interface Outfit {
  id: string;
  user_id: number;
}

const GREEN_SHADOW = "-4px 0 0 0 #166534, 4px 0 0 0 #166534, 0 4px 0 0 #166534, 0 -4px 0 0 #166534";

const Dashboard = () => {
  const { user, token, loading } = useAuth();
  const navigate = useNavigate();
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [fetching, setFetching] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);
  const [activeOutfitId, setActiveOutfitId] = useState<string | null>(
    user?.current_outfit_id ?? null
  );
  const [settingActive, setSettingActive] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate("/");
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!token) return;
    fetch(`${API_URL}/user/outfits`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setOutfits(data))
      .catch(() => setOutfits([]))
      .finally(() => setFetching(false));
  }, [token]);

  const copyMarkdown = (id: string) => {
    navigator.clipboard.writeText(`![My GitGarden Sprite](${API_URL}/sprite/${id})`);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const setActive = async (id: string) => {
    if (!token) return;
    setSettingActive(id);
    try {
      await fetch(`${API_URL}/user/current-outfit`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ outfit_id: id }),
      });
      setActiveOutfitId(id);
    } finally {
      setSettingActive(null);
    }
  };

  const activeUrl = user ? `${API_URL}/user/${user.username}/sprite` : null;
  const activeMarkdown = activeUrl ? `![My GitGarden Sprite](${activeUrl})` : null;

  return (
    <div className="w-full min-h-screen flex flex-col bg-neutral-950 text-neutral-100">
      <Navbar />

      <div className="flex-1 w-full max-w-5xl mx-auto px-4 pt-10 pb-20 space-y-10">

        {/* Active Sprite */}
        {activeUrl && (
          <Card
            style={{ "--pixel-box-shadow": GREEN_SHADOW } as React.CSSProperties}
            className="bg-neutral-900"
          >
            <CardContent className="p-6 flex flex-col md:flex-row items-center gap-8 mb-20">
              {activeOutfitId ? (
                <img
                  src={`${API_URL}/sprite/${activeOutfitId}?scale=6`}
                  alt="Active sprite"
                  className="w-56 h-56 [image-rendering:pixelated] shrink-0"
                />
              ) : (
                <div className="w-32 h-32 flex items-center justify-center text-neutral-600 shrink-0">
                  <Icon icon="pixelarticons:user" className="w-10 h-10" />
                </div>
              )}
              <div className="flex-1 min-w-0 space-y-3">
                <div>
                  <h2 className="text-lg font-semibold text-green-400">Active Sprite</h2>
                  <p className="text-sm text-neutral-400 mt-1">
                    This URL always points to your active outfit. Embed it in your README, it updates automatically when you change your active outfit.
                  </p>
                </div>
                <div className="flex gap-2 items-center">
                  <code className="flex-1 block text-xs text-neutral-300 bg-neutral-800 px-3 py-2 truncate">
                    {activeMarkdown}
                  </code>
                  <Button
                    onClick={() => {
                      navigator.clipboard.writeText(activeMarkdown!);
                      setCopied("active");
                      setTimeout(() => setCopied(null), 2000);
                    }}
                    className="bg-neutral-800 hover:bg-neutral-700 text-white shrink-0 flex items-center gap-1.5 text-xs px-3"
                  >
                    <Icon
                      icon={copied === "active" ? "pixelarticons:check" : "pixelarticons:copy"}
                      className="w-4 h-4"
                    />
                    {copied === "active" ? "Copied" : "Copy"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Outfit list */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">My Outfits</h1>
            <Button
              onClick={() => navigate("/dashboard/create")}
              className="bg-green-800 hover:bg-green-700 text-white flex items-center gap-2"
            >
              <Icon icon="pixelarticons:plus" className="w-5 h-5" />
              New Outfit
            </Button>
          </div>

          {fetching ? (
            <div className="flex justify-center pt-20">
              <div className="w-8 h-8 border-2 border-neutral-700 border-t-green-500 rounded-full animate-spin" />
            </div>
          ) : outfits.length === 0 ? (
            <div className="flex flex-col items-center justify-center pt-20 gap-4 text-neutral-500">
              <Icon icon="pixelarticons:user" className="w-16 h-16" />
              <p>No outfits saved yet.</p>
              <Button
                onClick={() => navigate("/dashboard/create")}
                className="bg-green-800 hover:bg-green-700 text-white"
              >
                Create your first outfit
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {outfits.map((outfit) => (
                <Card
                  key={outfit.id}
                  style={activeOutfitId === outfit.id
                    ? { "--pixel-box-shadow": GREEN_SHADOW } as React.CSSProperties
                    : undefined
                  }
                  className="bg-neutral-900"
                >
                  <CardContent className="p-4 flex items-center gap-6">
                    <img
                      src={`${API_URL}/sprite/${outfit.id}?scale=6`}
                      alt="Sprite"
                      className="w-56 h-56 [image-rendering:pixelated] shrink-0"
                    />

                    <div className="flex-1 min-w-0 space-y-2">
                      {activeOutfitId === outfit.id && (
                        <span className="inline-flex items-center gap-1 text-xs text-green-400 font-medium">
                          <Icon icon="pixelarticons:check-double" className="w-3.5 h-3.5" />
                          Active
                        </span>
                      )}
                      <p className="text-xs text-neutral-500">README embed</p>
                      <code className="block text-xs text-neutral-300 bg-neutral-800 px-3 py-2 truncate">
                        {`![My GitGarden Sprite](${API_URL}/sprite/${outfit.id})`}
                      </code>
                    </div>

                    <div className="flex flex-col gap-2 shrink-0">
                      <Button
                        onClick={() => copyMarkdown(outfit.id)}
                        className="bg-neutral-800 hover:bg-neutral-700 text-white flex items-center gap-1.5 text-xs px-3 w-full"
                      >
                        <Icon
                          icon={copied === outfit.id ? "pixelarticons:check" : "pixelarticons:copy"}
                          className="w-4 h-4"
                        />
                        {copied === outfit.id ? "Copied" : "Copy"}
                      </Button>
                      <Button
                        onClick={() => setActive(outfit.id)}
                        disabled={settingActive === outfit.id || activeOutfitId === outfit.id}
                        className="bg-green-800 hover:bg-green-700 text-white text-xs px-3 disabled:opacity-40 w-full"
                      >
                        {settingActive === outfit.id
                          ? "Setting..."
                          : activeOutfitId === outfit.id
                          ? "Active"
                          : "Set Active"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
