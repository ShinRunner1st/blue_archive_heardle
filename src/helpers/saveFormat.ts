import { SAVE_FORMAT_KEY } from "../constants/game";
import { GAME_MODES, GameMode } from "../types/mode";
import { PICTURE_SLOTS, PictureSlot } from "../types/picture";
import { RoundStamp } from "../types/roundStamp";
import { Server, SERVERS } from "../types/server";
import { STUDENT_SLOTS, StudentSlot } from "../types/student";
import { VOICE_MODES, VoiceMode } from "../types/voice";
import { lacksIds, withRoundIds } from "./roundId";
import {
  loadPictureRounds,
  loadRounds,
  loadStudentRounds,
  loadVoiceRounds,
  savePictureRounds,
  saveRounds,
  saveStudentRounds,
  saveVoiceRounds,
} from "./storage";

/**
 * The save's format: 1 before rounds had ids, 2 since (docs/accounts.md,
 * section 4). Only goes up; a save file from a higher one is refused.
 */
export const SAVE_FORMAT = 2;

/**
 * Each list of rounds by the name its old rounds' ids are made from. The
 * same names in the browser and in a save file, so the same rounds get the
 * same ids in both.
 */
export const ostSlot = (mode: GameMode) => `ost:${mode}`;
export const studentSlot = (server: Server, slot: StudentSlot) =>
  `${server}:students:${slot}`;
export const voiceSlot = (server: Server, mode: VoiceMode) =>
  `${server}:voices:${mode}`;
export const pictureSlot = (server: Server, slot: PictureSlot) =>
  `${server}:pictures:${slot}`;

interface Slot {
  name: string;
  load: () => RoundStamp[];
  save: (rounds: RoundStamp[]) => void;
}

/** Every list of saved rounds, both servers', with how to read and write it. */
function slots(): Slot[] {
  return [
    ...GAME_MODES.map((mode) => ({
      name: ostSlot(mode),
      load: () => loadRounds(mode),
      save: (rounds: RoundStamp[]) =>
        saveRounds(rounds as ReturnType<typeof loadRounds>, mode),
    })),
    ...SERVERS.flatMap((server) => [
      ...STUDENT_SLOTS.map((slot) => ({
        name: studentSlot(server, slot),
        load: () => loadStudentRounds(slot, server),
        save: (rounds: RoundStamp[]) =>
          saveStudentRounds(
            slot,
            rounds as ReturnType<typeof loadStudentRounds>,
            server
          ),
      })),
      ...VOICE_MODES.map((mode) => ({
        name: voiceSlot(server, mode),
        load: () => loadVoiceRounds(mode, server),
        save: (rounds: RoundStamp[]) =>
          saveVoiceRounds(
            mode,
            rounds as ReturnType<typeof loadVoiceRounds>,
            server
          ),
      })),
      ...PICTURE_SLOTS.map((slot) => ({
        name: pictureSlot(server, slot),
        load: () => loadPictureRounds(slot, server),
        save: (rounds: RoundStamp[]) =>
          savePictureRounds(
            slot,
            rounds as ReturnType<typeof loadPictureRounds>,
            server
          ),
      })),
    ]),
  ];
}

/** The format this browser's saves are in: 1 until upgraded. */
function storedFormat(): number {
  try {
    const value = Number(localStorage.getItem(SAVE_FORMAT_KEY));
    return Number.isInteger(value) && value > 0 ? value : 1;
  } catch {
    return SAVE_FORMAT;
  }
}

/**
 * Brings this browser's saves to format 2, once, before the page draws:
 * every round saved without an id gets one, made from its slot, place and
 * contents (see legacyRoundId), and is written back, so it keeps that id
 * from then on, whatever the round does next. Nothing else about a round
 * changes. If a write fails (storage full), the format isn't marked, and
 * the next visit tries again, giving the same ids.
 */
export function upgradeSaves(): void {
  if (storedFormat() >= SAVE_FORMAT) return;
  for (const { name, load, save } of slots()) {
    const rounds = load();
    if (lacksIds(rounds)) save(withRoundIds(name, rounds));
  }
  try {
    localStorage.setItem(SAVE_FORMAT_KEY, String(SAVE_FORMAT));
  } catch {
    // Not marked: the next visit looks again.
  }
}
