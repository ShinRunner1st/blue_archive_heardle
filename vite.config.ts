/// <reference types="vitest/config" />
import { createReadStream, existsSync } from "node:fs";
import { basename, join } from "node:path";
import {
  defineConfig,
  loadEnv,
  type Connect,
  type Plugin,
  type UserConfig,
} from "vite";
import react from "@vitejs/plugin-react";

import {
  SITE_PAGES,
  PAGES,
  pageOfPath,
  pageUrl,
  SITE_ORIGIN,
  type Page,
} from "./src/constants/pages";

/**
 * Serves the built audio, voice lines and pictures (audio-dist/, from `npm run
 * build:audio`, `build:voice-audio` and `build:pictures`) at /audio while
 * developing, the way Cloudflare serves them once deployed. Production builds
 * read them from VITE_AUDIO_BASE_URL in .env.production instead.
 */
const serveLocalAudio: Connect.NextHandleFunction = (req, res, next) => {
  const now = req.url?.match(/^\/now\/(now\.json|img\/[\w.-]+\.webp)$/);
  if (now) {
    // Now in Global, from `npm run build:global-now`.
    const file = join("now-dist", now[1]);
    if (!existsSync(file)) return next();
    res.setHeader(
      "Content-Type",
      file.endsWith(".json") ? "application/json" : "image/webp"
    );
    createReadStream(file).pipe(res);
    return;
  }
  const match = req.url?.match(/^\/audio\/((?:pictures|voices)\/)?([\w.-]+)$/);
  if (!match) return next();

  const [, folder = "", name] = match;
  const file = join("audio-dist", folder, basename(name));
  if (!existsSync(file)) {
    // A plain 404, not the app's HTML, so a missing file fails loudly.
    res.statusCode = 404;
    res.end();
    return;
  }

  const type = name.endsWith(".webp")
    ? "image/webp"
    : name.endsWith(".json")
    ? "application/json"
    : "audio/ogg";
  res.setHeader("Content-Type", type);
  createReadStream(file).pipe(res);
};

/** Fills index.html's double-brace fields with one page's title and tags. */
export function fillPage(html: string, page: Page): string {
  const info = PAGES[page];
  const escape = (text: string) =>
    text.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  const filled = html
    .replaceAll("{{page.title}}", escape(info.title))
    .replaceAll("{{page.description}}", escape(info.description))
    .replaceAll("{{page.url}}", pageUrl(page))
    .replaceAll("{{page.preview}}", SITE_ORIGIN + info.preview)
    .replaceAll("{{page.previewAlt}}", escape(info.previewAlt));
  const left = filled.match(/{{page\.\w+}}/);
  if (left) throw new Error(`index.html has an unknown field: ${left[0]}`);
  return filled;
}

/**
 * Writes the hub and a page for each game from index.html, each with its
 * own title, description and link preview, all loading the one bundle.
 * Cloudflare serves voice.html at /voice (site-worker/wrangler.jsonc), and
 * 404.html, a copy of the hub, for any path that isn't a page. In
 * development every path gets index.html, filled for the page asked for.
 */
const gamePages: Plugin = {
  name: "game-pages",
  enforce: "post",
  transformIndexHtml(html, ctx) {
    if (!ctx.server) return html;
    return fillPage(html, pageOfPath((ctx.originalUrl ?? "/").split("?")[0]));
  },
  generateBundle(_, bundle) {
    const index = bundle["index.html"];
    if (index?.type !== "asset") throw new Error("No index.html was built");
    const template = String(index.source);
    for (const page of SITE_PAGES) {
      const source = fillPage(template, page);
      if (page === "hub") index.source = source;
      else this.emitFile({ type: "asset", fileName: PAGES[page].file, source });
    }
    const hub = fillPage(template, "hub");
    this.emitFile({ type: "asset", fileName: "404.html", source: hub });
  },
};

export default defineConfig(({ mode }) => {
  // The site's preview (`npm run deploy:site-preview`) is the production
  // build with sign-in on: .env.production's addresses, and .env.preview's
  // accounts Worker, which only it has until accounts are released
  // (docs/accounts.md). Read first, as Vite reads the mode's own file only.
  if (mode === "preview") {
    for (const [key, value] of Object.entries(
      loadEnv("production", process.cwd(), "VITE_")
    )) {
      process.env[key] ??= value;
    }
  }
  return config;
});

const config: UserConfig = {
  plugins: [
    react(),
    gamePages,
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
};
