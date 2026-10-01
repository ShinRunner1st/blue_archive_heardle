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
import { stopPictureDrags } from "./helpers/noPictureDrag";
import { playOneAtATime } from "./helpers/onePlayer";
import { upgradeSaves } from "./helpers/saveFormat";
import { takeSignInReturn } from "./helpers/accountFlag";
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

// Before anything reads the saves: rounds from before ids get theirs, once.
upgradeSaves();
// A sign-in's one-time code out of the address before anything draws.
takeSignInReturn();

// Before the first paint, so the right cursor shows from the start. The
// effects run outside React, on their own canvas.
applyCustomCursorToDocument(getCustomCursor());
playOneAtATime();
stopPictureDrags();

createRoot(rootElement).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
