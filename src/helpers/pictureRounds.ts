import { SITE_URL } from "../constants/game";
import { haloOrder, weaponOrder } from "../constants/guessDailyOrder";
import {
  HALOS,
  readPictureTable,
  WEAPON_NAMES,
  WEAPONS,
} from "../constants/guessPictures";
import { students } from "../constants/students";
import {
  PictureKind,
  PictureMode,
  PictureRound,
  PictureRoundMode,
} from "../types/picture";
import { Student } from "../types/student";
import { SKIPPED } from "../types/voice";
import { studentById } from "./studentRounds";
import { isOver, isWon, triesOf } from "./voiceRounds";

/**
 * One halo or weapon, and the students it belongs to: a student's costumes
 * share a halo and mostly a weapon, and the twins Hikari and Nozomi share a
 * halo. Naming any of them is right.
 */
export interface PictureAnswer {
  /** The student who stands for it, and a round's answer: first in `members`. */
  lead: number;
  members: number[];
  /** Its cell in the kind's picture sheet and in its shape sheet. */
  picture: number;
  shape: number;
  /** A weapon's name, for the result. */
  name?: string;
}

/**
 * A kind's answers, from the scrambled table the build script writes (see
 * scripts/build-guess-pictures.mjs), keeping only students the game knows.
 * A table that won't read leaves the kind with no answers, never a broken
 * page.
 */
function readAnswers(scrambled: string, names: string[] = []): PictureAnswer[] {
  return readPictureTable(scrambled).flatMap((entry, index) => {
    const numbers: number[] = [];
    for (let i = 0; i + 2 <= entry.length; i += 2) {
      numbers.push(parseInt(entry.slice(i, i + 2), 36));
    }
    const [picture, shape, ...places] = numbers;
    const members = places.flatMap((place) => {
      const student = students[place];
      return student ? [student.id] : [];
    });
    if (
      !Number.isInteger(picture) ||
      !Number.isInteger(shape) ||
      members.length === 0 ||
      members.length !== places.length
    ) {
      return [];
    }
    const name = names[index];
    return [
      {
        lead: members[0],
        members,
        picture,
        shape,
        ...(name ? { name } : {}),
      },
    ];
  });
}

const ANSWERS: Record<PictureKind, PictureAnswer[]> = {
  halo: readAnswers(HALOS),
  weapon: readAnswers(WEAPONS, WEAPON_NAMES),
};

/** Each student's answer for each kind, by id: the lead's own and the rest. */
const ANSWER_OF: Record<PictureKind, Map<number, PictureAnswer>> = {
  halo: new Map(ANSWERS.halo.flatMap((a) => a.members.map((id) => [id, a]))),
  weapon: new Map(
    ANSWERS.weapon.flatMap((a) => a.members.map((id) => [id, a]))
  ),
};

/** Every answer of a kind, in the student table's order. */
export function pictureAnswers(kind: PictureKind): PictureAnswer[] {
  return ANSWERS[kind];
}

/** The answer a student belongs to, for a kind. */
export function answerOf(
  kind: PictureKind,
  id: number
): PictureAnswer | undefined {
  return ANSWER_OF[kind].get(id);
}

/**
 * Everyone the search offers: every costume with a picture, since any of
 * them can be named.
 */
const POOLS: Record<PictureKind, Student[]> = {
  halo: students.filter(({ id }) => ANSWER_OF.halo.has(id)),
  weapon: students.filter(({ id }) => ANSWER_OF.weapon.has(id)),
};

export function picturePool(kind: PictureKind): Student[] {
  return POOLS[kind];
}

/**
 * A guess as the round saves it: the answer itself when it's one of the
 * students the picture belongs to, so a round is won when its last guess is
 * the answer, as in Voice mode.
 */
export function asGuess(kind: PictureKind, round: PictureRound, id: number) {
  return id !== SKIPPED && answerOf(kind, id)?.lead === round.answer
    ? round.answer
    : id;
}

/**
 * Everyone already ruled out: each wrong guess and the students sharing its
 * picture, as naming them would be the same guess again.
 */
export function ruledOut(kind: PictureKind, guesses: number[]): Set<number> {
  const out = new Set<number>();
  for (const id of guesses) {
    if (id === SKIPPED) continue;
    for (const member of answerOf(kind, id)?.members ?? [id]) out.add(member);
  }
  return out;
}

/** Whether a mode gives hints: Daily and both kinds of Classic do. */
export function hasPictureHints(mode: PictureRoundMode): boolean {
  return mode === "daily" || mode === "endless" || mode === "silhouette";
}

/** Whether the round shows the picture's shape rather than the picture. */
export function showsShape(mode: PictureMode, round?: PictureRound): boolean {
  return mode === "silhouette" || round?.shape === true;
}

/**
 * What each miss reveals, in order. The last is the student's silhouette,
 * or, when the round shows the picture's shape, the picture itself.
 */
export type PictureHint = "school" | "club" | "silhouette" | "picture";

export function pictureHints(
  shape: boolean,
  hasSilhouette: boolean
): PictureHint[] {
  if (shape) return ["school", "club", "picture"];
  // A new student can come out before their voice, and with it their
  // silhouette: there are two hints then.
  return hasSilhouette ? ["school", "club", "silhouette"] : ["school", "club"];
}

const ORDERS: Record<PictureKind, number[]> = {
  halo: haloOrder,
  weapon: weaponOrder,
};

/**
 * The daily puzzle, the same for every player: the picture from a
 * checked-in schedule, only ever appended to (see guessDailyOrder.ts).
 */
export function dailyPicture(kind: PictureKind, day: number): number {
  const answers = ANSWERS[kind];
  const order = ORDERS[kind];
  if (order.length === 0) return answers[0]?.lead ?? 0;
  const index = (((day - 1) % order.length) + order.length) % order.length;
  const scheduled = order[index];
  // The scheduled picture is gone: this day only falls back.
  return answerOf(kind, scheduled)?.lead === scheduled
    ? scheduled
    : answers[index % answers.length].lead;
}

type Random = () => number;

/**
 * The next endless answer, from a bag: every picture comes up once before
 * any comes round again, and the last one isn't dealt straight away a second
 * time when the bag is refilled.
 */
export function pickPicture(
  kind: PictureKind,
  rounds: PictureRound[],
  random: Random = Math.random
): number {
  const pool = ANSWERS[kind];
  const leads = new Set(pool.map(({ lead }) => lead));
  let dealt = new Set<number>();
  for (const { answer } of rounds) {
    if (leads.has(answer)) dealt.add(answer);
    if (dealt.size === leads.size) dealt = new Set();
  }

  const last = rounds[rounds.length - 1]?.answer;
  const left = pool.filter(({ lead }) => !dealt.has(lead) && lead !== last);
  const from = left.length > 0 ? left : pool;
  return from[Math.floor(random() * from.length)].lead;
}

/** How many answers a four-choice round offers. */
export const PICTURE_CHOICES = 4;

function shuffle<T>(list: T[], random: Random): T[] {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * The four answers for a one-pick round, by the students who stand for
 * them, in a random order. The wrong three are close to the answer, so it
 * takes knowing the picture: for a halo, two from the answer's school; for
 * a weapon, two of the same type (SG, AR...); the rest from anyone. Each
 * is a different student, never another of the answer's costumes.
 */
export function makePictureChoices(
  kind: PictureKind,
  answer: number,
  random: Random = Math.random
): number[] {
  const student = studentById.get(answer);
  if (!student) return [];
  const others = ANSWERS[kind]
    .map(({ lead }) => studentById.get(lead))
    .filter(
      (other): other is Student =>
        other !== undefined && other.fullName !== student.fullName
    );
  const close = others.filter((other) =>
    kind === "halo"
      ? other.school === student.school
      : other.weapon === student.weapon
  );

  const picked: Student[] = [];
  const add = (from: Student[], upTo: number) => {
    for (const other of from) {
      if (picked.length >= upTo) return;
      if (!picked.some(({ fullName }) => fullName === other.fullName)) {
        picked.push(other);
      }
    }
  };
  add(shuffle(close, random), 2);
  add(shuffle(others, random), PICTURE_CHOICES - 1);

  return shuffle([student, ...picked], random).map(({ id }) => id);
}

/**
 * Keeps the rounds whose picture the game has, dropping guesses of anyone it
 * doesn't know and four-choice rounds offering someone gone. Only a picture
 * or a student leaving could cause it, but a save must never break the page.
 */
export function knownPictureRounds(
  kind: PictureKind,
  rounds: PictureRound[]
): PictureRound[] {
  return rounds
    .filter((round) => answerOf(kind, round.answer)?.lead === round.answer)
    .flatMap((round) => {
      if (round.choices?.some((id) => !studentById.has(id))) return [];
      const guesses = round.guesses.filter(
        (id) => id === SKIPPED || studentById.has(id)
      );
      return [
        guesses.length === round.guesses.length ? round : { ...round, guesses },
      ];
    });
}

/**
 * The player's history with a picture, from the finished rounds of every
 * mode, for the result: for example "Seen 4 times · named 3".
 */
export function pictureRecordText(
  rounds: PictureRound[],
  answer: number
): string {
  let seen = 0;
  let named = 0;
  for (const round of rounds) {
    if (round.answer !== answer || !isOver(round)) continue;
    seen += 1;
    if (isWon(round)) named += 1;
  }
  if (seen === 0) return "";
  if (seen === 1) return "The first time you've seen it";
  return `Seen ${seen} times · named ${named === 0 ? "never" : named}`;
}

export const KIND_NAMES: Record<PictureKind, string> = {
  halo: "Halo",
  weapon: "Weapon",
};

/** Stands for the kind in the share text and pictures. */
export const KIND_SYMBOLS: Record<PictureKind, string> = {
  halo: "😇",
  weapon: "🔫",
};

export const PICTURE_MODE_NAMES: Record<PictureRoundMode, string> = {
  daily: "Daily",
  endless: "Classic",
  silhouette: "Silhouette",
  choice: "4-Choice",
};

/**
 * The text the result screen copies: a square per try, as Voice mode's, and
 * no name, so it spoils nothing.
 */
export function buildPictureShareText(
  kind: PictureKind,
  mode: PictureRoundMode,
  round: PictureRound,
  score: string
): string {
  const squares = Array.from({ length: triesOf(round) }, (_, index) => {
    const guess = round.guesses[index];
    if (guess === undefined) return "⬜";
    if (guess === round.answer) return "🟩";
    return guess === SKIPPED ? "⬛" : "🟥";
  });

  const title =
    mode === "daily" && typeof round.day === "number"
      ? `Blue Archive Heardle · ${KIND_NAMES[kind]} #${round.day}`
      : `Blue Archive Heardle · ${KIND_NAMES[kind]} (${PICTURE_MODE_NAMES[mode]})`;
  const lines = [title, `${KIND_SYMBOLS[kind]}${squares.join("")}`];
  if (mode !== "daily") lines.push(`Score: ${score}`);
  lines.push(SITE_URL);
  return lines.join("\n");
}
