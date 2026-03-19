import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/pixelact-ui/card";
import { Button } from "@/components/ui/pixelact-ui/button";
import { Input } from "@/components/ui/pixelact-ui/input";
import { useAuth } from "../../context/AuthContext";
import { API_URL } from "../../config";

const passwordRules = [
  { label: "At least 8 characters", check: (p: string) => p.length >= 8 },
  { label: "One uppercase letter", check: (p: string) => /[A-Z]/.test(p) },
  { label: "One lowercase letter", check: (p: string) => /[a-z]/.test(p) },
  { label: "One number", check: (p: string) => /[0-9]/.test(p) },
  { label: "One symbol (!@#$...)", check: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

function PasswordChecklist({ password }: { password: string }) {
  if (!password) return null;
  return (
    <ul className="space-y-1 text-xs px-1">
      {passwordRules.map(({ label, check }) => {
        const passed = check(password);
        return (
          <li
            key={label}
            className={`flex items-center gap-1.5 ${passed ? "text-green-400" : "text-neutral-500"}`}
          >
            <span>{passed ? "✓" : "✗"}</span>
            {label}
          </li>
        );
      })}
    </ul>
  );
}

function passwordValid(p: string) {
  return passwordRules.every(({ check }) => check(p));
}

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: "login" | "signup";
  onSuccess?: () => void;
}

export default function AuthModal({
  isOpen,
  onClose,
  initialTab = "login",
  onSuccess,
}: AuthModalProps) {
  const { login, signup } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [tab, setTab] = useState<"login" | "signup">(initialTab);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [githubUsername, setGithubUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState<string | null>(null);
  const [resendStatus, setResendStatus] = useState<string | null>(null);

  const handleResend = async () => {
    if (!verificationEmail) return;
    setResendStatus(null);
    try {
      const res = await fetch(`${API_URL}/auth/resend-verification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: verificationEmail }),
      });
      const data = await res.json();
      setResendStatus(data.message || "Sent!");
    } catch {
      setResendStatus("Failed to resend. Please try again.");
    }
  };

  if (!isOpen) return null;

  if (verificationEmail) {
    return (
      <div
        className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
        onClick={onClose}
      >
        <Card className="max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
          <CardHeader>
            <CardTitle>Check your email</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-neutral-300">
              We sent a verification link to{" "}
              <span className="text-white font-medium">{verificationEmail}</span>. Click the link to
              activate your account.
            </p>
            <p className="text-xs text-neutral-500">The link expires in 24 hours.</p>
            {resendStatus && <p className="text-xs text-green-400">{resendStatus}</p>}
            <div className="flex gap-2">
              <Button
                onClick={handleResend}
                className="flex-1 bg-neutral-700 hover:bg-neutral-600 text-white text-sm"
              >
                Resend email
              </Button>
              <Button
                onClick={() => {
                  onClose();
                  if (location.pathname !== "/dashboard/create") {
                    navigate("/dashboard/create");
                  }
                }}
                className="flex-1 bg-green-800 hover:bg-green-700 text-white text-sm"
              >
                Done
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setUsername("");
    setConfirmPassword("");
    setGithubUsername("");
    setError(null);
  };

  const switchTab = (t: "login" | "signup") => {
    setTab(t);
    resetForm();
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setSubmitting(true);
    try {
      const { needsVerification } = await signup(
        username,
        email,
        password,
        githubUsername || undefined
      );
      if (needsVerification) {
        setVerificationEmail(email);
      } else {
        onSuccess?.();
        onClose();
        if (location.pathname !== "/dashboard/create") {
          navigate("/dashboard/create");
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleGithub = () => {
    const clientId = import.meta.env.VITE_GITHUB_CLIENT_ID;
    if (!clientId) {
      setError("GitHub OAuth is not configured");
      return;
    }
    const redirectUri = `${window.location.origin}/auth/github/callback`;
    window.location.href = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=read:user user:email`;
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <Card className="max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
        <CardHeader>
          <div className="flex justify-center gap-2 mb-2">
            <Button
              onClick={() => switchTab("login")}
              className={`text-white ${tab === "login" ? "bg-green-800" : "bg-neutral-700"}`}
            >
              Log In
            </Button>
            <Button
              onClick={() => switchTab("signup")}
              className={`text-white ${tab === "signup" ? "bg-green-800" : "bg-neutral-700"}`}
            >
              Sign Up
            </Button>
          </div>
          <CardTitle>{tab === "login" ? "Log In" : "Sign Up"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="bg-red-900/50 text-red-200 px-3 py-2 rounded text-sm">{error}</div>
          )}

          {tab === "login" ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <Input
                type="email"
                placeholder="Email"
                className="w-full"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Input
                type="password"
                placeholder="Password"
                className="w-full"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <Button
                type="submit"
                disabled={submitting}
                className="w-full mt-2 bg-green-800 hover:bg-green-700 text-white"
              >
                {submitting ? "Logging in..." : "Log In"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleSignup} className="space-y-4">
              <Input
                type="text"
                placeholder="Username"
                className="w-full"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
              <Input
                type="email"
                placeholder="Email"
                className="w-full"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Input
                type="password"
                placeholder="Password"
                className="w-full"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <Input
                type="password"
                placeholder="Confirm Password"
                className="w-full"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
              <Input
                type="text"
                placeholder="GitHub Username (optional)"
                className="w-full"
                value={githubUsername}
                onChange={(e) => setGithubUsername(e.target.value)}
              />
              <PasswordChecklist password={password} />
              <Button
                type="submit"
                disabled={submitting || !passwordValid(password)}
                className="w-full mt-2 bg-green-800 hover:bg-green-700 text-white"
              >
                {submitting ? "Signing up..." : "Sign Up"}
              </Button>
            </form>
          )}

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-neutral-700" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-neutral-900 px-2 text-neutral-500">or</span>
            </div>
          </div>

          <Button
            onClick={handleGithub}
            className="w-full bg-neutral-800 hover:bg-neutral-700 text-white"
          >
            Continue with GitHub
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
