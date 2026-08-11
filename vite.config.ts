import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { VitePWA } from "vite-plugin-pwa";
import tailwindcss from "@tailwindcss/vite";
import fs from "node:fs";

const appVersion = process.env.VERCEL_GIT_COMMIT_SHA || `dev-${Date.now()}`;

const versionPlugin = () => {
  return {
    name: "generate-version-json",
    configureServer(server: any) {
      server.middlewares.use((req: any, res: any, next: any) => {
        if (req.url?.startsWith("/version.json")) {
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ version: appVersion }));
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
        JSON.stringify({ version: appVersion })
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
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
        navigateFallback: "/index.html",
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/[a-z]+\.supabase\.co\/rest\/v1\/.*/i,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "supabase-api",
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 5 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/[a-z]+\.supabase\.co\/storage\/v1\/object\/public\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "supabase-images",
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 7 },
            },
          },
        ],
      },
      manifest: {
        name: "Market",
        short_name: "Market",
        description: "Buy, sell, trade, and find housing on Market.",
        theme_color: "#1E40AF",
        background_color: "#1E40AF",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "/pwa-192.png", sizes: "192x192", type: "image/png" },
          { src: "/pwa-512.png", sizes: "512x512", type: "image/png" },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});