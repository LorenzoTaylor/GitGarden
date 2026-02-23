import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import CharacterCreation from "./pages/character-creator";
import Preview from "./pages/preview";
import Home from "./pages/home";
import SpritePage from "./pages/sprite";
import GitHubCallback from "./pages/github-callback";

function App() {
  return (
    <div className="dark:bg-neutral-950 w-full h-full min-w-screen min-h-screen">
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/dashboard" element={<>TODO</>} />
            <Route path="/dashboard/create" element={<CharacterCreation />} />
            <Route path="/preview" element={<Preview />} />
            <Route path="/sprite/:uuid" element={<SpritePage />} />
            <Route path="/auth/github/callback" element={<GitHubCallback />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
