import { describe, expect, it } from "vitest";

import { Round } from "../types/stats";
import { dateOfDay, dayNumber } from "./daily";
import { calendarMonths, calendarWeeks, dailyOutcomes } from "./dailyCalendar";
import { emptyGuesses } from "./storage";

function round(
  day: number | undefined,
  currentTry: number,
  didGuess: boolean
): Round {
  return {
    solution: { artist: "Mitsukiyo", name: "Constant Moderato", themeNo: "1" },
    currentTry,
    didGuess,
    guesses: emptyGuesses(),
    startTime: 0,
    ...(day === undefined ? {} : { day }),
  };
}

describe("dateOfDay", () => {
  it("is the reverse of dayNumber, across daylight saving changes", () => {
    for (let day = 1; day <= 800; day += 1) {
      expect(dayNumber(dateOfDay(day))).toBe(day);
    }
  });

  it("puts puzzle #1 on 27 September 2026", () => {
    expect(dateOfDay(1)).toEqual(new Date(2026, 8, 27));
    expect(dateOfDay(6)).toEqual(new Date(2026, 9, 2));
  });
});

describe("dailyOutcomes", () => {
  it("keeps finished puzzles only, by day", () => {
    const outcomes = dailyOutcomes([
      round(1, 2, true),
      round(2, 6, false),
      round(3, 3, false),
      round(undefined, 1, true),
    ]);

    expect([...outcomes]).toEqual([
      [1, { won: true, tries: 2 }],
      [2, { won: false }],
    ]);
  });
});

describe("calendarMonths", () => {
  it("runs from the first puzzle's month to today's", () => {
    expect(calendarMonths(1)).toEqual([{ year: 2026, month: 8 }]);
    expect(calendarMonths(4)).toEqual([{ year: 2026, month: 8 }]);
    expect(calendarMonths(97)).toEqual([
      { year: 2026, month: 8 },
      { year: 2026, month: 9 },
      { year: 2026, month: 10 },
      { year: 2026, month: 11 },
      { year: 2027, month: 0 },
    ]);
  });
});

describe("calendarWeeks", () => {
  it("lays September 2026 out from Sunday, with puzzles from the 27th", () => {
    const weeks = calendarWeeks({ year: 2026, month: 8 }, 2);
    const cells = weeks.flat();

    expect(weeks.every((week) => week.length === 7)).toBe(true);
    // 1 September 2026 is a Tuesday.
    expect(cells.slice(0, 3)).toEqual([
      null,
      null,
      { date: 1, day: null, isToday: false },
    ]);

    const puzzles = cells.filter((cell) => cell?.day !== null && cell !== null);
    expect(puzzles).toEqual([
      { date: 27, day: 1, isToday: false },
      { date: 28, day: 2, isToday: true },
    ]);
  });
});
