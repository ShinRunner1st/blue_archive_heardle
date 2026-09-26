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
 * Shows or hides the cursor (the CSS in index.css keys off `data-cursor`)
 * and starts or stops the effects to match. The effects' code is only
 * fetched once they are wanted, so with the cursor off none of it loads.
 */
export function applyCustomCursorToDocument(on: boolean): void {
  const root = document.documentElement;
  if (on) root.dataset.cursor = "custom";
  else delete root.dataset.cursor;

  wanted = on;
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
