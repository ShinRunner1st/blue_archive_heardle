import { beforeEach, describe, expect, it } from "vitest";

import { songs } from "../constants";
import { students } from "../constants/students";
import { saveRoomRecord } from "./missions";
import { profileStats } from "./profileStats";
import { emptyGuesses, saveRounds, saveStudentRounds } from "./storage";

function round(
  themeNo: string,
  tries: number,
  didGuess: boolean,
  day?: number
) {
  const song = songs.find((s) => s.themeNo === themeNo)!;
  return {
    solution: song,
    currentTry: tries,
    didGuess,
    guesses: emptyGuesses(),
    startTime: 0,
    ...(day === undefined ? {} : { day }),
  };
}

beforeEach(() => {
  localStorage.clear();
});

describe("profileStats", () => {
  it("starts every game from nothing", () => {
    const stats = profileStats(5);
    expect(stats.games.map((game) => game.id)).toEqual([
      "ost",
      "voice",
      "halo",
      "weapon",
      "gameplay",
      "lore",
    ]);
    for (const game of stats.games) {
      expect(game.played).toBe(0);
      expect(game.averageTries).toBeNull();
      expect(game.spread.every((bar) => bar.count === 0)).toBe(true);
    }
    expect(stats.daysPlayed).toBe(0);
    expect(stats.room).toEqual({ games: 0, wins: 0 });
  });

  it("tallies the OST by way to play, its daily spread and streaks", () => {
    saveRounds(
      [round("1", 1, true, 3), round("2", 3, true, 4), round("3", 6, false, 5)],
      "daily"
    );
    saveRounds(
      [round("4", 2, true), round("5", 2, true), round("6", 4, true)],
      "endless"
    );
    const ost = profileStats(5).games[0];
    expect(ost.played).toBe(6);
    expect(ost.won).toBe(5);
    expect(ost.averageTries).toBeCloseTo((1 + 3 + 2 + 2 + 4) / 5);
    expect(ost.daily).toEqual({ played: 3, won: 2, current: 0, best: 2 });
    expect(ost.spread.map((bar) => bar.count)).toEqual([1, 0, 1, 0, 0, 0, 1]);
    expect(ost.modes.map((mode) => [mode.label, mode.bestRun])).toEqual([
      ["Daily", 2],
      ["Classic", 3],
      ["4-Choice", 0],
    ]);
  });

  it("times the student game's finds and bands its guesses", () => {
    const [a, b, c] = students;
    saveStudentRounds("gameplay-daily", [
      { answer: a.id, guesses: [b.id, a.id], day: 4, time: 30_000 },
      { answer: b.id, guesses: [a.id], gaveUp: true, day: 5 },
    ]);
    saveStudentRounds("gameplay-endless", [
      { answer: c.id, guesses: [a.id, b.id, c.id], time: 90_000 },
    ]);
    const gameplay = profileStats(5).games.find((g) => g.id === "gameplay")!;
    expect(gameplay.played).toBe(3);
    expect(gameplay.won).toBe(2);
    expect(gameplay.fastest).toBe(30_000);
    expect(gameplay.averageTime).toBe(60_000);
    expect(gameplay.spread[0]).toEqual({ label: "1-3", count: 1 });
    expect(gameplay.spread.at(-1)).toMatchObject({ count: 1, lost: true });
    expect(profileStats(5).daysPlayed).toBe(2);
  });

  it("reads the multiplayer record", () => {
    saveRoomRecord({ games: 7, wins: 2 });
    expect(profileStats(5).room).toEqual({ games: 7, wins: 2 });
  });
});
