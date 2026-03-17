import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-neutral-950 text-neutral-100 gap-6 p-8">
      <p className="font-mono text-brand-500 text-6xl font-bold">404</p>
      <p className="font-mono text-neutral-400 text-lg">Page not found.</p>
      <Link
        to="/"
        className="mt-2 px-4 py-2 font-mono text-sm border border-brand-500 text-brand-500 hover:bg-brand-500 hover:text-neutral-950 transition-colors"
      >
        Go home
      </Link>
    </div>
  );
}
