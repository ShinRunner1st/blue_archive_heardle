import {
  loadFavStudent,
  loadPlayerName,
  loadSenseiTitle,
  saveFavStudent,
  savePlayerName,
  saveSenseiTitle,
} from "./storage";

/** Longest name kept: enough for a handle, short enough for the picture. */
export const MAX_PLAYER_NAME = 20;

/**
 * Who the player is, as their profile's Customize sets it: their name, drawn
 * on their card and the pictures they share, and their favourite student,
 * their card's picture. Kept on this device like every other setting. A
 * room is sent both, only when the player makes or joins one.
 */
let name: string | null = null;
let title: boolean | null = null;
let favourite: number | null | undefined;
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

/** The favourite student: the card's picture, or null for the letter. */
export function getFavStudent(): number | null {
  if (favourite === undefined) favourite = loadFavStudent();
  return favourite;
}

export function setFavStudent(id: number | null): void {
  if (id === getFavStudent()) return;
  favourite = id;
  saveFavStudent(id);
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
  favourite = undefined;
}
