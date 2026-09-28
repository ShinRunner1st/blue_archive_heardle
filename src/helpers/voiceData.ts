/**
 * Picks the voice lines Voice mode plays from SchaleDB's voice.json
 * (schaledb.com/data/en/voice.json). Used by scripts/build-voices.mjs at
 * build time; the game never asks SchaleDB for anything.
 *
 * Each student gets their title call ("Blue Archive!", the same words for
 * everyone) and up to four lobby lines. SchaleDB has 17,000 clips for Global,
 * far too many to host, and the lobby lines are the ones every player has
 * heard. Seasonal lines are left out, and so is any line where the student
 * says their own name, which would give the answer away.
 *
 * Newer students' lines are cut into parts, each a clip with its own text.
 * A part makes a good line on its own, so the longest one that fits is taken
 * from each line, rather than joining them.
 *
 * Like studentData.ts, everything is checked on the way in: if SchaleDB's
 * format changes, the script stops before writing a thing.
 *
 * No runtime imports: the build script loads this file directly with Node.
 */
import type { Student } from "../types/student";

type Json = Record<string, unknown>;

/** One line picked for a student. */
export interface VoiceLine {
  /** Where SchaleDB keeps it, under r2.schaledb.com/voice/. */
  clip: string;
  /** The official English text, or "" for the title call. */
  text: string;
}

/** Lobby lines per student, besides the title call. */
export const LOBBY_LINES = 4;

/**
 * The lobby lines to pick from, in the order they're preferred: the idle
 * lines say more about the student than the greetings.
 */
const LOBBY_GROUPS = [
  "UILobbyIdle1",
  "UILobbyIdle2",
  "UILobbyIdle3",
  "UILobbyIdle4",
  "UILobbyIdle5",
  "UILobbyEnter1",
  "UILobbyEnter2",
];

/**
 * How long a line's text may be, in characters: shorter is a sigh or a
 * "Sensei!", too little to know a voice by; longer runs past ten seconds.
 */
const MIN_TEXT = 20;
const MAX_TEXT = 140;

class FormatError extends Error {
  constructor(message: string) {
    super(`SchaleDB's voice data has changed: ${message}`);
  }
}

function isObject(value: unknown): value is Json {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

interface Clip {
  group: string;
  clip: string;
  text: string;
}

/** A category of a student's lines ("Normal", "Lobby"), checked. */
function clipsOf(entry: Json, category: string, name: string): Clip[] {
  const list = entry[category];
  if (!Array.isArray(list)) {
    throw new FormatError(`${name}'s ${category} lines are not a list`);
  }
  return list.map((line) => {
    if (
      !isObject(line) ||
      typeof line.Group !== "string" ||
      typeof line.AudioClip !== "string" ||
      !(
        line.Transcription === undefined ||
        typeof line.Transcription === "string"
      )
    ) {
      throw new FormatError(`one of ${name}'s ${category} lines is not a line`);
    }
    return {
      group: line.Group,
      clip: line.AudioClip,
      text: (line.Transcription ?? "").trim(),
    };
  });
}

/** Lower case, letters and digits only, with a space at each end. */
function words(text: string): string {
  const plain = text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  return ` ${plain} `;
}

/**
 * The names a student could say of themselves: their given and family
 * names, without the costume. "Shiroko*Terror" gives "shiroko" and
 * "terror".
 */
export function namesOf(student: Pick<Student, "name" | "fullName">): string[] {
  const text = `${student.fullName} ${student.name.replace(/\(.*\)/, "")}`;
  return [...new Set(words(text).trim().split(" "))].filter(
    (word) => word.length > 1
  );
}

/** Whether a line's text has any of the names in it, as a whole word. */
export function saysName(text: string, names: string[]): boolean {
  const line = words(text);
  return names.some((name) => line.includes(` ${name} `));
}

/**
 * The lines Voice mode plays for one student: the title call first, if they
 * have one, then up to LOBBY_LINES lobby lines, one from each line picked.
 */
export function pickLines(
  entry: unknown,
  student: Pick<Student, "name" | "fullName">
): VoiceLine[] {
  const name = student.name;
  if (!isObject(entry)) {
    throw new FormatError(`${name} has no entry of lines`);
  }
  const names = namesOf(student);

  const title = clipsOf(entry, "Normal", name).find(({ group }) =>
    group.startsWith("UITitle")
  );
  const lobby = clipsOf(entry, "Lobby", name);

  const picked: VoiceLine[] = [];
  for (const group of LOBBY_GROUPS) {
    if (picked.length >= LOBBY_LINES) break;
    const best = lobby
      .filter(
        (line) =>
          line.group === group &&
          line.text.length >= MIN_TEXT &&
          line.text.length <= MAX_TEXT &&
          !saysName(line.text, names)
      )
      .sort((a, b) => b.text.length - a.text.length)[0];
    if (best) picked.push({ clip: best.clip, text: best.text });
  }

  return title ? [{ clip: title.clip, text: "" }, ...picked] : picked;
}

/**
 * Every student's lines, by id, in the table's order, and the students left
 * out: a new student can come out before SchaleDB has their voice, and
 * joins Voice mode when it does. Throws when the data isn't what it was.
 */
export function pickAllLines(
  voices: unknown,
  students: Array<Pick<Student, "id" | "name" | "fullName">>
): { lines: Map<number, VoiceLine[]>; missing: string[] } {
  if (!isObject(voices)) throw new FormatError("voice.json is not a table");

  const lines = new Map<number, VoiceLine[]>();
  const missing: string[] = [];
  for (const student of students) {
    const entry = voices[String(student.id)];
    const picked = entry === undefined ? [] : pickLines(entry, student);
    if (picked.length === 0) missing.push(student.name);
    else lines.set(student.id, picked);
  }
  return { lines, missing };
}
