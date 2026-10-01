import { songs } from "../constants/songs";
import { GuessType } from "../types/guess";
import { GAME_MODES, GameMode } from "../types/mode";
import { Round } from "../types/stats";
import { Server } from "../types/server";
import { STUDENT_SLOTS, StudentRound, StudentSlot } from "../types/student";
import { VOICE_MODES, VoiceMode, VoiceRound } from "../types/voice";
import { PICTURE_SLOTS, PictureRound, PictureSlot } from "../types/picture";
import { dateStamp } from "./daily";
import { downloadBlob } from "./download";
import {
  loadClearedMissions,
  loadLegacyRoomRecord,
  loadRoomGames,
  RoomGame,
  RoomRecord,
  saveClearedMissions,
  saveRoomGames,
  saveRoomRecord,
  toClearedMissions,
  toRoomGames,
  toRoomRecord,
} from "./missions";
import { withRoundIds } from "./roundId";
import {
  ostSlot,
  pictureSlot,
  SAVE_FORMAT,
  studentSlot,
  voiceSlot,
} from "./saveFormat";
import {
  loadRounds,
  loadStudentRounds,
  loadVoiceRounds,
  loadPictureRounds,
  toPictureRounds,
  toRounds,
  toStudentRounds,
  toVoiceRounds,
} from "./storage";
import { obscure, reveal } from "./obscure";

/** Marks a file as ours, so a stray text file is turned away by name. */
const SAVE_APP = "baheardle";

/**
 * The save format (see saveFormat.ts), raised when the file's shape
 * changes. A file from a newer game is refused rather than half read; older
 * ones stay readable. The student, Voice and picture games' rounds came
 * later, each in a field of their own, and so did the JP server's (`jp`),
 * so files without them are still version 1. Version 2 gives every round an
 * id and when it was dealt, writes an OST song as its theme number, and
 * lists multiplayer games one by one (`roomGames`).
 */
const SAVE_VERSION = SAVE_FORMAT;

const songByTheme = new Map(songs.map((song) => [song.themeNo, song]));

/**
 * A guess as version 2 writes it: 0 for a try not used, 1 for a skip, or
 * the song's theme number and whether it was right (null for unmarked).
 */
type PackedGuess = 0 | 1 | [theme: string, right: boolean | null];

function packGuess({ song, skipped, isCorrect }: GuessType): PackedGuess {
  if (song) return [song.themeNo, isCorrect ?? null];
  return skipped ? 1 : 0;
}

function unpackGuess(value: unknown): GuessType {
  const empty = { song: undefined, skipped: false, isCorrect: undefined };
  if (value === 1) return { ...empty, skipped: true };
  if (!Array.isArray(value) || typeof value[0] !== "string") return empty;
  const song = songByTheme.get(value[0]);
  // A song the game no longer has: the try stays, unmarked.
  if (!song) return empty;
  return {
    song,
    skipped: false,
    isCorrect: typeof value[1] === "boolean" ? value[1] : undefined,
  };
}

/**
 * An OST round as version 2 writes it: the song as its theme number, and
 * the tries without the ones not used, about a sixth of the size of the
 * whole song objects version 1 wrote, in every guess too.
 */
function packRound(round: Round): Record<string, unknown> {
  const guesses = round.guesses.map(packGuess);
  while (guesses.length > 0 && guesses[guesses.length - 1] === 0) {
    guesses.pop();
  }
  return { ...round, solution: round.solution.themeNo, guesses };
}

/** Version 2's OST round back as the saves hold it; checked after, as ever. */
function unpackRound(value: unknown): unknown {
  if (typeof value !== "object" || value === null) return value;
  const round = value as Record<string, unknown>;
  return {
    ...round,
    // An unknown theme leaves no song, and the check drops the round.
    solution:
      typeof round.solution === "string"
        ? songByTheme.get(round.solution)
        : undefined,
    guesses: Array.isArray(round.guesses) ? round.guesses.map(unpackGuess) : [],
  };
}

/**
 * Bigger than any real save: localStorage itself holds about 5 MB. Checked
 * before reading, so a wrong pick (a video, say) can't stall the page.
 */
export const MAX_SAVE_FILE_BYTES = 8 * 1024 * 1024;

/** One server's student game, Voice and picture rounds. */
export interface ServerSave {
  students: Record<StudentSlot, StudentRound[]>;
  voices: Record<VoiceMode, VoiceRound[]>;
  pictures: Record<PictureSlot, PictureRound[]>;
}

export interface SaveFile extends ServerSave {
  /** When the file was made, as an ISO timestamp. */
  exported: string;
  rounds: Record<GameMode, Round[]>;
  /** The JP server's; Global's are the fields above, as they always were. */
  jp: ServerSave;
  /** The missions cleared, and the multiplayer games behind some of them. */
  missions: string[];
  /** The games from before version 2, as two counts. */
  roomRecord: RoomRecord;
  /** The games since, one by one. */
  roomGames: RoomGame[];
}

/**
 * One server's rounds, each with an id: a round saved without one (by a
 * page from before the upgrade, say) gets the one it would have had.
 */
function serverSave(server: Server): ServerSave {
  return {
    students: Object.fromEntries(
      STUDENT_SLOTS.map((slot) => [
        slot,
        withRoundIds(
          studentSlot(server, slot),
          loadStudentRounds(slot, server)
        ),
      ])
    ) as ServerSave["students"],
    voices: Object.fromEntries(
      VOICE_MODES.map((mode) => [
        mode,
        withRoundIds(voiceSlot(server, mode), loadVoiceRounds(mode, server)),
      ])
    ) as ServerSave["voices"],
    pictures: Object.fromEntries(
      PICTURE_SLOTS.map((slot) => [
        slot,
        withRoundIds(
          pictureSlot(server, slot),
          loadPictureRounds(slot, server)
        ),
      ])
    ) as ServerSave["pictures"],
  };
}

const asObject = (value: unknown): Record<string, unknown> =>
  typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : {};

/**
 * One server's rounds as a file holds them, checked like the saves, each
 * with an id: a version 1 file's get the ones the browser it came from
 * gives the same rounds.
 */
function readServerSave(
  file: Record<string, unknown>,
  server: Server
): ServerSave {
  const students = asObject(file.students);
  const voices = asObject(file.voices);
  const pictures = asObject(file.pictures);
  return {
    students: Object.fromEntries(
      STUDENT_SLOTS.map((slot) => [
        slot,
        withRoundIds(
          studentSlot(server, slot),
          toStudentRounds(students[slot])
        ),
      ])
    ) as ServerSave["students"],
    voices: Object.fromEntries(
      VOICE_MODES.map((mode) => [
        mode,
        withRoundIds(voiceSlot(server, mode), toVoiceRounds(voices[mode])),
      ])
    ) as ServerSave["voices"],
    pictures: Object.fromEntries(
      PICTURE_SLOTS.map((slot) => [
        slot,
        withRoundIds(
          pictureSlot(server, slot),
          toPictureRounds(pictures[slot])
        ),
      ])
    ) as ServerSave["pictures"],
  };
}

const isEmptyServer = ({ students, voices, pictures }: ServerSave) =>
  STUDENT_SLOTS.every((slot) => students[slot].length === 0) &&
  VOICE_MODES.every((mode) => voices[mode].length === 0) &&
  PICTURE_SLOTS.every((slot) => pictures[slot].length === 0);

export type SaveFileResult =
  | { ok: true; save: SaveFile }
  | { ok: false; error: string };

/**
 * Every mode's rounds in one file, the student, Voice and picture games' too,
 * scrambled like the saves themselves, so the answer to a round in progress
 * isn't readable in a text editor either.
 */
export function buildSaveFile(now: Date = new Date()): string {
  const rounds = Object.fromEntries(
    GAME_MODES.map((mode) => [
      mode,
      withRoundIds(ostSlot(mode), loadRounds(mode)).map(packRound),
    ])
  );
  return obscure(
    JSON.stringify({
      app: SAVE_APP,
      version: SAVE_VERSION,
      exported: now.toISOString(),
      rounds,
      ...serverSave("global"),
      jp: serverSave("jp"),
      missions: loadClearedMissions(),
      roomRecord: loadLegacyRoomRecord(),
      roomGames: loadRoomGames(),
    })
  );
}

/** For example baheardle-save-2026-09-28.txt, dated by the player's calendar. */
export function saveFileName(now: Date = new Date()): string {
  return `baheardle-save-${dateStamp(now)}.txt`;
}

const NOT_A_SAVE = "That file isn't a Blue Archive Heardle save.";

/**
 * Reads a save file back, checking it the same way the saves are checked on
 * load. Never throws: anything wrong comes back as a message for the player.
 */
export function readSaveFile(text: string): SaveFileResult {
  const json = reveal(text.trim());
  if (json === null) return { ok: false, error: NOT_A_SAVE };

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return { ok: false, error: NOT_A_SAVE };
  }

  if (typeof parsed !== "object" || parsed === null) {
    return { ok: false, error: NOT_A_SAVE };
  }
  const file = parsed as Record<string, unknown>;

  if (file.app !== SAVE_APP || typeof file.version !== "number") {
    return { ok: false, error: NOT_A_SAVE };
  }
  if (file.version > SAVE_VERSION) {
    return {
      ok: false,
      error:
        "That save is from a newer version of the game. Reload the page and try again.",
    };
  }

  const saved =
    typeof file.rounds === "object" && file.rounds !== null
      ? (file.rounds as Record<string, unknown>)
      : {};
  // Version 2 writes a song as its theme number; version 1 whole.
  const packed = file.version >= 2;
  const rounds = Object.fromEntries(
    GAME_MODES.map((mode) => {
      const list = saved[mode];
      return [
        mode,
        withRoundIds(
          ostSlot(mode),
          toRounds(packed && Array.isArray(list) ? list.map(unpackRound) : list)
        ),
      ];
    })
  ) as Record<GameMode, Round[]>;

  const global = readServerSave(file, "global");
  const jp = readServerSave(asObject(file.jp), "jp");

  if (
    GAME_MODES.every((mode) => rounds[mode].length === 0) &&
    isEmptyServer(global) &&
    isEmptyServer(jp)
  ) {
    return { ok: false, error: "That save has no rounds in it." };
  }

  const exported =
    typeof file.exported === "string" &&
    !Number.isNaN(Date.parse(file.exported))
      ? file.exported
      : "";

  return {
    ok: true,
    save: {
      exported,
      rounds,
      ...global,
      jp,
      // Files from before missions have neither: none cleared, no games.
      missions: toClearedMissions(file.missions),
      // A version 1 file's counts are all from before the list.
      roomRecord: toRoomRecord(file.roomRecord),
      roomGames: toRoomGames(file.roomGames),
    },
  };
}

/**
 * Brings a save file's missions in: a mission cleared on either device stays
 * cleared, as missions are for good. Multiplayer games since version 2 are
 * joined by id, so a game is never counted twice; the counts from before
 * keep the larger of each, as they can't tell one device's games from
 * another's.
 */
export function mergeMissions(save: SaveFile): void {
  saveClearedMissions([
    ...new Set([...loadClearedMissions(), ...save.missions]),
  ]);
  const here = loadLegacyRoomRecord();
  saveRoomRecord({
    games: Math.max(here.games, save.roomRecord.games),
    wins: Math.max(here.wins, save.roomRecord.wins),
  });
  const games = loadRoomGames();
  const known = new Set(games.map((game) => game.id));
  saveRoomGames([
    ...games,
    ...save.roomGames.filter((game) => !known.has(game.id)),
  ]);
}

/** Downloads the save file. */
export function downloadText(fileName: string, text: string): void {
  downloadBlob(fileName, new Blob([text], { type: "text/plain" }));
}

/**
 * The game holds its rounds in memory and writes them back as they change, so
 * after an import the page starts over and reads the new save fresh.
 */
export function reloadPage(): void {
  window.location.reload();
}
