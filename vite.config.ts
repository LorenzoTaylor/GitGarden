import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  publicDir: "gitgarden-server/public",
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})