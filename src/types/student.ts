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

/** A student's birthday, for the note on the day. */
export interface StudentBirthday {
  id: number;
  name: string;
  birthday: Birthday;
}

/** The two ways to play: by kit, or by profile. */
export type StudentGame = "gameplay" | "lore";

export const STUDENT_GAMES: StudentGame[] = ["gameplay", "lore"];

export function isStudentGame(value: unknown): value is StudentGame {
  return STUDENT_GAMES.includes(value as StudentGame);
}
