import React from "react";
import { createRoot } from "react-dom/client";
import { ThemeProvider } from "styled-components";

import { ErrorBoundary } from "./components";
import { themes } from "./constants";
import { applyColorSchemeToDocument } from "./helpers/colorScheme";
import {
  applyCustomCursorToDocument,
  getCustomCursor,
} from "./helpers/customCursor";
import { playOneAtATime } from "./helpers/onePlayer";
import { useColorScheme } from "./hooks/useColorScheme";
import { useServer } from "./hooks/useServer";
import App from "./app";
import "./index.css";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Missing #root element");

/**
 * Picks the theme for everything below it, error screen included, and starts
 * the app over when the student games' server changes: every pool, daily
 * schedule and history changes with it.
 */
function Root() {
  const scheme = useColorScheme();
  const server = useServer();

  // Layout effect, so the page and the browser agree before the first paint.
  React.useLayoutEffect(() => applyColorSchemeToDocument(scheme), [scheme]);

  return (
    <ThemeProvider theme={themes[scheme]}>
      <ErrorBoundary>
        <App key={server} />
      </ErrorBoundary>
    </ThemeProvider>
  );
}

// Before the first paint, so the right cursor shows from the start. The
// effects run outside React, on their own canvas.
applyCustomCursorToDocument(getCustomCursor());
playOneAtATime();

createRoot(rootElement).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
