import { describe, expect, it } from "vitest";

import { emptyGuesses } from "./storage";
import {
  bestWinStreak,
  calDayStreak,
  calWinStreak,
  placeFor,
  streakNews,
} from "./winStreak";
import { Round } from "../types/stats";

const song = { artist: "Mitsukiyo", name: "Constant Moderato", themeNo: "1" };

function round(result: "won" | "lost" | "playing"): Round {
  return {
    solution: song,
    currentTry: result === "won" ? 2 : result === "lost" ? 6 : 1,
    didGuess: result === "won",
    guesses: emptyGuesses(),
    startTime: 0,
  };
}

const rounds = (...results: Array<"won" | "lost" | "playing">) =>
  results.map(round);

describe("calWinStreak", () => {
  it("counts the wins in a row at the end", () => {
    expect(
      calWinStreak(rounds("won", "lost", "won", "won", "playing"))
    ).toEqual({ current: 2, before: 2 });
  });

  it("starts again after a loss, remembering what was lost", () => {
    expect(calWinStreak(rounds("won", "won", "won", "lost"))).toEqual({
      current: 0,
      before: 3,
    });
  });

  it("counts a round only once it is over", () => {
    expect(calWinStreak(rounds("won", "won"))).toEqual({
      current: 2,
      before: 1,
    });
    expect(calWinStreak([])).toEqual({ current: 0, before: 0 });
  });
});

describe("bestWinStreak", () => {
  it("finds the longest run, skipping the round in progress", () => {
    expect(bestWinStreak([])).toBe(0);
    expect(
      bestWinStreak([
        round("won"),
        round("won"),
        round("lost"),
        round("won"),
        round("won"),
        round("playing"),
        round("won"),
        round("lost"),
      ])
    ).toBe(3);
  });
});

describe("placeFor", () => {
  it("stays home below ten wins", () => {
    expect(placeFor(9)).toBeNull();
  });

  it("moves every ten wins, up to a hundred", () => {
    expect(placeFor(10)?.name).toBe("Abydos Station");
    expect(placeFor(35)?.name).toBe("Gehenna Streets");
    expect(placeFor(250)?.name).toBe("Above Kivotos");
  });
});

describe("calDayStreak", () => {
  const day = (d: number, result: "won" | "lost" | "playing"): Round => ({
    ...round(result),
    day: d,
  });

  it("counts the day streak, with today's win just added", () => {
    expect(
      calDayStreak([day(8, "won"), day(9, "won"), day(10, "won")], 10)
    ).toEqual({ current: 3, before: 2 });
  });

  it("drops to nothing when today is lost, remembering the run", () => {
    expect(
      calDayStreak([day(8, "won"), day(9, "won"), day(10, "lost")], 10)
    ).toEqual({ current: 0, before: 2 });
  });

  it("holds while today is still being played", () => {
    expect(
      calDayStreak([day(8, "won"), day(9, "won"), day(10, "playing")], 10)
    ).toEqual({ current: 2, before: 2 });
  });
});

describe("streakNews", () => {
  it("announces a place the moment it is reached", () => {
    expect(streakNews({ current: 20, before: 19 }, true, "win")).toBe(
      "📍 New place unlocked: Millennium Campus!"
    );
  });

  it("keeps quiet between places, so the next stays a surprise", () => {
    expect(streakNews({ current: 12, before: 11 }, true, "win")).toBeNull();
    expect(streakNews({ current: 104, before: 103 }, true, "win")).toBeNull();
  });

  it("says where a lost streak leaves you, if it had reached a place", () => {
    expect(streakNews({ current: 0, before: 23 }, false, "win")).toBe(
      "Your 23-win streak is over. Back to the Trinity library."
    );
    expect(streakNews({ current: 0, before: 12 }, false, "day")).toBe(
      "Your 12-day streak is over. Back to the Trinity library."
    );
    expect(streakNews({ current: 0, before: 4 }, false, "win")).toBeNull();
  });
});
