import { describe, expect, it } from "vitest";

import { songs } from "../constants";
import { VOLUMES } from "../constants/volumes";
import { badgeNews, badgeProgress, guessedThemes } from "./badges";
import { emptyGuesses } from "./storage";
import { Round } from "../types/stats";

const round = (themeNo: string, didGuess: boolean): Round => ({
  solution: { artist: "", name: "", themeNo },
  currentTry: didGuess ? 1 : 6,
  didGuess,
  guesses: emptyGuesses(),
  startTime: 0,
});

describe("VOLUMES", () => {
  it("lists only songs that are in the game", () => {
    const inGame = new Set(songs.map((song) => song.themeNo));
    for (const volume of VOLUMES) {
      for (const theme of volume.songs) expect(inGame).toContain(theme);
    }
  });

  it("matches the albums' published track counts", () => {
    // Vol.7's "Train Showdown" isn't in the game.
    expect(VOLUMES.map((volume) => volume.songs.length)).toEqual([
      39, 21, 26, 28, 27, 28, 27, 28,
    ]);
  });
});

describe("guessedThemes", () => {
  it("keeps the songs guessed right, once each", () => {
    const rounds = [round("1", true), round("2", false), round("1", true)];

    expect([...guessedThemes(rounds)]).toEqual(["1"]);
  });
});

describe("badgeProgress", () => {
  it("earns a badge once every song on the album is guessed", () => {
    const [vol1, vol2] = badgeProgress(new Set(VOLUMES[1].songs));

    expect(vol2).toMatchObject({ found: 21, total: 21, done: true });
    // Water Drop (39) is on both albums, so it counts for Vol.1 too.
    expect(vol1).toMatchObject({ found: 1, total: 39, done: false });
  });
});

describe("badgeNews", () => {
  it("counts a first right guess towards its album", () => {
    expect(badgeNews("1", new Set())).toEqual(["💿 New for OST Vol.1: 1 / 39"]);
  });

  it("names the album a guess completes", () => {
    const allButOne = new Set(VOLUMES[1].songs.filter((t) => t !== "2"));

    expect(badgeNews("2", allButOne)).toEqual([
      "💿 OST Vol.2 complete! Badge earned.",
    ]);
  });

  it("stays quiet for a song guessed before, or on no album", () => {
    expect(badgeNews("1", new Set(["1"]))).toEqual([]);
    expect(badgeNews("300", new Set())).toEqual([]);
  });

  it("speaks for both albums of a song on two", () => {
    expect(badgeNews("39", new Set())).toHaveLength(2);
  });
});
