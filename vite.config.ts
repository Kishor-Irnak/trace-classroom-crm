import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import dotenv from "dotenv";

// Manually load .env using dotenv to fix loading issues
const envResult = dotenv.config({ path: path.resolve(process.cwd(), ".env") });

if (envResult.error) {
  console.warn("⚠️ Failed to load .env file via dotenv:", envResult.error);
} else {
  console.log("✅ .env file loaded successfully via dotenv");
  const apiKey = process.env.VITE_FIREBASE_API_KEY;
  console.log(
    `   VITE_FIREBASE_API_KEY: ${
      apiKey ? apiKey.substring(0, 5) + "..." : "MISSING"
    }`
  );
}

// Determine base path based on environment
// For custom domain: use "/"
// For GitHub Pages subpath: use "/trace-classroom-crm/"
// Can be overridden with VITE_BASE_URL env variable
const getBasePath = () => {
  if (process.env.VITE_BASE_URL) {
    return process.env.VITE_BASE_URL;
  }
  // Default to root for both dev and production (suitable for custom domains)
  return "/";
};

export default defineConfig({
  // 🔑 Base path - configurable for custom domain or GitHub Pages
  base: getBasePath(),

  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          // Replit-only plugins (safe to keep)
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer()
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner()
          ),
        ]
      : []),
  ],

  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },

  // Frontend root
  root: path.resolve(import.meta.dirname, "client"),
  envDir: path.resolve(import.meta.dirname),

  // Output for GitHub Pages
  build: {
    outDir: path.resolve(import.meta.dirname, "dist"),
    emptyOutDir: true,
  },

  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
