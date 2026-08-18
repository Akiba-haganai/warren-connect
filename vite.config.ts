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
      injectRegister: null,
      workbox: {
        navigateFallbackDenylist: [/^\/version\.json/],
        runtimeCaching: [
          {
            urlPattern: /version\.json/,
            handler: "NetworkOnly",
          },
        ],
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
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});