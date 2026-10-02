/**
 * The admin tool (`npm run admin`): a page on this PC for editing the
 * content files, with previews drawn by the game's own components. Only a
 * dev server, on 127.0.0.1: it has no build, and the site's build never
 * reaches src/admin/ (nothing the site loads imports it).
 */
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

import { ADMIN_PORT, adminApi } from "./src/admin/server";
import { serveLocalAudio } from "./vite.config";

export default defineConfig({
  root: "src/admin",
  // The game's own public files (fonts, cursor, characters) for previews.
  publicDir: "../../public",
  plugins: [
    react(),
    adminApi(),
    {
      // The pictures previews show, from audio-dist/ as in `npm run dev`.
      name: "serve-local-audio",
      configureServer: (server) => {
        server.middlewares.use(serveLocalAudio);
      },
    },
  ],
  define: {
    __BUILD_DATE__: JSON.stringify("admin"),
  },
  server: {
    host: "127.0.0.1",
    port: ADMIN_PORT,
    strictPort: true,
    open: true,
    // The project's files outside the root: the content and the game's code.
    fs: { allow: ["../.."] },
  },
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
});
