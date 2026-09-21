import { describe, expect, it } from "vitest";

import { songs } from "../constants";
import { emptyGuesses } from "./storage";
import { isBagEmpty, pickSong } from "./pickSong";
import { Round } from "../types/stats";
import { Song } from "../types/song";

function round(solution: Song): Round {
  return {
    solution,
    currentTry: 6,
    didGuess: true,
    guesses: emptyGuesses(),
    startTime: 0,
  };
}

describe("pickSong", () => {
  it("never repeats a song while unplayed ones remain", () => {
    const played = songs.slice(0, songs.length - 1).map(round);

    expect(pickSong(played)).toEqual(songs[songs.length - 1]);
  });

  it("falls back to the full list once every song has been played", () => {
    const played = songs.map(round);

    expect(songs).toContainEqual(pickSong(played));
  });

  it("ignores stored songs that are no longer in the list", () => {
    const played = [round({ ...songs[0], themeNo: "9999" })];

    // The stale entry excludes nothing, so every real song stays available.
    const picked = pickSong(played);
    expect(songs).toContainEqual(picked);
  });
});

describe("isBagEmpty", () => {
  it("is false at the start of a run", () => {
    expect(isBagEmpty([])).toBe(false);
  });

  it("is true once every song has been played", () => {
    expect(isBagEmpty(songs.map(round))).toBe(true);
  });
});
