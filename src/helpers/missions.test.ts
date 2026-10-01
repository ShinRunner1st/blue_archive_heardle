import { beforeEach, describe, expect, it } from "vitest";

import { songs } from "../constants";
import { MISSIONS } from "../constants/missions";
import { students } from "../constants/students";
import { Round } from "../types/stats";
import {
  checkMissions,
  loadClearedMissions,
  loadRoomRecord,
  missionFacts,
  missionProgress,
  recordRoomGame,
  toClearedMissions,
  toRoomRecord,
} from "./missions";
import {
  emptyGuesses,
  savePictureRounds,
  saveRounds,
  saveStudentRounds,
  saveVoiceRounds,
} from "./storage";

beforeEach(() => localStorage.clear());

const [a, b, c, d] = students.map(({ id }) => id);

/** An OST round won on try `tries`, or lost. */
function ostRound(won: boolean, tries = 1, day?: number): Round {
  return {
    solution: songs[0],
    currentTry: won ? tries : 6,
    didGuess: won,
    guesses: emptyGuesses(),
    startTime: 0,
    ...(day === undefined ? {} : { day }),
  };
}

const done = (id: string) =>
  missionProgress(missionFacts(10)).find(({ mission }) => mission.id === id)!
    .done;

describe("missions", () => {
  it("has nothing cleared for a new player", () => {
    const progress = missionProgress(missionFacts(10));
    expect(progress.filter(({ done }) => done)).toEqual([]);
    expect(progress).toHaveLength(MISSIONS.length);
  });

  it("gives every mission an id of its own", () => {
    const ids = MISSIONS.map(({ id }) => id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("clears the first daily and perfect pitch from one OST daily", () => {
    saveRounds([ostRound(true, 1, 3)], "daily");
    expect(done("first-daily")).toBe(true);
    expect(done("ost-first-try")).toBe(true);
    expect(done("daily-7")).toBe(false);
  });

  it("doesn't count a win on a later try as perfect pitch", () => {
    saveRounds([ostRound(true, 2)], "endless");
    expect(done("ost-first-try")).toBe(false);
  });

  it("counts a full schedule only when all six dailies fall on one day", () => {
    saveRounds([ostRound(true, 3, 5)], "daily");
    saveVoiceRounds("daily", [{ answer: a, guesses: [a], line: 0, day: 5 }]);
    savePictureRounds("halo-daily", [{ answer: b, guesses: [b], day: 5 }]);
    savePictureRounds("weapon-daily", [{ answer: c, guesses: [c], day: 5 }]);
    saveStudentRounds("gameplay-daily", [{ answer: d, guesses: [d], day: 5 }]);
    expect(missionFacts(10).daySweep).toBe(5);
    expect(done("daily-sweep")).toBe(false);

    saveStudentRounds("lore-daily", [{ answer: a, guesses: [a], day: 5 }]);
    expect(missionFacts(10).daySweep).toBe(6);
    expect(done("daily-sweep")).toBe(true);
    expect(done("students-both")).toBe(true);
  });

  it("counts a halo named in two ways to play as one picture", () => {
    savePictureRounds("halo-endless", [{ answer: a, guesses: [a] }]);
    savePictureRounds("halo-silhouette", [{ answer: a, guesses: [a] }]);
    savePictureRounds("weapon-endless", [{ answer: a, guesses: [a] }]);
    const facts = missionFacts(10);
    expect(facts.picturesNamed).toBe(2);
    expect(facts.haloShapes).toBe(1);
    expect(facts.weaponShapes).toBe(0);
  });

  it("finds a student in three guesses, and not in four", () => {
    saveStudentRounds("gameplay-endless", [
      { answer: a, guesses: [b, c, d, a] },
    ]);
    expect(done("students-quick")).toBe(false);
    saveStudentRounds("lore-endless", [{ answer: a, guesses: [b, c, a] }]);
    expect(done("students-quick")).toBe(true);
  });

  it("counts JP rounds apart from Global's", () => {
    saveVoiceRounds("endless", [{ answer: a, guesses: [a], line: 0 }]);
    expect(done("jp")).toBe(false);
    saveVoiceRounds("endless", [{ answer: a, guesses: [a], line: 0 }], "jp");
    expect(done("jp")).toBe(true);
  });

  it("counts the multiplayer games the browser finished", () => {
    recordRoomGame(false);
    recordRoomGame(true);
    expect(loadRoomRecord()).toEqual({ games: 2, wins: 1 });
    expect(done("room-first")).toBe(true);
    expect(done("room-win")).toBe(true);
    expect(done("room-10")).toBe(false);
  });
});

describe("checkMissions", () => {
  it("says the first check is the first, whatever it clears", () => {
    expect(checkMissions(missionFacts(10))).toEqual({
      cleared: [],
      first: true,
    });
    expect(checkMissions(missionFacts(10)).first).toBe(false);
  });

  it("reports a mission once, then keeps it after a reset", () => {
    checkMissions(missionFacts(10));
    saveRounds([ostRound(true, 1)], "endless");
    const { cleared } = checkMissions(missionFacts(10));
    expect(cleared.map(({ id }) => id)).toEqual(["ost-first-try"]);
    expect(checkMissions(missionFacts(10)).cleared).toEqual([]);

    saveRounds([], "endless");
    expect(done("ost-first-try")).toBe(true);
    expect(loadClearedMissions()).toContain("ost-first-try");
  });
});

describe("checking what's stored", () => {
  it("drops unknown or repeated missions", () => {
    expect(toClearedMissions(["jp", "jp", "nope", 3])).toEqual(["jp"]);
    expect(toClearedMissions("jp")).toEqual([]);
  });

  it("reads a broken room record as none", () => {
    expect(toRoomRecord({ games: -1, wins: "2" })).toEqual({
      games: 0,
      wins: 0,
    });
    expect(toRoomRecord(null)).toEqual({ games: 0, wins: 0 });
  });
});
