/** A calendar date, month first (1-12), then day. */
export type Birthday = [month: number, day: number];

/**
 * One answer in the student game: a student, or one of their costumes, which
 * is its own answer because its kit differs. Copied from SchaleDB at build
 * time by `npm run build:students` (see src/constants/students.ts).
 */
export interface Student {
  /** SchaleDB's id: what saves and the daily schedule hold. */
  id: number;
  /** The official English name, with the costume in brackets. */
  name: string;
  /** Family name first, as players search for it: "Takanashi Hoshino". */
  fullName: string;
  /** A default costume, so one of Lore mode's answers. */
  lore: boolean;

  school: string;
  role: string;
  damage: string;
  /** The armour type: Light, Heavy, Special, Elastic or Composite. */
  defense: string;
  weapon: string;
  /** The EX skill's cost at level 1. */
  exCost: number;
  /** Where the student comes in the game's release order. */
  order: number;

  /** In centimetres, or null where the game doesn't say. */
  height: number | null;
  birthday: Birthday | null;
  /** "1st Year" to "3rd Year", or what the game says instead ("Suspended"). */
  year: string;
  club: string;
  /**
   * The SSR gifts the student likes best. Usually one; two when they tie,
   * none for some guests from other series.
   */
  gifts: string[];
}

/** The two ways to play: by kit, or by profile. */
export type StudentGame = "gameplay" | "lore";

export const STUDENT_GAMES: StudentGame[] = ["gameplay", "lore"];

export function isStudentGame(value: unknown): value is StudentGame {
  return STUDENT_GAMES.includes(value as StudentGame);
}

/** Daily gives everyone the same student; endless deals from a bag. */
export type StudentMode = "daily" | "endless";

/** Each way to play and mode keeps its own rounds, stats and streak. */
export type StudentSlot = `${StudentGame}-${StudentMode}`;

export const STUDENT_SLOTS: StudentSlot[] = [
  "gameplay-daily",
  "gameplay-endless",
  "lore-daily",
  "lore-endless",
];

export function slotOf(game: StudentGame, mode: StudentMode): StudentSlot {
  return `${game}-${mode}`;
}

/**
 * One student to find. There is no limit on guesses: the round ends when the
 * answer is guessed or the player gives up. The last round in a saved list
 * is always the one in progress.
 */
export interface StudentRound {
  /** The answer's id. */
  answer: number;
  /** The ids guessed, in order, the answer last once found. */
  guesses: number[];
  gaveUp?: boolean;
  /** Which daily puzzle the round belongs to; daily rounds only. */
  day?: number;
  /**
   * When the clock started, in epoch milliseconds: the first letter typed or
   * the grid opened, so a puzzle left open unplayed doesn't count.
   */
  startedAt?: number;
  /** Milliseconds from the start to the find or the give-up. */
  time?: number;
}
