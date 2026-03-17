import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/pixelact-ui/card";
import { Button } from "@/components/ui/pixelact-ui/button";
import { Input } from "@/components/ui/pixelact-ui/input";
import { Icon } from "@iconify/react";
import Navbar from "../ui/Navbar";
import { useAuth } from "../context/AuthContext";
import { API_URL } from "../config";

const Account = () => {
  const { user, token, loading } = useAuth();
  const navigate = useNavigate();

  const [githubUsername, setGithubUsername] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate("/");
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user?.github_username) {
      setGithubUsername(user.github_username);
    }
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      const res = await fetch(`${API_URL}/user/github-username`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ github_username: githubUsername || null }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to save");
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const cardUrl = user?.github_username
    ? `${API_URL}/card/${user.github_username}`
    : null;
  const cardMarkdown = cardUrl
    ? `![My GitGarden Card](${cardUrl})`
    : null;
  const showCardEmbed = !!(user?.github_username && user?.current_outfit_id);

  const copyMarkdown = () => {
    if (!cardMarkdown) return;
    navigator.clipboard.writeText(cardMarkdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="w-full min-h-screen flex flex-col bg-neutral-950 text-neutral-100">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-neutral-700 border-t-green-500 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen flex flex-col bg-neutral-950 text-neutral-100">
      <Navbar />

      <div className="flex-1 w-full max-w-3xl mx-auto px-4 pt-10 pb-20 space-y-8">
        <h1 className="text-2xl font-bold">Account</h1>

        {/* User info */}
        <Card className="bg-neutral-900">
          <CardHeader>
            <CardTitle className="text-green-400 text-base">Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-neutral-300">
            <div>
              <span className="text-neutral-500">Username: </span>
              {user?.username}
            </div>
            <div>
              <span className="text-neutral-500">Email: </span>
              {user?.email}
            </div>
            <div>
              <span className="text-neutral-500">GitHub Username: </span>
              {user?.github_username || (
                <span className="text-neutral-600">Not set</span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Update GitHub username */}
        <Card className="bg-neutral-900">
          <CardHeader>
            <CardTitle className="text-green-400 text-base">GitHub Username</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-4">
              <p className="text-sm text-neutral-400">
                Link your GitHub account to display stats on your card.
              </p>
              <Input
                type="text"
                placeholder="GitHub Username"
                className="w-full"
                value={githubUsername}
                onChange={(e) => setGithubUsername(e.target.value)}
              />
              {saveError && (
                <div className="bg-red-900/50 text-red-200 px-3 py-2 rounded text-sm">
                  {saveError}
                </div>
              )}
              {saveSuccess && (
                <div className="bg-green-900/50 text-green-200 px-3 py-2 rounded text-sm">
                  Saved successfully!
                </div>
              )}
              <Button
                type="submit"
                disabled={saving}
                className="bg-green-800 hover:bg-green-700 text-white"
              >
                {saving ? "Saving..." : "Save"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Card embed section */}
        {showCardEmbed && cardUrl && cardMarkdown && (
          <Card className="bg-neutral-900">
            <CardHeader>
              <CardTitle className="text-green-400 text-base">GitHub Stats Card</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-neutral-400">
                Embed this card in your GitHub README to show your GitGarden character and stats.
              </p>
              <img
                src={cardUrl}
                alt="GitGarden Stats Card"
                className="w-full rounded"
                style={{ imageRendering: "pixelated" }}
              />
              <div className="flex gap-2 items-center">
                <code className="flex-1 block text-xs text-neutral-300 bg-neutral-800 px-3 py-2 truncate rounded">
                  {cardMarkdown}
                </code>
                <Button
                  onClick={copyMarkdown}
                  className="bg-neutral-800 hover:bg-neutral-700 text-white shrink-0 flex items-center gap-1.5 text-xs px-3"
                >
                  <Icon
                    icon={copied ? "pixelarticons:check" : "pixelarticons:copy"}
                    className="w-4 h-4"
                  />
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {user?.github_username && !user?.current_outfit_id && (
          <Card className="bg-neutral-900">
            <CardContent className="p-4 text-sm text-neutral-400">
              Set an active outfit on your{" "}
              <button
                onClick={() => navigate("/dashboard")}
                className="text-green-400 hover:underline"
              >
                Dashboard
              </button>{" "}
              to unlock the stats card embed.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Account;
