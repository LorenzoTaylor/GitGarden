import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/pixelact-ui/button";
import { Icon } from "@iconify/react";
import Navbar from "../ui/Navbar";
import { useAuth } from "../context/AuthContext";

const features = [
  {
    icon: "pixelarticons:user",
    title: "Build Your Character",
    description:
      "Customize every detail — hair, outfit, accessories, colors. Hundreds of combinations.",
  },
  {
    icon: "pixelarticons:code",
    title: "Tied to Your Code",
    description:
      "Your sprite evolves with your GitHub activity. The more you commit, the more you unlock.",
  },
  {
    icon: "pixelarticons:image",
    title: "Embed Anywhere",
    description:
      "Drop a single line into your GitHub README and your sprite lives there, always up to date.",
  },
];

const Home = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="w-full min-h-screen flex flex-col bg-neutral-950 text-neutral-100">
      <Navbar />

      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center text-center px-4 pt-12 pb-24 gap-6">
        <div className="flex items-center justify-center mb-2">
          <img
            src="/assets/pixel-art-cartoon-rubber-duck-with-straw-hat-icon-png.png"
            alt="GitGarden"
            className="w-24 h-24 [image-rendering:pixelated]"
          />
        </div>

        <h1 className="text-3xl md:text-4xl font-bold tracking-tight max-w-8xl leading-tight">
          Your GitHub activity,
          <br />
          <span className="text-green-500">as a pixel art character.</span>
        </h1>

        <p className="text-neutral-400 text-lg max-w-xl">
          GitGarden turns your coding life into a living sprite. Build your character, embed it in
          your README, and watch it grow as you ship.
        </p>

        <Button
          onClick={() => navigate(user ? "/dashboard" : "/dashboard/create")}
          className="mt-2 bg-green-800 hover:bg-green-700 text-white text-base px-8 py-3 flex items-center gap-2"
        >
          <Icon icon="pixelarticons:play" className="w-5 h-5" />
          {user ? "Go to Dashboard" : "Start Creating"}
        </Button>

        {!user && (
          <p className="text-xs text-neutral-600">
            No account needed to start — save your sprite when you're ready.
          </p>
        )}
      </div>

      {/* Preview */}
      <div className="w-full px-4 pb-16">
        <div className="flex flex-col gap-6 max-w-3xl mx-auto">
          <figure>
            <img
              src="/assets/sprite-card-preview.gif"
              alt="Sprite Card"
              className="rounded-xl border border-neutral-800 w-full h-auto"
            />
            <figcaption className="text-xs text-neutral-500 text-center mt-2">
              Your GitHub Card
            </figcaption>
          </figure>
          <figure>
            <img
              src="/assets/character-creator-preview.png"
              alt="Character Creator"
              className="rounded-xl border border-neutral-800 w-full h-auto"
            />
            <figcaption className="text-xs text-neutral-500 text-center mt-2">
              Character Creator
            </figcaption>
          </figure>
        </div>
      </div>

      {/* Features */}
      <div className="w-full max-w-4xl mx-auto px-4 pb-24 grid grid-cols-1 md:grid-cols-3 gap-6">
        {features.map(({ icon, title, description }) => (
          <div
            key={title}
            className="flex flex-col gap-3 p-6 rounded-xl border border-neutral-800 bg-neutral-900"
          >
            <Icon icon={icon} className="w-8 h-8 text-green-500" />
            <h3 className="font-semibold text-neutral-100">{title}</h3>
            <p className="text-sm text-neutral-400">{description}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Home;
