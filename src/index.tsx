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
import {
  accountsEnabled,
  hasSession,
  startAccountSync,
  takeSignInReturn,
} from "./helpers/accountFlag";
import { startVerifiedSync } from "./helpers/verifiedPlay";
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

/** The longest a signed-in page waits for the account before drawing. */
const ACCOUNT_WAIT_MS = 5000;

/**
 * Signed in, or just back from signing in: the account's progress is taken
 * in before the games read the saves, waiting a few seconds at most.
 * Nobody else waits, or loads any of it.
 */
async function joinAccount(): Promise<void> {
  const returned = takeSignInReturn();
  if (!accountsEnabled() || !(returned || hasSession())) return;
  let drawn = false;
  const sync = import("./helpers/accountStartup")
    .then(({ startAccount }) => startAccount(() => !drawn))
    .catch(() => {});
  await Promise.race([
    sync,
    new Promise((resolve) => window.setTimeout(resolve, ACCOUNT_WAIT_MS)),
  ]);
  drawn = true;
}

// Before anything reads the saves: rounds from before ids get theirs, once.
upgradeSaves();

// Before the first paint, so the right cursor shows from the start. The
// effects run outside React, on their own canvas.
applyCustomCursorToDocument(getCustomCursor());
playOneAtATime();
stopPictureDrags();

joinAccount().finally(() => {
  createRoot(rootElement).render(
    <React.StrictMode>
      <Root />
    </React.StrictMode>
  );
  // Signed in: what's played goes to the account as the page goes on.
  startAccountSync();
  // And verified dailies and room receipts kept from before are sent.
  startVerifiedSync();
});
