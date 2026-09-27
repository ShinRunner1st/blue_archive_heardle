import {
  CHOICE_STORAGE_KEY,
  DAILY_STORAGE_KEY,
  DEFAULT_VOLUME,
  FIRST_RUN_KEY,
  MAX_TRIES,
  MODE_KEY,
  STORAGE_KEY,
  VOLUME_KEY,
  COLOR_SCHEME_KEY,
  CUSTOM_CURSOR_KEY,
  CHARACTER_KEY,
  WHATS_NEW_KEY,
} from "../constants/game";
import { ColorScheme } from "../constants/theme";
import { CharacterChoice, isCharacterChoice } from "../types/character";
import { GuessType } from "../types/guess";
import { GameMode, isGameMode } from "../types/mode";
import { Round } from "../types/stats";
import { Song } from "../types/song";
import { obscure, reveal } from "./obscure";

/** Each mode keeps its own history, so stats and bags never mix. */
const ROUNDS_KEYS: Record<GameMode, string> = {
  daily: DAILY_STORAGE_KEY,
  endless: STORAGE_KEY,
  choice: CHOICE_STORAGE_KEY,
};

function keyFor(mode: GameMode): string {
  return ROUNDS_KEYS[mode];
}

/**
 * localStorage throws in private browsing modes and when site data is blocked,
 * so every access goes through these two helpers.
 */
function readKey(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeKey(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage unavailable or quota exceeded - the game still plays, it just
    // won't be remembered across reloads.
  }
}

function removeKey(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // See writeKey.
  }
}

function isSong(value: unknown): value is Song {
  if (typeof value !== "object" || value === null) return false;
  const song = value as Record<string, unknown>;
  return (
    typeof song.artist === "string" &&
    typeof song.name === "string" &&
    typeof song.themeNo === "string"
  );
}

function isGuess(value: unknown): value is GuessType {
  if (typeof value !== "object" || value === null) return false;
  const guess = value as Record<string, unknown>;
  return (
    (guess.song === undefined || isSong(guess.song)) &&
    typeof guess.skipped === "boolean" &&
    (guess.isCorrect === undefined || typeof guess.isCorrect === "boolean")
  );
}

export function emptyGuesses(): GuessType[] {
  // Built fresh each call so no two slots share an object reference.
  return Array.from({ length: MAX_TRIES }, () => ({
    song: undefined,
    skipped: false,
    isCorrect: undefined,
  }));
}

/**
 * Coerces a persisted entry into a usable Round, or returns null when it is too
 * damaged to repair. Rounds written by older versions of the game may be
 * missing fields, so anything absent falls back to a sane default rather than
 * throwing at render time.
 */
function toRound(value: unknown): Round | null {
  if (typeof value !== "object" || value === null) return null;
  const round = value as Record<string, unknown>;

  if (!isSong(round.solution)) return null;

  const guesses = Array.isArray(round.guesses)
    ? round.guesses.filter(isGuess)
    : [];
  while (guesses.length < MAX_TRIES) {
    guesses.push({ song: undefined, skipped: false, isCorrect: undefined });
  }

  const tries =
    typeof round.tries === "number" &&
    Number.isInteger(round.tries) &&
    round.tries >= 1 &&
    round.tries < MAX_TRIES
      ? round.tries
      : undefined;

  const currentTry =
    typeof round.currentTry === "number" && Number.isFinite(round.currentTry)
      ? Math.min(Math.max(Math.trunc(round.currentTry), 0), tries ?? MAX_TRIES)
      : 0;

  // Kept only when whole: strings, the answer among them, no repeats.
  const choices =
    Array.isArray(round.choices) &&
    round.choices.every((theme) => typeof theme === "string") &&
    new Set(round.choices).size === round.choices.length &&
    round.choices.includes(round.solution.themeNo)
      ? (round.choices as string[])
      : undefined;

  const clip =
    typeof round.clip === "number" &&
    Number.isFinite(round.clip) &&
    round.clip > 0
      ? round.clip
      : undefined;

  const day =
    typeof round.day === "number" && Number.isFinite(round.day)
      ? Math.trunc(round.day)
      : undefined;

  return {
    solution: round.solution,
    currentTry,
    didGuess: round.didGuess === true,
    guesses: guesses.slice(0, MAX_TRIES),
    startTime:
      typeof round.startTime === "number" && Number.isFinite(round.startTime)
        ? round.startTime
        : null,
    ...(day === undefined ? {} : { day }),
    ...(tries === undefined ? {} : { tries }),
    ...(choices === undefined ? {} : { choices }),
    ...(clip === undefined ? {} : { clip }),
  };
}

/**
 * Reads the played rounds. Returns an empty array for missing, malformed or
 * partially corrupted storage - never throws, so a bad value can't white-screen
 * the app the way an unguarded JSON.parse would.
 *
 * Rounds are saved scrambled, so the answer to the round in progress isn't
 * sitting in DevTools as plain text. Saves from before that are plain JSON,
 * and still load.
 */
export function loadRounds(mode: GameMode = "endless"): Round[] {
  const raw = readKey(keyFor(mode));
  if (!raw) return [];

  const text = raw.startsWith("[") ? raw : reveal(raw);
  if (text === null) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return [];
  }

  return toRounds(parsed);
}

/**
 * The usable rounds in a parsed value, dropping any too damaged to repair.
 * Shared with save files, which are checked the same way as the saves.
 */
export function toRounds(value: unknown): Round[] {
  if (!Array.isArray(value)) return [];
  return value.map(toRound).filter((round): round is Round => round !== null);
}

export function saveRounds(rounds: Round[], mode: GameMode = "endless"): void {
  writeKey(keyFor(mode), obscure(JSON.stringify(rounds)));
}

/**
 * Swaps the rounds of each mode given for the new ones, as one change: if any
 * write fails (storage full or blocked), the ones already made are undone, so
 * the player never ends up with half a save. Returns whether it worked.
 */
export function replaceAllRounds(
  histories: Partial<Record<GameMode, Round[]>>
): boolean {
  const modes = Object.keys(histories) as GameMode[];
  const before = modes.map((mode) => readKey(keyFor(mode)));

  try {
    for (const mode of modes) {
      localStorage.setItem(
        keyFor(mode),
        obscure(JSON.stringify(histories[mode] ?? []))
      );
    }
    return true;
  } catch {
    modes.forEach((mode, i) => {
      const previous = before[i];
      if (previous === null) removeKey(keyFor(mode));
      else writeKey(keyFor(mode), previous);
    });
    return false;
  }
}

export function clearRounds(mode: GameMode = "endless"): void {
  removeKey(keyFor(mode));
}

/**
 * The mode last played.
 *
 * With no stored preference, a player who already has an endless history is one
 * who was here before daily mode existed: dropping them into daily would show a
 * score of 0/0 and read as lost progress, so they land where they left off.
 * Genuinely new players get daily, which is the mode worth meeting first.
 *
 * This signal only works on the very first render after the update, because the
 * game writes an endless history on mount whether or not it is played - so the
 * caller pins the answer straight away.
 */
export function loadMode(): GameMode {
  const stored = readKey(MODE_KEY);
  if (isGameMode(stored)) return stored;

  return readKey(STORAGE_KEY) === null ? "daily" : "endless";
}

export function saveMode(mode: GameMode): void {
  writeKey(MODE_KEY, mode);
}

export function isFirstRun(): boolean {
  return readKey(FIRST_RUN_KEY) === null;
}

export function markFirstRunDone(): void {
  writeKey(FIRST_RUN_KEY, "false");
}

/** Whether the player has already seen the "What's new" with this id. */
export function hasSeenWhatsNew(id: string): boolean {
  return readKey(WHATS_NEW_KEY) === id;
}

export function markWhatsNewSeen(id: string): void {
  writeKey(WHATS_NEW_KEY, id);
}

/** The volume the player last chose, or the default for a new player. */
export function loadVolume(): number {
  const stored = readKey(VOLUME_KEY);
  // Number(null) and Number("") are both 0, which would silently mute a new
  // player, so an absent value has to be caught before converting.
  if (stored === null || stored.trim() === "") return DEFAULT_VOLUME;

  const volume = Number(stored);
  return Number.isFinite(volume) && volume >= 0 && volume <= 1
    ? volume
    : DEFAULT_VOLUME;
}

export function saveVolume(volume: number): void {
  writeKey(VOLUME_KEY, String(volume));
}

/** The scheme the player picked, or null if they never have. */
export function loadColorScheme(): ColorScheme | null {
  const stored = readKey(COLOR_SCHEME_KEY);
  return stored === "light" || stored === "dark" ? stored : null;
}

export function saveColorScheme(scheme: ColorScheme): void {
  writeKey(COLOR_SCHEME_KEY, scheme);
}

/** On unless the player turned it off. */
export function loadCustomCursor(): boolean {
  return readKey(CUSTOM_CURSOR_KEY) !== "false";
}

export function saveCustomCursor(on: boolean): void {
  writeKey(CUSTOM_CURSOR_KEY, String(on));
}

export function loadCharacterChoice(): CharacterChoice {
  const stored = readKey(CHARACTER_KEY);
  return isCharacterChoice(stored) ? stored : "auto";
}

export function saveCharacterChoice(choice: CharacterChoice): void {
  writeKey(CHARACTER_KEY, choice);
}
