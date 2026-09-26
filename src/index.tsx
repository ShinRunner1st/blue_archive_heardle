import React from "react";
import { createRoot } from "react-dom/client";
import { ThemeProvider } from "styled-components";

import { ErrorBoundary } from "./components";
import { themes } from "./constants";
import { applyColorSchemeToDocument } from "./helpers/colorScheme";
import { startCursorEffects } from "./helpers/cursorEffects";
import { useColorScheme } from "./hooks/useColorScheme";
import App from "./app";
import "./index.css";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Missing #root element");

/** Picks the theme for everything below it, error screen included. */
function Root() {
  const scheme = useColorScheme();

  // Layout effect, so the page and the browser agree before the first paint.
  React.useLayoutEffect(() => applyColorSchemeToDocument(scheme), [scheme]);

  return (
    <ThemeProvider theme={themes[scheme]}>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </ThemeProvider>
  );
}

// Outside React: it draws on its own canvas and never needs a re-render.
startCursorEffects();

createRoot(rootElement).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
