import { describe, expect, it } from "vitest";

import { calRecentCorrect } from "./calRecentCorrect";
import { calStats } from "./calStats";
import { emptyGuesses } from "./storage";
import { Round } from "../types/stats";
import { Song } from "../types/song";

const song: Song = {
  artist: "Mitsukiyo",
  name: "Constant Moderato",
  youtubeId: "SHkF48SgiSA",
  themeNo: "1",
};

function round(currentTry: number, didGuess: boolean): Round {
  return {
    solution: song,
    currentTry,
    didGuess,
    guesses: emptyGuesses(),
    startTime: 0,
  };
}

describe("calStats", () => {
  it("returns all zeroes for no rounds", () => {
    expect(calStats([])).toEqual([0, 0, 0, 0, 0, 0, 0, 0]);
  });

  it("buckets wins by the try they were solved on", () => {
    const tally = calStats([round(1, true), round(1, true), round(4, true)]);

    expect(tally[1]).toBe(2);
    expect(tally[4]).toBe(1);
    expect(tally[7]).toBe(3);
  });

  it("counts a six-try miss as a loss", () => {
    const tally = calStats([round(6, false)]);

    expect(tally[0]).toBe(1);
    expect(tally[7]).toBe(1);
  });

  it("excludes the round in progress from the total", () => {
    const tally = calStats([round(2, true), round(3, false)]);

    expect(tally[7]).toBe(1);
  });
});

describe("calRecentCorrect", () => {
  it("reports 0/0 before any round finishes", () => {
    expect(calRecentCorrect([])).toBe("0/0");
    expect(calRecentCorrect([round(0, false)])).toBe("0/0");
  });

  it("counts only finished rounds", () => {
    const rounds = [round(1, true), round(6, false), round(2, false)];

    // Two finished, one won, and the in-progress round is ignored.
    expect(calRecentCorrect(rounds)).toBe("1/2");
  });
});
