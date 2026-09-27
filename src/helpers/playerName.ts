import { loadPlayerName, savePlayerName } from "./storage";

/** Longest name kept: enough for a handle, short enough for the picture. */
export const MAX_PLAYER_NAME = 20;

/**
 * The name the player gave in Settings, drawn on the pictures they share and
 * nowhere else. Kept on this device like every other setting; never sent.
 */
let name: string | null = null;
const listeners = new Set<() => void>();

export function getPlayerName(): string {
  name ??= clean(loadPlayerName());
  return name;
}

/**
 * Keeps what is being typed, spaces included, so "Shiro Ko" can be typed a
 * letter at a time; the picture trims it. Control characters are dropped.
 */
function clean(value: string): string {
  // eslint-disable-next-line no-control-regex
  return value.replace(/[\u0000-\u001f\u007f]/g, "").slice(0, MAX_PLAYER_NAME);
}

export function setPlayerName(next: string): void {
  const value = clean(next);
  if (value === name) return;

  name = value;
  savePlayerName(value);
  listeners.forEach((listener) => listener());
}

export function subscribePlayerName(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Test seam - this is module state that would otherwise leak across tests. */
export function resetPlayerNameState(): void {
  name = null;
}
