import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "./context/AuthContext";
import { ErrorBoundary } from "./ui/ErrorBoundary";
import CharacterCreation from "./pages/character-creator";
import Dashboard from "./pages/dashboard";
import Preview from "./pages/preview";
import Home from "./pages/home";
import SpritePage from "./pages/sprite";
import GitHubCallback from "./pages/github-callback";
import Account from "./pages/account";
import VerifyEmail from "./pages/verify-email";
import NotFound from "./pages/not-found";

function App() {
  return (
    <div className="dark:bg-neutral-950 w-full h-full min-w-screen min-h-screen">
      <BrowserRouter>
        <ErrorBoundary>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/dashboard/create" element={<CharacterCreation />} />
              <Route path="/preview" element={<Preview />} />
              <Route path="/sprite/:uuid" element={<SpritePage />} />
              <Route path="/auth/github/callback" element={<GitHubCallback />} />
              <Route path="/account" element={<Account />} />
              <Route path="/verify-email" element={<VerifyEmail />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </ErrorBoundary>
      </BrowserRouter>
      <Toaster position="bottom-right" richColors />
    </div>
  );
}

export default App;
