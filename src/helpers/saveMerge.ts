import { GAME_MODES } from "../types/mode";
import { PICTURE_SLOTS } from "../types/picture";
import { RoundStamp } from "../types/roundStamp";
import { Round } from "../types/stats";
import { STUDENT_SLOTS, StudentRound } from "../types/student";
import { NamedRound, VOICE_MODES } from "../types/voice";
import { isFinished } from "./calStats";
import { RoomGame } from "./missions";
import { SaveFile, ServerSave } from "./saveFile";
import { isOver as isStudentOver } from "./studentRounds";
import { isOver as isNamedOver } from "./voiceRounds";

/**
 * Puts two copies of a player's progress together (two devices, a save
 * file, an account later; docs/accounts.md, section 5), losing nothing that
 * can be kept and counting nothing twice:
 *
 * - **Rounds** from both, joined by id; a round on both sides keeps the
 *   copy played further.
 * - **Daily puzzles**: one a day for each game and mode. If both sides
 *   played the same day, the finished one stays; if both finished, the one
 *   dealt first (`base`'s if that can't be told). The other is left out
 *   here: the copies taken before a merge keep it.
 * - **Missions**: everything cleared on either side.
 * - **Multiplayer games**: both lists, joined by id; the counts from before
 *   the list keep the larger of each, as they can't tell devices apart.
 *
 * Rounds keep the order they were dealt: rounds from before ids first, in
 * their list's order, `base`'s before `other`'s, then the rest by when they
 * were dealt. `base` wins every tie, so the account's copy is passed as it.
 * Pure: neither copy is changed.
 */
export function mergeSaves(base: SaveFile, other: SaveFile): SaveFile {
  return {
    exported: base.exported,
    rounds: Object.fromEntries(
      GAME_MODES.map((mode) => [
        mode,
        mergeRounds(
          base.rounds[mode],
          other.rounds[mode],
          ostProgress,
          mode === "daily" ? isFinished : undefined
        ),
      ])
    ) as SaveFile["rounds"],
    ...mergeServer(base, other),
    jp: mergeServer(base.jp, other.jp),
    missions: [...new Set([...base.missions, ...other.missions])],
    roomRecord: {
      games: Math.max(base.roomRecord.games, other.roomRecord.games),
      wins: Math.max(base.roomRecord.wins, other.roomRecord.wins),
    },
    roomGames: mergeRoomGames(base.roomGames, other.roomGames),
  };
}

const isDaily = (slot: string) => slot === "daily" || slot.endsWith("-daily");

function mergeServer(base: ServerSave, other: ServerSave): ServerSave {
  return {
    students: Object.fromEntries(
      STUDENT_SLOTS.map((slot) => [
        slot,
        mergeRounds<StudentRound>(
          base.students[slot],
          other.students[slot],
          studentProgress,
          isDaily(slot) ? isStudentOver : undefined
        ),
      ])
    ) as ServerSave["students"],
    voices: Object.fromEntries(
      VOICE_MODES.map((mode) => [
        mode,
        mergeRounds(
          base.voices[mode],
          other.voices[mode],
          namedProgress,
          isDaily(mode) ? isNamedOver : undefined
        ),
      ])
    ) as ServerSave["voices"],
    pictures: Object.fromEntries(
      PICTURE_SLOTS.map((slot) => [
        slot,
        mergeRounds(
          base.pictures[slot],
          other.pictures[slot],
          namedProgress,
          isDaily(slot) ? isNamedOver : undefined
        ),
      ])
    ) as ServerSave["pictures"],
  };
}

/** How far a round was played: its tries used, or guesses made. */
const ostProgress = (round: Round) => round.currentTry;
const studentProgress = (round: StudentRound) =>
  round.guesses.length + (round.gaveUp ? 1 : 0);
const namedProgress = (round: NamedRound) => round.guesses.length;

interface Placed<T> {
  round: T;
  /** 0 for base, 1 for other: base first in every tie. */
  side: number;
  index: number;
}

/**
 * One list of rounds from both copies. `finished` is given for a daily
 * list, which keeps one round a day.
 */
export function mergeRounds<T extends RoundStamp & { day?: number }>(
  base: T[],
  other: T[],
  progress: (round: T) => number,
  finished?: (round: T) => boolean
): T[] {
  const byId = new Map<string, Placed<T>>();
  const unnamed: Placed<T>[] = [];
  const place = (rounds: T[], side: number) =>
    rounds.forEach((round, index) => {
      const entry = { round, side, index };
      if (!round.id) {
        unnamed.push(entry);
        return;
      }
      const known = byId.get(round.id);
      // The same round on both sides: the copy played further.
      if (!known) byId.set(round.id, entry);
      else if (progress(round) > progress(known.round)) {
        byId.set(round.id, { ...entry, side: known.side, index: known.index });
      }
    });
  place(base, 0);
  place(other, 1);

  let merged = [...byId.values(), ...unnamed].sort(
    (a, b) =>
      (a.round.at ?? -1) - (b.round.at ?? -1) ||
      a.side - b.side ||
      a.index - b.index
  );

  if (finished) {
    const kept = new Map<number, Placed<T>>();
    for (const entry of merged) {
      const { day } = entry.round;
      if (typeof day !== "number") continue;
      const known = kept.get(day);
      if (!known || better(entry, known, finished)) kept.set(day, entry);
    }
    merged = merged.filter(
      (entry) =>
        typeof entry.round.day !== "number" ||
        kept.get(entry.round.day) === entry
    );
  }
  return merged.map((entry) => entry.round);
}

/** Of two rounds of the same daily puzzle, whether `a` is the one to keep. */
function better<T extends RoundStamp>(
  a: Placed<T>,
  b: Placed<T>,
  finished: (round: T) => boolean
): boolean {
  const done = Number(finished(a.round)) - Number(finished(b.round));
  if (done !== 0) return done > 0;
  // Both finished or neither: the one dealt first, when both say.
  if (a.round.at !== undefined && b.round.at !== undefined) {
    if (a.round.at !== b.round.at) return a.round.at < b.round.at;
  }
  return a.side < b.side;
}

function mergeRoomGames(base: RoomGame[], other: RoomGame[]): RoomGame[] {
  const known = new Set(base.map((game) => game.id));
  return [...base, ...other.filter((game) => !known.has(game.id))].sort(
    (a, b) => a.at - b.at
  );
}
