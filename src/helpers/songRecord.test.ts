import { describe, expect, it } from "vitest";

import { Round } from "../types/stats";
import { songRecord, songRecordText } from "./songRecord";
import { emptyGuesses } from "./storage";

function round(themeNo: string, currentTry: number, didGuess: boolean): Round {
  return {
    solution: { artist: "Mitsukiyo", name: `Theme ${themeNo}`, themeNo },
    currentTry,
    didGuess,
    guesses: emptyGuesses(),
    startTime: 0,
  };
}

describe("songRecord", () => {
  it("counts finished rounds of the song, its wins and its best", () => {
    const rounds = [
      round("1", 4, true),
      round("2", 1, true),
      round("1", 6, false),
      round("1", 2, true),
      round("1", 5, true),
    ];

    expect(songRecord(rounds, "1")).toEqual({ heard: 4, guessed: 3, best: 2 });
  });

  it("leaves out a round still being played", () => {
    const rounds = [round("1", 3, true), round("1", 2, false)];

    expect(songRecord(rounds, "1")).toEqual({ heard: 1, guessed: 1, best: 3 });
  });

  it("has no best for a song never guessed", () => {
    const rounds = [round("1", 6, false), round("1", 6, false)];

    expect(songRecord(rounds, "1")).toEqual({
      heard: 2,
      guessed: 0,
      best: null,
    });
  });
});

describe("songRecordText", () => {
  it("says so the first time", () => {
    expect(songRecordText({ heard: 1, guessed: 1, best: 1 })).toBe(
      "The first time you've heard this one"
    );
  });

  it("gives the heard, guessed and best counts", () => {
    expect(songRecordText({ heard: 4, guessed: 3, best: 2 })).toBe(
      "Heard 4 times · guessed 3 · best in 2 tries"
    );
    expect(songRecordText({ heard: 2, guessed: 1, best: 1 })).toBe(
      "Heard 2 times · guessed 1 · best in 1 try"
    );
  });

  it("says when it hasn't been guessed yet", () => {
    expect(songRecordText({ heard: 3, guessed: 0, best: null })).toBe(
      "Heard 3 times · not guessed yet"
    );
  });

  it("says nothing without a record", () => {
    expect(songRecordText({ heard: 0, guessed: 0, best: null })).toBe("");
  });
});
