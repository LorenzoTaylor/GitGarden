import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { API_URL } from "../config";

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const { token: existingToken } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      setStatus("error");
      setMessage("No verification token found in the link.");
      return;
    }

    fetch(`${API_URL}/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Verification failed");
        }
        // Store the token so the user is logged in
        if (data.token) {
          localStorage.setItem("token", data.token);
          window.location.href = "/dashboard/create";
        } else {
          setStatus("success");
          setMessage("Email verified! You can now log in.");
        }
      })
      .catch((err) => {
        setStatus("error");
        setMessage(err instanceof Error ? err.message : "Verification failed");
      });
  }, [searchParams]);

  // If already logged in, redirect
  useEffect(() => {
    if (existingToken && status !== "loading") {
      navigate("/dashboard/create");
    }
  }, [existingToken, status, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-neutral-950">
      <div className="max-w-sm w-full mx-4 text-center space-y-4">
        {status === "loading" && (
          <>
            <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin mx-auto" />
            <p className="text-neutral-400 text-sm">Verifying your email...</p>
          </>
        )}
        {status === "success" && (
          <>
            <p className="text-green-400 text-lg font-medium">Email verified!</p>
            <p className="text-neutral-400 text-sm">{message}</p>
            <button
              onClick={() => navigate("/")}
              className="mt-4 px-4 py-2 bg-green-800 hover:bg-green-700 text-white text-sm rounded"
            >
              Go to login
            </button>
          </>
        )}
        {status === "error" && (
          <>
            <p className="text-red-400 text-lg font-medium">Verification failed</p>
            <p className="text-neutral-400 text-sm">{message}</p>
            <button
              onClick={() => navigate("/")}
              className="mt-4 px-4 py-2 bg-neutral-700 hover:bg-neutral-600 text-white text-sm rounded"
            >
              Back to home
            </button>
          </>
        )}
      </div>
    </div>
  );
}
