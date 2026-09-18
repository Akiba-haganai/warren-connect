import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { VitePWA } from "vite-plugin-pwa";
import tailwindcss from "@tailwindcss/vite";
import fs from "node:fs";

const gitSha = process.env.VERCEL_GIT_COMMIT_SHA
  ? process.env.VERCEL_GIT_COMMIT_SHA.slice(0, 7)
  : "dev";
const appVersion = `v1.4.0 (${gitSha})`;

const versionPlugin = () => {
  return {
    name: "generate-version-json",
    configureServer(server: any) {
      server.middlewares.use((req: any, res: any, next: any) => {
        if (req.url?.startsWith("/version.json")) {
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ version: appVersion, gitSha }));
        } else {
          next();
        }
      });
    },
    closeBundle() {
      const distPath = path.resolve(__dirname, "dist");
      if (!fs.existsSync(distPath)) {
        fs.mkdirSync(distPath, { recursive: true });
      }
      fs.writeFileSync(
        path.resolve(distPath, "version.json"),
        JSON.stringify({ version: appVersion, gitSha })
      );
    },
  };
};

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
  },
  plugins: [
    tailwindcss(),
    react(),
    versionPlugin(),
    VitePWA({
      registerType: "autoUpdate",
      strategies: "injectManifest",
      srcDir: "public",
      filename: "service-worker.js",
      injectRegister: null,
      injectManifest: {
        globPatterns: ["index.html", "manifest.webmanifest"],
        globIgnores: ["**/node_modules/**"],
      },
      manifest: {
        name: "PLAWZA",
        short_name: "PLAWZA",
        description: "The all-in-one student marketplace — housing, buying, selling & connecting on campus.",
        theme_color: "#00897B",
        background_color: "#00897B",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "/icons/icon-72.png", sizes: "72x72", type: "image/png" },
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "/icons/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
    }),
  ],
  build: {
    // Target modern browsers — drops legacy polyfills (~11 KiB saved).
    // Safari 14 (Sept 2020) dropped; audience is primarily Android/Chrome campus users.
    target: ["es2022", "chrome109", "firefox115", "safari16"],
    rollupOptions: {
      external: ["eruda"],
      output: {
        manualChunks(id) {
          // Core React runtime — always needed
          if (
            id.includes("node_modules/react/") ||
            id.includes("node_modules/react-dom/") ||
            id.includes("node_modules/react-router-dom/") ||
            id.includes("node_modules/scheduler/")
          ) {
            return "vendor-react";
          }
          // Supabase — needed for auth + data
          if (id.includes("node_modules/@supabase")) {
            return "vendor-supabase";
          }
          // TanStack Query — only needed on app routes, not landing
          if (id.includes("node_modules/@tanstack")) {
            return "vendor-query";
          }
          // framer-motion — only used in lazy-loaded routes (BottomNav, modals)
          // Split separately so it is NOT preloaded on the landing page
          if (id.includes("node_modules/framer-motion")) {
            return "vendor-framer";
          }
          // Lucide icons — small, keep separate from framer
          if (id.includes("node_modules/lucide-react")) {
            return "vendor-icons";
          }
          // Toast libraries — only needed after interaction
          if (
            id.includes("node_modules/react-hot-toast") ||
            id.includes("node_modules/sonner")
          ) {
            return "vendor-toast";
          }
          // Sentry — already dynamically imported after load+1s
          if (id.includes("node_modules/@sentry")) {
            return "vendor-sentry";
          }
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});