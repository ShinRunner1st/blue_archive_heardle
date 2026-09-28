import {
  loadPlayerName,
  loadSenseiTitle,
  savePlayerName,
  saveSenseiTitle,
} from "./storage";

/** Longest name kept: enough for a handle, short enough for the picture. */
export const MAX_PLAYER_NAME = 20;

/**
 * The name the player gave in Settings, drawn on the pictures they share and
 * nowhere else. Kept on this device like every other setting; never sent.
 */
let name: string | null = null;
let title: boolean | null = null;
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

/** Whether "Sensei" goes before the name on pictures. */
export function getSenseiTitle(): boolean {
  title ??= loadSenseiTitle();
  return title;
}

export function setSenseiTitle(on: boolean): void {
  if (on === getSenseiTitle()) return;
  title = on;
  saveSenseiTitle(on);
  listeners.forEach((listener) => listener());
}

/**
 * The name as pictures show it: "Arona Sensei", the title after the name as
 * students say it in the game, or the name alone with the title turned off.
 * A name that says Sensei already, anywhere, keeps its own. Empty for no
 * name.
 */
export function pictureName(
  playerName: string = getPlayerName(),
  withTitle: boolean = getSenseiTitle()
): string {
  const shown = playerName.trim();
  if (!shown || !withTitle || /\bsensei\b/i.test(shown)) return shown;
  return `${shown} Sensei`;
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
  title = null;
}
