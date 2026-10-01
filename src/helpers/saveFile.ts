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
  loadRoomRecord,
  RoomRecord,
  saveClearedMissions,
  saveRoomRecord,
  toClearedMissions,
  toRoomRecord,
} from "./missions";
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
 * Raised when the file's shape changes. A file from a newer game is refused
 * rather than half read; older ones stay readable. The student, Voice and
 * picture games' rounds came later, each in a field of their own, and so
 * did the JP server's (`jp`), so files without them are still version 1.
 */
const SAVE_VERSION = 1;

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
  roomRecord: RoomRecord;
}

function serverSave(server: Server): ServerSave {
  return {
    students: Object.fromEntries(
      STUDENT_SLOTS.map((slot) => [slot, loadStudentRounds(slot, server)])
    ) as ServerSave["students"],
    voices: Object.fromEntries(
      VOICE_MODES.map((mode) => [mode, loadVoiceRounds(mode, server)])
    ) as ServerSave["voices"],
    pictures: Object.fromEntries(
      PICTURE_SLOTS.map((slot) => [slot, loadPictureRounds(slot, server)])
    ) as ServerSave["pictures"],
  };
}

const asObject = (value: unknown): Record<string, unknown> =>
  typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : {};

/** One server's rounds as a file holds them, checked like the saves. */
function readServerSave(file: Record<string, unknown>): ServerSave {
  const students = asObject(file.students);
  const voices = asObject(file.voices);
  const pictures = asObject(file.pictures);
  return {
    students: Object.fromEntries(
      STUDENT_SLOTS.map((slot) => [slot, toStudentRounds(students[slot])])
    ) as ServerSave["students"],
    voices: Object.fromEntries(
      VOICE_MODES.map((mode) => [mode, toVoiceRounds(voices[mode])])
    ) as ServerSave["voices"],
    pictures: Object.fromEntries(
      PICTURE_SLOTS.map((slot) => [slot, toPictureRounds(pictures[slot])])
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
    GAME_MODES.map((mode) => [mode, loadRounds(mode)])
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
      roomRecord: loadRoomRecord(),
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
  const rounds = Object.fromEntries(
    GAME_MODES.map((mode) => [mode, toRounds(saved[mode])])
  ) as Record<GameMode, Round[]>;

  const global = readServerSave(file);
  const jp = readServerSave(asObject(file.jp));

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
      roomRecord: toRoomRecord(file.roomRecord),
    },
  };
}

/**
 * Brings a save file's missions in: a mission cleared on either device stays
 * cleared, as missions are for good, and the multiplayer record keeps the
 * larger count of each, so moving a save back and forth never adds a game
 * twice.
 */
export function mergeMissions(save: SaveFile): void {
  saveClearedMissions([
    ...new Set([...loadClearedMissions(), ...save.missions]),
  ]);
  const here = loadRoomRecord();
  saveRoomRecord({
    games: Math.max(here.games, save.roomRecord.games),
    wins: Math.max(here.wins, save.roomRecord.wins),
  });
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
