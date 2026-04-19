import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

/** Base path for production (GitHub Pages project site: /<repo>/). */
function productionBase(): string {
  const explicit = process.env.VITE_BASE_URL;
  if (explicit) {
    const trimmed = explicit.replace(/\/+$/, "");
    return trimmed ? `${trimmed}/` : "/";
  }
  const gh = process.env.GITHUB_REPOSITORY;
  if (gh) {
    const repo = gh.split("/")[1];
    if (repo) return `/${repo}/`;
  }
  return "/";
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: mode === "production" ? productionBase() : "/",
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
