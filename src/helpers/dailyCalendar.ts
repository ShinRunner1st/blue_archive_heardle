import { Round } from "../types/stats";
import { isFinished } from "./calStats";
import { dateOfDay, dayNumber } from "./daily";

/** How a finished daily puzzle went. */
export type DayOutcome = { won: true; tries: number } | { won: false };

/**
 * Each finished puzzle's outcome, by puzzle number. A puzzle left unfinished
 * isn't in here: on a past day it counts as not played.
 */
export function dailyOutcomes(rounds: Round[]): Map<number, DayOutcome> {
  const outcomes = new Map<number, DayOutcome>();

  for (const round of rounds) {
    if (typeof round.day !== "number" || !isFinished(round)) continue;
    outcomes.set(
      round.day,
      round.didGuess
        ? { won: true, tries: Math.max(round.currentTry, 1) }
        : { won: false }
    );
  }

  return outcomes;
}

export interface CalendarDay {
  /** Day of the month, 1-31. */
  date: number;
  /** The puzzle on this date, or null before the first one or after today. */
  day: number | null;
  isToday: boolean;
}

export interface MonthKey {
  year: number;
  /** 0-11, as Date counts them. */
  month: number;
}

/**
 * The months that have puzzles in them, oldest first: from the month of
 * puzzle #1 to the month of today's.
 */
export function calendarMonths(today: number = dayNumber()): MonthKey[] {
  const first = dateOfDay(1);
  const last = dateOfDay(today);
  const months: MonthKey[] = [];

  for (
    let date = new Date(first.getFullYear(), first.getMonth(), 1);
    date <= last;
    date = new Date(date.getFullYear(), date.getMonth() + 1, 1)
  ) {
    months.push({ year: date.getFullYear(), month: date.getMonth() });
  }

  return months;
}

/**
 * A month laid out in weeks from Sunday, with null for the blank cells before
 * the 1st and after the last day.
 */
export function calendarWeeks(
  { year, month }: MonthKey,
  today: number = dayNumber()
): Array<Array<CalendarDay | null>> {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: Array<CalendarDay | null> = Array.from(
    { length: new Date(year, month, 1).getDay() },
    () => null
  );

  for (let date = 1; date <= daysInMonth; date += 1) {
    const midnight = new Date(year, month, date);
    const day = dayNumber(midnight);
    // dayNumber never goes below 1, so a date before the first puzzle is
    // caught by checking that the puzzle really falls on this date.
    const inRange =
      day <= today && dateOfDay(day).getTime() === midnight.getTime();
    cells.push({
      date,
      day: inRange ? day : null,
      isToday: inRange && day === today,
    });
  }

  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: Array<Array<CalendarDay | null>> = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}
