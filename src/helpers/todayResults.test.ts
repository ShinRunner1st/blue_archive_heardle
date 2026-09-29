import { beforeEach, describe, expect, it } from "vitest";

import { songs } from "../constants";
import { students } from "../constants/students";
import { SKIPPED } from "../types/voice";
import {
  emptyGuesses,
  savePictureRounds,
  saveRounds,
  saveStudentRounds,
  saveVoiceRounds,
} from "./storage";
import { todayResults } from "./todayResults";

const TODAY = 5;

function ostRound(day: number, currentTry: number, didGuess: boolean) {
  return {
    solution: songs[0],
    currentTry,
    didGuess,
    guesses: emptyGuesses(),
    startTime: 0,
    day,
  };
}

beforeEach(() => {
  localStorage.clear();
});

describe("todayResults", () => {
  it("has every puzzle unplayed for a new player", () => {
    expect(todayResults(TODAY)).toEqual({
      ost: [{ state: "unplayed" }],
      voice: [{ state: "unplayed" }],
      students: [
        { label: "Gameplay", state: "unplayed" },
        { label: "Lore", state: "unplayed" },
      ],
      picture: [
        { label: "Halo", state: "unplayed" },
        { label: "Weapon", state: "unplayed" },
      ],
    });
  });

  it("reads today's round only, not yesterday's", () => {
    saveRounds([ostRound(TODAY - 1, 2, true)], "daily");
    expect(todayResults(TODAY).ost).toEqual([{ state: "unplayed" }]);

    saveRounds(
      [ostRound(TODAY - 1, 2, true), ostRound(TODAY, 2, true)],
      "daily"
    );
    expect(todayResults(TODAY).ost).toEqual([
      { state: "won", used: 2, tries: 6 },
    ]);
  });

  it("tells a round in progress from a lost one", () => {
    saveRounds([ostRound(TODAY, 3, false)], "daily");
    expect(todayResults(TODAY).ost[0].state).toBe("playing");

    saveRounds([ostRound(TODAY, 6, false)], "daily");
    expect(todayResults(TODAY).ost[0].state).toBe("lost");
  });

  it("counts the student game's guesses, with no limit", () => {
    const [a, b, c] = students;
    saveStudentRounds("lore-daily", [
      { answer: a.id, guesses: [b.id, c.id, a.id], day: TODAY },
    ]);
    saveStudentRounds("gameplay-daily", [
      { answer: a.id, guesses: [b.id], gaveUp: true, day: TODAY },
    ]);

    expect(todayResults(TODAY).students).toEqual([
      { label: "Gameplay", state: "lost" },
      { label: "Lore", state: "won", used: 3 },
    ]);
  });

  it("reads Voice and each picture kind's daily", () => {
    const [a, b] = students;
    saveVoiceRounds("daily", [
      { answer: a.id, guesses: [SKIPPED, a.id], line: 0, day: TODAY },
    ]);
    savePictureRounds("weapon-daily", [
      { answer: a.id, guesses: [b.id], day: TODAY },
    ]);

    const results = todayResults(TODAY);
    expect(results.voice).toEqual([{ state: "won", used: 2, tries: 4 }]);
    expect(results.picture).toEqual([
      { label: "Halo", state: "unplayed" },
      { label: "Weapon", state: "playing" },
    ]);
  });
});
