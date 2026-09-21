import { describe, expect, it } from "vitest";

import { songs } from "../constants";
import { emptyGuesses } from "./storage";
import { calStreaks } from "./streaks";
import { Round } from "../types/stats";

function round(day: number, didGuess: boolean): Round {
  return {
    solution: songs[0],
    currentTry: didGuess ? 2 : 6,
    didGuess,
    guesses: emptyGuesses(),
    startTime: 0,
    day,
  };
}

describe("calStreaks", () => {
  it("is zero with nothing played", () => {
    expect(calStreaks([], 10)).toEqual({ current: 0, max: 0 });
  });

  it("counts consecutive wins up to today", () => {
    const rounds = [round(8, true), round(9, true), round(10, true)];

    expect(calStreaks(rounds, 10)).toEqual({ current: 3, max: 3 });
  });

  it("stays alive when today has not been played yet", () => {
    const rounds = [round(8, true), round(9, true)];

    expect(calStreaks(rounds, 10).current).toBe(2);
  });

  it("breaks once a day is skipped entirely", () => {
    const rounds = [round(6, true), round(7, true)];

    // Day 8 and 9 went unplayed, so the run ended.
    expect(calStreaks(rounds, 10).current).toBe(0);
  });

  it("breaks on a loss rather than counting it", () => {
    const rounds = [round(8, true), round(9, false), round(10, true)];

    expect(calStreaks(rounds, 10)).toEqual({ current: 1, max: 1 });
  });

  it("remembers the best run even after it ends", () => {
    const rounds = [
      round(1, true),
      round(2, true),
      round(3, true),
      round(5, true),
    ];

    expect(calStreaks(rounds, 10)).toEqual({ current: 0, max: 3 });
  });

  it("ignores endless rounds, which have no day", () => {
    const endless: Round = {
      solution: songs[0],
      currentTry: 1,
      didGuess: true,
      guesses: emptyGuesses(),
      startTime: 0,
    };

    expect(calStreaks([endless, round(10, true)], 10).current).toBe(1);
  });
});
