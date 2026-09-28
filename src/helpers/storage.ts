import {
  CHOICE_CLIP_KEY,
  CHOICE_CLIP_SECONDS,
  CHOICE_STORAGE_KEY,
  CLIP_OPTIONS,
  JUKEBOX_REPEAT_KEY,
  PLAYER_NAME_KEY,
  DAILY_STORAGE_KEY,
  DEFAULT_VOLUME,
  FIRST_RUN_KEY,
  MAX_TRIES,
  MODE_KEY,
  STORAGE_KEY,
  TIME_ATTACK_STORAGE_KEY,
  VOLUME_KEY,
  COLOR_SCHEME_KEY,
  CUSTOM_CURSOR_KEY,
  CHARACTER_KEY,
  WHATS_NEW_KEY,
  GAME_KEY,
  STUDENT_GAME_KEY,
  STUDENT_STORAGE_KEYS,
  FAV_STUDENT_KEY,
  SENSEI_TITLE_KEY,
  VOICE_STORAGE_KEYS,
  VOICE_STYLE_KEY,
} from "../constants/game";
import { ColorScheme } from "../constants/theme";
import { CharacterChoice, isCharacterChoice } from "../types/character";
import { GuessType } from "../types/guess";
import { Game, GameMode, isGameMode } from "../types/mode";
import { Round } from "../types/stats";
import { Song } from "../types/song";
import {
  isStudentGame,
  StudentGame,
  StudentRound,
  StudentSlot,
} from "../types/student";
import {
  isVoiceStyle,
  SKIPPED,
  VoiceMode,
  VoiceRound,
  VoiceStyle,
} from "../types/voice";
import { obscure, reveal } from "./obscure";

/** Each mode keeps its own history, so stats and bags never mix. */
const ROUNDS_KEYS: Record<GameMode, string> = {
  daily: DAILY_STORAGE_KEY,
  endless: STORAGE_KEY,
  choice: CHOICE_STORAGE_KEY,
  timeattack: TIME_ATTACK_STORAGE_KEY,
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

  const run =
    typeof round.run === "number" && Number.isFinite(round.run)
      ? round.run
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
    ...(run === undefined ? {} : { run }),
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
  return toRounds(readSaved(keyFor(mode)));
}

/** A saved list, unscrambled and parsed, or null for anything unreadable. */
function readSaved(key: string): unknown {
  const raw = readKey(key);
  if (!raw) return null;

  const text = raw.startsWith("[") ? raw : reveal(raw);
  if (text === null) return null;

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
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
 * Swaps the rounds of each mode given for the new ones, the student and
 * Voice games' too, as one change: if any write fails (storage full or
 * blocked), the ones already made are undone, so the player never ends up
 * with half a save. Returns whether it worked.
 */
export function replaceAllRounds(
  histories: Partial<Record<GameMode, Round[]>>,
  studentHistories: Partial<Record<StudentSlot, StudentRound[]>> = {},
  voiceHistories: Partial<Record<VoiceMode, VoiceRound[]>> = {}
): boolean {
  const writes: Array<[key: string, rounds: unknown[]]> = [
    ...(Object.keys(histories) as GameMode[]).map(
      (mode): [string, unknown[]] => [keyFor(mode), histories[mode] ?? []]
    ),
    ...(Object.keys(studentHistories) as StudentSlot[]).map(
      (slot): [string, unknown[]] => [
        STUDENT_STORAGE_KEYS[slot],
        studentHistories[slot] ?? [],
      ]
    ),
    ...(Object.keys(voiceHistories) as VoiceMode[]).map(
      (mode): [string, unknown[]] => [
        VOICE_STORAGE_KEYS[mode],
        voiceHistories[mode] ?? [],
      ]
    ),
  ];
  const before = writes.map(([key]) => readKey(key));

  try {
    for (const [key, rounds] of writes) {
      localStorage.setItem(key, obscure(JSON.stringify(rounds)));
    }
    return true;
  } catch {
    writes.forEach(([key], i) => {
      const previous = before[i];
      if (previous === null) removeKey(key);
      else writeKey(key, previous);
    });
    return false;
  }
}

export function clearRounds(mode: GameMode = "endless"): void {
  removeKey(keyFor(mode));
}

const isId = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value > 0;

/** A moment or a duration in milliseconds: whole and not negative. */
const isTime = (value: unknown): value is number =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= 0;

/**
 * Coerces a saved student round into a usable one, or null when it is too
 * damaged to repair. Whether the ids are students the game knows is checked
 * where the table is (see useStudentGame), so this file stays small enough
 * for the page to carry without it.
 */
function toStudentRound(value: unknown): StudentRound | null {
  if (typeof value !== "object" || value === null) return null;
  const round = value as Record<string, unknown>;
  if (!isId(round.answer)) return null;

  // Each student once, and nothing after the answer: the round ended there.
  const guesses: number[] = [];
  for (const id of Array.isArray(round.guesses) ? round.guesses : []) {
    if (!isId(id) || guesses.includes(id)) continue;
    guesses.push(id);
    if (id === round.answer) break;
  }

  const day =
    typeof round.day === "number" && Number.isFinite(round.day)
      ? Math.trunc(round.day)
      : undefined;
  // Rounds from before the clock have neither; a broken one is dropped.
  const startedAt = isTime(round.startedAt) ? round.startedAt : undefined;
  const time = isTime(round.time) ? round.time : undefined;

  return {
    answer: round.answer,
    guesses,
    ...(round.gaveUp === true && !guesses.includes(round.answer)
      ? { gaveUp: true }
      : {}),
    ...(day === undefined ? {} : { day }),
    ...(startedAt === undefined ? {} : { startedAt }),
    ...(time === undefined ? {} : { time }),
  };
}

/** The usable student rounds in a parsed value; shared with save files. */
export function toStudentRounds(value: unknown): StudentRound[] {
  if (!Array.isArray(value)) return [];
  return value
    .map(toStudentRound)
    .filter((round): round is StudentRound => round !== null);
}

/** A student game's saved rounds; never throws, like loadRounds. */
export function loadStudentRounds(slot: StudentSlot): StudentRound[] {
  return toStudentRounds(readSaved(STUDENT_STORAGE_KEYS[slot]));
}

/** Saved scrambled, like the OST's, so the answer isn't in DevTools. */
export function saveStudentRounds(
  slot: StudentSlot,
  rounds: StudentRound[]
): void {
  writeKey(STUDENT_STORAGE_KEYS[slot], obscure(JSON.stringify(rounds)));
}

export function clearStudentRounds(slot: StudentSlot): void {
  removeKey(STUDENT_STORAGE_KEYS[slot]);
}

/**
 * Coerces a saved Voice round into a usable one, or null when it is too
 * damaged to repair. Whether the student and line exist is checked where the
 * lines are listed (see knownVoiceRounds), as for the student game.
 */
function toVoiceRound(value: unknown): VoiceRound | null {
  if (typeof value !== "object" || value === null) return null;
  const round = value as Record<string, unknown>;
  if (!isId(round.answer)) return null;
  const line =
    typeof round.line === "number" &&
    Number.isInteger(round.line) &&
    round.line >= 0
      ? round.line
      : 0;

  // Each student once, skips as often as they come, and nothing after the
  // answer: the round ended there.
  const guesses: number[] = [];
  for (const id of Array.isArray(round.guesses) ? round.guesses : []) {
    const skip = id === SKIPPED;
    if (!skip && (!isId(id) || guesses.includes(id))) continue;
    guesses.push(id);
    if (id === round.answer) break;
  }

  // Kept only when whole: four different students, the answer among them.
  const choices =
    Array.isArray(round.choices) &&
    round.choices.length === 4 &&
    round.choices.every(isId) &&
    new Set(round.choices).size === round.choices.length &&
    round.choices.includes(round.answer)
      ? (round.choices as number[])
      : undefined;

  const day =
    typeof round.day === "number" && Number.isFinite(round.day)
      ? Math.trunc(round.day)
      : undefined;
  const run = isTime(round.run) ? round.run : undefined;

  // A round with one pick ends at its first answer.
  const tries = choices || run !== undefined ? 1 : Infinity;

  return {
    answer: round.answer,
    line,
    guesses: guesses.slice(0, tries),
    ...(day === undefined ? {} : { day }),
    ...(choices === undefined ? {} : { choices }),
    ...(run === undefined ? {} : { run }),
  };
}

/** The usable Voice rounds in a parsed value; shared with save files. */
export function toVoiceRounds(value: unknown): VoiceRound[] {
  if (!Array.isArray(value)) return [];
  return value
    .map(toVoiceRound)
    .filter((round): round is VoiceRound => round !== null);
}

/** A Voice mode's saved rounds; never throws, like loadRounds. */
export function loadVoiceRounds(mode: VoiceMode): VoiceRound[] {
  return toVoiceRounds(readSaved(VOICE_STORAGE_KEYS[mode]));
}

/** Saved scrambled, like the others, so the answer isn't in DevTools. */
export function saveVoiceRounds(mode: VoiceMode, rounds: VoiceRound[]): void {
  writeKey(VOICE_STORAGE_KEYS[mode], obscure(JSON.stringify(rounds)));
}

export function clearVoiceRounds(mode: VoiceMode): void {
  removeKey(VOICE_STORAGE_KEYS[mode]);
}

/** Voice mode's way to play Endless picked last; Classic to begin with. */
export function loadVoiceStyle(): VoiceStyle {
  const stored = readKey(VOICE_STYLE_KEY);
  return isVoiceStyle(stored) ? stored : "endless";
}

export function saveVoiceStyle(style: VoiceStyle): void {
  writeKey(VOICE_STYLE_KEY, style);
}

/** Which game was played last: the OST, unless another was. */
export function loadGame(): Game {
  const stored = readKey(GAME_KEY);
  return stored === "students" || stored === "voice" ? stored : "ost";
}

export function saveGame(game: Game): void {
  writeKey(GAME_KEY, game);
}

/** The student game's way to play picked last; Gameplay to begin with. */
export function loadStudentGame(): StudentGame {
  const stored = readKey(STUDENT_GAME_KEY);
  return isStudentGame(stored) ? stored : "gameplay";
}

export function saveStudentGame(game: StudentGame): void {
  writeKey(STUDENT_GAME_KEY, game);
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

/** The name for shared pictures, or "" for none. */
export function loadPlayerName(): string {
  return readKey(PLAYER_NAME_KEY) ?? "";
}

export function savePlayerName(name: string): void {
  if (name.trim() === "") removeKey(PLAYER_NAME_KEY);
  else writeKey(PLAYER_NAME_KEY, name);
}

/** Whether pictures put "Sensei" before the player's name; on unless not. */
export function loadSenseiTitle(): boolean {
  return readKey(SENSEI_TITLE_KEY) !== "false";
}

export function saveSenseiTitle(on: boolean): void {
  if (on) removeKey(SENSEI_TITLE_KEY);
  else writeKey(SENSEI_TITLE_KEY, "false");
}

/** The student on the Sensei card, or null for none yet. */
export function loadFavStudent(): number | null {
  const id = Number(readKey(FAV_STUDENT_KEY));
  return Number.isInteger(id) && id > 0 ? id : null;
}

export function saveFavStudent(id: number | null): void {
  if (id === null) removeKey(FAV_STUDENT_KEY);
  else writeKey(FAV_STUDENT_KEY, String(id));
}

/** What the Jukebox does when a song ends; it stops unless told otherwise. */
export type JukeboxRepeat = "off" | "next" | "one";

export function loadJukeboxRepeat(): JukeboxRepeat {
  const stored = readKey(JUKEBOX_REPEAT_KEY);
  return stored === "next" || stored === "one" ? stored : "off";
}

export function saveJukeboxRepeat(repeat: JukeboxRepeat): void {
  if (repeat === "off") removeKey(JUKEBOX_REPEAT_KEY);
  else writeKey(JUKEBOX_REPEAT_KEY, repeat);
}

/** The clip length picked for 4-Choice, in seconds. */
export function loadChoiceClip(): number {
  const stored = Number(readKey(CHOICE_CLIP_KEY));
  return CLIP_OPTIONS.includes(stored) ? stored : CHOICE_CLIP_SECONDS;
}

export function saveChoiceClip(seconds: number): void {
  writeKey(CHOICE_CLIP_KEY, String(seconds));
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
