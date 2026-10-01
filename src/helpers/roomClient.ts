/**
 * The page's side of a multiplayer room, besides the connection itself (see
 * hooks/useRoom): where the rooms are, the settings made last and the ones
 * saved by name, this tab's token in a room, and a new room's code.
 */
import {
  ROOM_BACK_KEY,
  ROOM_ICON_KEY,
  ROOM_PRESETS_KEY,
  ROOM_QUICK_KEY,
  ROOM_SETTINGS_KEY,
  ROOM_TOKEN_PREFIX,
} from "../constants/game";
import {
  CODE_LENGTH,
  CODE_LETTERS,
  DEFAULT_ROOM_SETTINGS,
  isRoomCode,
  RoomSettings,
} from "../types/room";
import { cleanIcon, cleanName, cleanSettings } from "./room";
import { getServer } from "./server";

/**
 * The rooms Worker (rooms-worker/): VITE_ROOMS_URL in production, or the one
 * `npm run rooms` runs locally.
 */
export function roomsUrl(): string {
  return import.meta.env.VITE_ROOMS_URL || "ws://localhost:8787";
}

/**
 * A room's address. `make` marks a connection that may make the room, which
 * the Worker counts apart, so one page can't make room after room.
 */
export function roomUrl(code: string, make = false): string {
  return `${roomsUrl()}/room/${code}${make ? "?make=1" : ""}`;
}

/**
 * The settings of the player's last room, or the defaults, with Voice and
 * Picture dealing from the server the player plays on.
 */
export function loadRoomSettings(): RoomSettings {
  const fresh = { ...DEFAULT_ROOM_SETTINGS, server: getServer() };
  try {
    const raw = localStorage.getItem(ROOM_SETTINGS_KEY);
    return (raw && cleanSettings(JSON.parse(raw))) || fresh;
  } catch {
    return fresh;
  }
}

export function saveRoomSettings(settings: RoomSettings): void {
  try {
    localStorage.setItem(ROOM_SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Not remembered; the room still has them.
  }
}

/** Settings kept under a name, to make a room with or switch a room to. */
export interface RoomPreset {
  name: string;
  settings: RoomSettings;
}

/** Plenty for anyone: the list scrolls past its first few. */
export const MAX_PRESETS = 20;
/** A preset's name, shorter than a player's so the chips stay small. */
export const MAX_PRESET_NAME = 16;

export function loadRoomPresets(): RoomPreset[] {
  try {
    const raw = JSON.parse(localStorage.getItem(ROOM_PRESETS_KEY) ?? "[]");
    if (!Array.isArray(raw)) return [];
    const presets: RoomPreset[] = [];
    for (const entry of raw as unknown[]) {
      if (typeof entry !== "object" || entry === null) continue;
      const { name, settings } = entry as Record<string, unknown>;
      const clean = cleanSettings(settings);
      if (typeof name === "string" && name.trim() && clean) {
        presets.push({ name: presetName(name), settings: clean });
      }
    }
    return presets.slice(0, MAX_PRESETS);
  } catch {
    return [];
  }
}

export function presetName(name: string): string {
  return cleanName(name).slice(0, MAX_PRESET_NAME).trim();
}

export const sameSettings = (a: RoomSettings, b: RoomSettings) =>
  JSON.stringify(a) === JSON.stringify(b);

/** The preset already holding these settings, if one does. */
export function presetWith(
  presets: RoomPreset[],
  settings: RoomSettings
): RoomPreset | undefined {
  return presets.find((p) => sameSettings(p.settings, settings));
}

/**
 * Keeps a preset first in the list, in place of one of the same name, and
 * of one with the same settings, which it renames: two names for one set of
 * settings would only crowd the list. The oldest goes once there are too
 * many. Returns the list as kept.
 */
export function saveRoomPreset(preset: RoomPreset): RoomPreset[] {
  const name = presetName(preset.name);
  const next = [
    { name, settings: preset.settings },
    ...loadRoomPresets().filter(
      (p) => p.name !== name && !sameSettings(p.settings, preset.settings)
    ),
  ].slice(0, MAX_PRESETS);
  writePresets(next);
  return next;
}

/**
 * A preset as a line of text to send a friend, who pastes it in to import
 * it: its settings in order, then its name. Short enough for a chat. BA2
 * added the albums ("-" for every song) and lines; a BA1 code from before
 * still reads, with every song and every line.
 */
const CODE_TAG = "BA2";
const OLD_CODE_TAG = "BA1";

export function presetCode({ name, settings: s }: RoomPreset): string {
  return [
    CODE_TAG,
    s.game,
    s.answers,
    s.rounds,
    s.guessSeconds,
    s.start,
    s.picture,
    s.silhouette ? 1 : 0,
    s.maxPlayers,
    s.server,
    s.albums.join("-") || "-",
    s.lines,
    encodeURIComponent(name),
  ].join(".");
}

/** A pasted preset code, checked as the room checks settings; or null. */
export function readPresetCode(text: string): RoomPreset | null {
  const parts = text.trim().split(".");
  const old = parts[0] === OLD_CODE_TAG;
  if (!(old || parts[0] === CODE_TAG) || parts.length < (old ? 11 : 13)) {
    return null;
  }
  const [, game, answers, rounds, guess, start, picture, silhouette] = parts;
  const settings = cleanSettings({
    game,
    answers,
    rounds: Number(rounds),
    guessSeconds: Number(guess),
    start,
    ...(old
      ? {}
      : {
          albums: parts[10] === "-" ? [] : parts[10].split("-").map(Number),
          lines: parts[11],
        }),
    picture,
    silhouette: silhouette === "1",
    maxPlayers: Number(parts[8]),
    server: parts[9],
  });
  let name = "";
  try {
    const typed = decodeURIComponent(parts.slice(old ? 10 : 12).join("."));
    if (typed.trim()) name = presetName(typed);
  } catch {
    // A name cut short in the paste: the settings still come in.
  }
  return settings ? { name: name || "Imported", settings } : null;
}

export function deleteRoomPreset(name: string): RoomPreset[] {
  const next = loadRoomPresets().filter((p) => p.name !== name);
  writePresets(next);
  return next;
}

function writePresets(presets: RoomPreset[]) {
  try {
    localStorage.setItem(ROOM_PRESETS_KEY, JSON.stringify(presets));
  } catch {
    // Not kept; the room still gets the settings.
  }
}

/** Whether a pick goes at once, without Submit. Off to begin with. */
export function loadQuickAnswer(): boolean {
  try {
    return localStorage.getItem(ROOM_QUICK_KEY) === "on";
  } catch {
    return false;
  }
}

export function saveQuickAnswer(on: boolean): void {
  try {
    if (on) localStorage.setItem(ROOM_QUICK_KEY, "on");
    else localStorage.removeItem(ROOM_QUICK_KEY);
  } catch {
    // Not remembered; it's still on for this page.
  }
}

/**
 * The student a player last joined a room as, or null for their letter: a
 * reload goes back in with it.
 */
export function loadRoomIcon(): number | null {
  try {
    return cleanIcon(Number(localStorage.getItem(ROOM_ICON_KEY) ?? NaN));
  } catch {
    return null;
  }
}

export function saveRoomIcon(icon: number | null): void {
  try {
    if (icon === null) localStorage.removeItem(ROOM_ICON_KEY);
    else localStorage.setItem(ROOM_ICON_KEY, String(icon));
  } catch {
    // Not remembered; it's still sent this time.
  }
}

function randomText(letters: string, length: number): string {
  const values = crypto.getRandomValues(new Uint32Array(length));
  return Array.from(values, (n) => letters[n % letters.length]).join("");
}

/** A new room's code; the room says if it's taken, and another is tried. */
export function newRoomCode(): string {
  return randomText(CODE_LETTERS, CODE_LENGTH);
}

/**
 * This tab's token in a room: made the first time, then kept for the tab's
 * life, so a reload or a dropped connection comes back as the same player.
 */
export function roomToken(code: string): string {
  const key = ROOM_TOKEN_PREFIX + code;
  try {
    const kept = sessionStorage.getItem(key);
    if (kept) return kept;
  } catch {
    // No session storage: a token for this page's life only.
  }
  const token = randomText(
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
    24
  );
  try {
    sessionStorage.setItem(key, token);
  } catch {
    // As above.
  }
  return token;
}

/**
 * How long the browser keeps a room's token after the tab closes: longer
 * than any room stays open (a lobby closes when idle, a game is at most
 * 30 rounds).
 */
const BACK_MS = 3 * 60 * 60_000;
/** The rooms kept, the latest first. */
const BACK_ROOMS = 8;

type BackTokens = Record<string, { token: string; at: number }>;

function loadBackTokens(now: number): BackTokens {
  try {
    const raw = JSON.parse(localStorage.getItem(ROOM_BACK_KEY) ?? "{}");
    const kept: BackTokens = {};
    if (typeof raw !== "object" || raw === null) return kept;
    for (const [code, entry] of Object.entries(raw as BackTokens)) {
      if (
        typeof entry?.token === "string" &&
        typeof entry.at === "number" &&
        now - entry.at < BACK_MS
      ) {
        kept[code] = entry;
      }
    }
    return kept;
  } catch {
    return {};
  }
}

/**
 * The token this browser was last in the room with, from a tab that may
 * have closed since, or undefined.
 */
export function backToken(code: string, now = Date.now()): string | undefined {
  return loadBackTokens(now)[code]?.token;
}

/** Keeps this tab's token for the room, for the browser's next tab. */
export function keepBackToken(
  code: string,
  token: string,
  now = Date.now()
): void {
  const kept = { ...loadBackTokens(now), [code]: { token, at: now } };
  const latest = Object.entries(kept)
    .sort(([, a], [, b]) => b.at - a.at)
    .slice(0, BACK_ROOMS);
  try {
    localStorage.setItem(
      ROOM_BACK_KEY,
      JSON.stringify(Object.fromEntries(latest))
    );
  } catch {
    // Only this tab can come back, then.
  }
}

/** Whether this tab has been in the room: a reload rejoins it by itself. */
export function hasRoomToken(code: string): boolean {
  try {
    return sessionStorage.getItem(ROOM_TOKEN_PREFIX + code) !== null;
  } catch {
    return false;
  }
}

export function forgetRoomToken(code: string): void {
  try {
    sessionStorage.removeItem(ROOM_TOKEN_PREFIX + code);
    sessionStorage.removeItem(`${ROOM_TOKEN_PREFIX + code}.name`);
    sessionStorage.removeItem(`${ROOM_TOKEN_PREFIX + code}.password`);
  } catch {
    // Nothing kept.
  }
}

/**
 * The name a room was joined under, kept with the tab's token, so a
 * reload goes back in under it even if the profile's has changed since.
 */
export function rememberRoomName(code: string, name: string): void {
  try {
    sessionStorage.setItem(`${ROOM_TOKEN_PREFIX + code}.name`, name);
  } catch {
    // The room remembers it anyway, while it's open.
  }
}

export function roomName(code: string): string {
  try {
    return sessionStorage.getItem(`${ROOM_TOKEN_PREFIX + code}.name`) ?? "";
  } catch {
    return "";
  }
}

/**
 * The room's password, as typed or set by this tab, kept with its token: a
 * lobby keeps nobody who left, so a reload joins it again, password and all.
 */
export function rememberRoomPassword(
  code: string,
  password: string | undefined
): void {
  const key = `${ROOM_TOKEN_PREFIX + code}.password`;
  try {
    if (password) sessionStorage.setItem(key, password);
    else sessionStorage.removeItem(key);
  } catch {
    // A reload asks for it again.
  }
}

export function roomPassword(code: string): string | undefined {
  try {
    return (
      sessionStorage.getItem(`${ROOM_TOKEN_PREFIX + code}.password`) ??
      undefined
    );
  } catch {
    return undefined;
  }
}

/** The room's code in the address bar, for the link to share and a reload. */
export function roomInAddress(): string | null {
  const code = new URLSearchParams(window.location.search).get("room");
  return code ? code.toUpperCase() : null;
}

export function setRoomInAddress(code: string | null): void {
  const url = new URL(window.location.href);
  if (code) url.searchParams.set("room", code);
  else url.searchParams.delete("room");
  if (url.href !== window.location.href) {
    window.history.replaceState(window.history.state, "", url);
  }
}

/**
 * A room's code in pasted text: the code itself, however it's spaced or
 * cased, or a room's link a friend sent. Null if neither is there.
 */
export function codeIn(text: string): string | null {
  const linked = /[?&]room=([a-z]+)/i.exec(text);
  const code = (linked ? linked[1] : text).toUpperCase().replace(/[^A-Z]/g, "");
  return isRoomCode(code) ? code : null;
}

/** The link that opens the room, to send to friends. */
export function roomLink(origin: string, path: string, code: string): string {
  return `${origin}${path}?room=${code}`;
}
