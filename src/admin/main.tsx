/** The admin tool's page (`npm run admin`), in the game's night colours. */
import "@fontsource-variable/nunito-sans";
import React from "react";
import { createRoot, type Root } from "react-dom/client";
import { ThemeProvider } from "styled-components";

import { themes } from "../constants/theme";
import { AdminApp } from "./AdminApp";

// Kept on the element: a save rewrites files this page imports, and Vite
// runs this module again rather than reloading, which mustn't mount twice.
const root = document.getElementById("root") as
  | (HTMLElement & { reactRoot?: Root })
  | null;
if (root) {
  root.reactRoot ??= createRoot(root);
  root.reactRoot.render(
    <React.StrictMode>
      <ThemeProvider theme={themes.dark}>
        <AdminApp />
      </ThemeProvider>
    </React.StrictMode>
  );
}
