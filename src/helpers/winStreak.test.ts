import { describe, expect, it } from "vitest";

import { emptyGuesses } from "./storage";
import { calWinStreak, nextPlace, placeFor, streakNews } from "./winStreak";
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

describe("placeFor and nextPlace", () => {
  it("stays home below ten wins", () => {
    expect(placeFor(9)).toBeNull();
    expect(nextPlace(9)?.name).toBe("Abydos Station");
  });

  it("moves every ten wins, up to a hundred", () => {
    expect(placeFor(10)?.name).toBe("Abydos Station");
    expect(placeFor(35)?.name).toBe("Gehenna Streets");
    expect(placeFor(250)?.name).toBe("Above Kivotos");
    expect(nextPlace(100)).toBeNull();
  });
});

describe("streakNews", () => {
  it("announces a place the moment it is reached", () => {
    expect(streakNews({ current: 20, before: 19 }, true)).toBe(
      "📍 New place unlocked: Millennium Campus!"
    );
  });

  it("otherwise shows the way to the next place", () => {
    expect(streakNews({ current: 12, before: 11 }, true)).toBe(
      "🔥 12 in a row · 8 more to Millennium Campus"
    );
    expect(streakNews({ current: 104, before: 103 }, true)).toBe(
      "🔥 104 in a row"
    );
  });

  it("says where a lost streak leaves you, if it had reached a place", () => {
    expect(streakNews({ current: 0, before: 23 }, false)).toBe(
      "Your 23-win streak is over. Back to the Trinity library."
    );
    expect(streakNews({ current: 0, before: 4 }, false)).toBeNull();
  });
});
