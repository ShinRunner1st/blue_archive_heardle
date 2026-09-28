import { Birthday, Student, StudentGame } from "../types/student";

/** How a guess's attribute matches the answer's. */
export type Verdict = "right" | "close" | "wrong";

/** Which way the answer lies, for numbers: higher or lower than the guess. */
export type Arrow = "up" | "down";

export type ClueKey =
  | "school"
  | "role"
  | "damage"
  | "defense"
  | "weapon"
  | "exCost"
  | "order"
  | "height"
  | "birthday"
  | "year"
  | "gifts"
  | "club";

export interface Clue {
  key: ClueKey;
  /** The guess's value, as shown in its cell. */
  text: string;
  verdict: Verdict;
  arrow?: Arrow;
  /** The values behind the text, where there can be several: the gifts. */
  values?: string[];
}

/** The columns of each way to play, in the order the table shows them. */
export const CLUE_KEYS: Record<StudentGame, ClueKey[]> = {
  gameplay: [
    "school",
    "role",
    "damage",
    "defense",
    "weapon",
    "exCost",
    "order",
  ],
  lore: [
    "height",
    "school",
    "birthday",
    "year",
    "weapon",
    "gifts",
    "club",
    "order",
  ],
};

/** Column headings: short, since a phone fits eight of them across. */
export const CLUE_NAMES: Record<ClueKey, string> = {
  school: "School",
  role: "Role",
  damage: "Damage",
  defense: "Defense",
  weapon: "Weapon",
  exCost: "EX Cost",
  order: "Release",
  height: "Height",
  birthday: "Birthday",
  year: "Year",
  gifts: "Fav Gift",
  club: "Club",
};

/** What each arrow means, for screen readers. */
const ARROW_MEANINGS: Partial<Record<ClueKey, [up: string, down: string]>> = {
  exCost: ["costs more", "costs less"],
  order: ["released later", "released earlier"],
  height: ["taller", "shorter"],
  birthday: ["later in the year", "earlier in the year"],
  year: ["in a higher year", "in a lower year"],
};

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** For example "Jan 2". */
export function birthdayText([month, day]: Birthday): string {
  return `${MONTHS[month - 1]} ${day}`;
}

/** The school year as a number, when it is one: "2nd Year" is 2. */
function yearNumber(year: string): number | null {
  const match = /^(\d)/.exec(year);
  return match ? Number(match[1]) : null;
}

function same(key: ClueKey, text: string, a: string, b: string): Clue {
  return { key, text, verdict: a === b ? "right" : "wrong" };
}

/**
 * A number clue: right when equal, or an arrow towards the answer. A value
 * the game doesn't give (null) only matches another missing one, with no
 * arrow, since there is nothing to point from.
 */
function numeric(
  key: ClueKey,
  text: string,
  guess: number | null,
  answer: number | null
): Clue {
  if (guess === answer) return { key, text, verdict: "right" };
  if (guess === null || answer === null) return { key, text, verdict: "wrong" };
  return { key, text, verdict: "wrong", arrow: answer > guess ? "up" : "down" };
}

/** A day of the year, as one number that sorts: 102 for 2 January. */
const dayOfYear = (birthday: Birthday | null) =>
  birthday ? birthday[0] * 100 + birthday[1] : null;

function clueFor(key: ClueKey, guess: Student, answer: Student): Clue {
  switch (key) {
    case "school":
    case "role":
    case "damage":
    case "defense":
    case "weapon":
    case "club":
      return same(key, guess[key], guess[key], answer[key]);

    case "exCost":
    case "order":
      return numeric(
        key,
        key === "order" ? `#${guess.order + 1}` : String(guess.exCost),
        guess[key],
        answer[key]
      );

    case "height":
      return numeric(
        key,
        guess.height === null ? "?" : `${guess.height} cm`,
        guess.height,
        answer.height
      );

    case "birthday": {
      const text = guess.birthday ? birthdayText(guess.birthday) : "?";
      const clue = numeric(
        key,
        text,
        dayOfYear(guess.birthday),
        dayOfYear(answer.birthday)
      );
      // The right month is close: only the day to go.
      const sameMonth =
        clue.verdict === "wrong" &&
        guess.birthday !== null &&
        guess.birthday[0] === answer.birthday?.[0];
      return sameMonth ? { ...clue, verdict: "close" } : clue;
    }

    case "year": {
      // "Suspended" and "Drop out" aren't numbers, but can still match.
      if (guess.year === answer.year) {
        return { key, text: guess.year, verdict: "right" };
      }
      const from = yearNumber(guess.year);
      const to = yearNumber(answer.year);
      return from === null || to === null
        ? { key, text: guess.year, verdict: "wrong" }
        : numeric(key, guess.year, from, to);
    }

    case "gifts": {
      const text = guess.gifts.length > 0 ? guess.gifts.join(" / ") : "None";
      const shared = guess.gifts.filter((gift) => answer.gifts.includes(gift));
      const verdict: Verdict =
        shared.length === guess.gifts.length &&
        shared.length === answer.gifts.length
          ? "right"
          : shared.length > 0
          ? "close"
          : "wrong";
      return { key, text, verdict, values: guess.gifts };
    }
  }
}

/** How a guess compares with the answer, column by column. */
export function compareStudents(
  guess: Student,
  answer: Student,
  game: StudentGame
): Clue[] {
  return CLUE_KEYS[game].map((key) => clueFor(key, guess, answer));
}

/** A clue for screen readers: "Height 145 cm, wrong, the answer is taller". */
export function describeClue(clue: Clue): string {
  const meanings = ARROW_MEANINGS[clue.key];
  const arrow =
    clue.arrow && meanings
      ? `, the answer is ${meanings[clue.arrow === "up" ? 0 : 1]}`
      : "";
  return `${CLUE_NAMES[clue.key]} ${clue.text}, ${clue.verdict}${arrow}`;
}
