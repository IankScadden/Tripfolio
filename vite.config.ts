import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" && process.env.REPL_ID !== undefined
      ? [
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

  // Your React app lives in /client
  root: path.resolve(import.meta.dirname, "client"),

  build: {
    // ⬇️ Build React app into dist/client — this MUST match server/vite.ts
    outDir: path.resolve(import.meta.dirname, "dist/client"),
    emptyOutDir: true,
  },

  server: {
  host: "0.0.0.0",
  allowedHosts: [".replit.dev", ".repl.co"],
  fs: {
    strict: true,
    deny: ["**/.*"],
  },
},