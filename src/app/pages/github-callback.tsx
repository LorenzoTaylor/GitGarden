import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function GitHubCallback() {
  const [searchParams] = useSearchParams();
  const { loginWithGithub } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get("code");
    if (!code) {
      setError("No authorization code received");
      return;
    }

    loginWithGithub(code)
      .then(() => navigate("/dashboard/create"))
      .catch((err) => setError(err instanceof Error ? err.message : "GitHub login failed"));
  }, [searchParams, loginWithGithub, navigate]);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
    </div>
  );
}
