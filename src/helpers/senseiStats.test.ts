import { beforeEach, describe, expect, it } from "vitest";

import { songs } from "../constants";
import { students } from "../constants/students";
import { emptyGuesses, saveRounds, saveStudentRounds } from "./storage";
import { senseiStats } from "./senseiStats";

function won(themeNo: string, day?: number) {
  const song = songs.find((s) => s.themeNo === themeNo)!;
  return {
    solution: song,
    currentTry: 1,
    didGuess: true,
    guesses: emptyGuesses(),
    startTime: 0,
    ...(day === undefined ? {} : { day }),
  };
}

beforeEach(() => {
  localStorage.clear();
});

describe("senseiStats", () => {
  it("starts from nothing", () => {
    expect(senseiStats(5)).toMatchObject({
      songsGuessed: 0,
      songsTotal: songs.length,
      studentsFound: 0,
      // Global's, the server new players start on.
      studentsTotal: students.filter((student) => student.global).length,
      roundsPlayed: 0,
      since: null,
    });
  });

  it("adds up every mode's saves", () => {
    saveRounds([won("1", 3), won("2", 4)], "daily");
    saveRounds([won("2"), won("3"), won("4")], "endless");
    const [a, b] = students;
    saveStudentRounds("lore-daily", [
      { answer: a.id, guesses: [a.id], day: 2 },
    ]);
    saveStudentRounds("gameplay-endless", [
      { answer: b.id, guesses: [b.id] },
      { answer: a.id, guesses: [a.id] },
      { answer: b.id, guesses: [] },
    ]);

    const stats = senseiStats(4);
    expect(stats.songsGuessed).toBe(4);
    expect(stats.bestDailyStreak).toBe(2);
    expect(stats.bestWinStreak).toBe(3);
    expect(stats.studentsFound).toBe(2);
    // Five OST rounds and three finished student ones; the open one waits.
    expect(stats.roundsPlayed).toBe(8);
    expect(stats.since?.getDate()).toBe(28);
  });
});
