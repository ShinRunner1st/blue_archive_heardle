/// <reference types="vitest/config" />
import { createReadStream, existsSync } from "node:fs";
import { basename, join } from "node:path";
import { defineConfig, type Connect } from "vite";
import react from "@vitejs/plugin-react";

/**
 * Serves the built audio and pictures (audio-dist/, from `npm run build:audio`
 * and `npm run build:pictures`) at /audio while developing, the way Cloudflare
 * serves them once deployed. Production builds read them from
 * VITE_AUDIO_BASE_URL in .env.production instead.
 */
const serveLocalAudio: Connect.NextHandleFunction = (req, res, next) => {
  const match = req.url?.match(/^\/audio\/(pictures\/)?([\w.-]+)$/);
  if (!match) return next();

  const [, folder = "", name] = match;
  const file = join("audio-dist", folder, basename(name));
  if (!existsSync(file)) {
    // A plain 404, not the app's HTML, so a missing file fails loudly.
    res.statusCode = 404;
    res.end();
    return;
  }

  res.setHeader("Content-Type", folder ? "image/webp" : "audio/ogg");
  createReadStream(file).pipe(res);
};

export default defineConfig({
  plugins: [
    react(),
    {
      name: "serve-local-audio",
      configureServer: (server) => {
        server.middlewares.use(serveLocalAudio);
      },
    },
  ],
  define: {
    // Surfaced in the welcome pop-up, so it can't drift out of date by hand.
    __BUILD_DATE__: JSON.stringify(
      new Date().toLocaleDateString("en-GB", {
        day: "numeric",
        month: "numeric",
        year: "numeric",
      })
    ),
  },
  build: {
    outDir: "build",
    sourcemap: false,
    // Split the dependencies out so that editing the song list - which happens
    // often - only invalidates the small app chunk for returning players.
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom", "react-dom/client"],
          styled: ["styled-components"],
          icons: ["react-icons/io5"],
        },
      },
    },
  },
  server: {
    port: 3000,
    open: true,
  },
  /**
   * Pre-bundle every dependency in one pass at start-up. Letting Vite discover
   * them progressively makes it re-optimize mid-load, and the page then holds
   * references to more than one generation of pre-bundled deps - which means
   * more than one copy of React, and a reload loop that never settles.
   */
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-dom/client",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "styled-components",
      "react-icons/io5",
    ],
  },
  test: {
    environment: "jsdom",
    setupFiles: ["src/test/setup.ts"],
    include: ["src/**/*.test.ts"],
    restoreMocks: true,
  },
});
