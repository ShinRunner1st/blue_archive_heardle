import { songs } from "../constants";
import { students } from "../constants/students";
import { BADGE_MODES, ROUND_MODES } from "../types/mode";
import { STUDENT_SLOTS, StudentRound, StudentSlot } from "../types/student";
import { badgeProgress, guessedThemes } from "./badges";
import { isFinished } from "./calStats";
import { dateOfDay, dayNumber } from "./daily";
import { loadRounds, loadStudentRounds } from "./storage";
import { calStreaks } from "./streaks";
import { asRound, isOver, isWon } from "./studentRounds";
import { timeAttackStats } from "./timeAttack";
import { bestWinStreak } from "./winStreak";

/** A player's record across every mode, for the Sensei card. */
export interface SenseiStats {
  songsGuessed: number;
  songsTotal: number;
  badgesEarned: number;
  badgesTotal: number;
  /** The longest run of daily puzzles won, OST or student. */
  bestDailyStreak: number;
  /** The longest run of Classic wins in a row. */
  bestWinStreak: number;
  /** The most songs in a time attack run. */
  timeAttackBest: number;
  /** Different students found at least once, in either way to play. */
  studentsFound: number;
  studentsTotal: number;
  /** Finished rounds in every mode, time attack's songs included. */
  roundsPlayed: number;
  /** The day of the first daily puzzle played, if any. */
  since: Date | null;
}

/**
 * Reads every mode's saves, as they are now: the card is made on demand, so
 * it reads the saves rather than holding every mode's state itself.
 */
export function senseiStats(today: number = dayNumber()): SenseiStats {
  const rounds = Object.fromEntries(
    [...ROUND_MODES, "timeattack" as const].map((mode) => [
      mode,
      loadRounds(mode),
    ])
  );
  const bySlot = Object.fromEntries(
    STUDENT_SLOTS.map((slot) => [slot, loadStudentRounds(slot)])
  ) as Record<StudentSlot, StudentRound[]>;
  const studentRounds = Object.values(bySlot);
  const studentDailies = [bySlot["gameplay-daily"], bySlot["lore-daily"]].map(
    (daily) => daily.map(asRound)
  );

  const guessed = guessedThemes(BADGE_MODES.flatMap((mode) => rounds[mode]));
  const badges = badgeProgress(guessed);

  const dailyBests = [rounds.daily, ...studentDailies].map(
    (daily) => calStreaks(daily, today).max
  );

  const found = new Set(
    studentRounds
      .flat()
      .filter(isWon)
      .map(({ answer }) => answer)
  );

  const days = [rounds.daily, ...studentDailies]
    .flat()
    .filter(isFinished)
    .flatMap((round) => (typeof round.day === "number" ? [round.day] : []));

  const timeAttack = timeAttackStats(rounds.timeattack);

  return {
    songsGuessed: songs.filter((song) => guessed.has(song.themeNo)).length,
    songsTotal: songs.length,
    badgesEarned: badges.filter((badge) => badge.done).length,
    badgesTotal: badges.length,
    bestDailyStreak: Math.max(...dailyBests),
    bestWinStreak: bestWinStreak(rounds.endless),
    timeAttackBest: Math.max(timeAttack.best.typed, timeAttack.best.choice),
    studentsFound: found.size,
    studentsTotal: students.length,
    roundsPlayed:
      ROUND_MODES.reduce(
        (total, mode) => total + rounds[mode].filter(isFinished).length,
        0
      ) +
      timeAttack.answered +
      studentRounds.flat().filter(isOver).length,
    since: days.length > 0 ? dateOfDay(Math.min(...days)) : null,
  };
}
