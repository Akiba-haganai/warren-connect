import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import legacy from "@vitejs/plugin-legacy";
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
    legacy({
      targets: ["defaults", "iOS >= 12", "Safari >= 12", "Android >= 6", "chrome >= 60"],
      modernPolyfills: true,
      renderLegacyChunks: true,
    }),
    VitePWA({
      registerType: "autoUpdate",
      strategies: "injectManifest",
      srcDir: "public",
      filename: "service-worker.js",
      injectRegister: null,
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
    target: ["es2018", "safari12", "chrome60"],
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/react") || id.includes("node_modules/react-dom") || id.includes("node_modules/react-router-dom")) {
            return "vendor-react";
          }
          if (id.includes("node_modules/@supabase")) {
            return "vendor-supabase";
          }
          if (id.includes("node_modules/@tanstack")) {
            return "vendor-query";
          }
          if (id.includes("node_modules/lucide-react") || id.includes("node_modules/framer-motion") || id.includes("node_modules/react-hot-toast")) {
            return "vendor-ui";
          }
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