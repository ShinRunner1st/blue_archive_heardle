import { loadCustomCursor, saveCustomCursor } from "./storage";

/**
 * Whether the player uses Blue Archive's cursor, with its tap and drag
 * effects. On unless they turn it off in Settings; read from storage lazily.
 */
let enabled: boolean | null = null;
/** Stops the running effects; null while they are off. */
let stopEffects: (() => void) | null = null;
/** Whether the effects should be running, once their code has loaded. */
let wanted = false;
let loading: Promise<void> | null = null;

const listeners = new Set<() => void>();

export function getCustomCursor(): boolean {
  if (enabled === null) enabled = loadCustomCursor();
  return enabled;
}

/**
 * Chrome forgets a CSS cursor while a window of its own is up - the file
 * picker for Import, the share sheet - and shows the system arrow when the
 * page comes back, until the cursor style changes. So on the way back the
 * attribute the CSS keys off is dropped for a frame and put back, which
 * makes the browser pick the cursor up again.
 */
function redrawCursor(): void {
  if (!wanted || document.visibilityState === "hidden") return;

  const root = document.documentElement;
  delete root.dataset.cursor;
  // Two frames: the first lets the change be seen, the second restores it.
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      if (wanted) root.dataset.cursor = "custom";
    })
  );
}

let watching = false;

function watchReturns(on: boolean): void {
  if (on === watching) return;
  watching = on;

  const method = on ? "addEventListener" : "removeEventListener";
  window[method]("focus", redrawCursor);
  document[method]("visibilitychange", redrawCursor);
}

/**
 * Shows or hides the cursor (the CSS in index.css keys off `data-cursor`)
 * and starts or stops the effects to match. The effects' code is only
 * fetched once they are wanted, so with the cursor off none of it loads.
 */
export function applyCustomCursorToDocument(on: boolean): void {
  const root = document.documentElement;
  if (on) root.dataset.cursor = "custom";
  else delete root.dataset.cursor;

  wanted = on;
  watchReturns(on);
  if (!on && stopEffects) {
    stopEffects();
    stopEffects = null;
  }
  if (on && !stopEffects && !loading) {
    loading = import("./cursorEffects").then(({ startCursorEffects }) => {
      loading = null;
      // Turned off again while it loaded: leave it off.
      if (wanted && !stopEffects) stopEffects = startCursorEffects();
    });
  }
}

export function setCustomCursor(on: boolean): void {
  if (on === getCustomCursor()) return;

  enabled = on;
  saveCustomCursor(on);
  applyCustomCursorToDocument(on);
  listeners.forEach((listener) => listener());
}

export function subscribeCustomCursor(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Forgets the cached choice and stops the effects, for tests. */
export function resetCustomCursorState(): void {
  applyCustomCursorToDocument(false);
  enabled = null;
}
