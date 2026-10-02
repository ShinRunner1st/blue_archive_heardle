import { beforeEach, describe, expect, it } from "vitest";

import { songs } from "../constants";
import { Mission, MissionFact, MissionRule } from "../constants/missions";
import { students } from "../constants/students";
import { ruleProblems } from "../content/validate";
import { Round } from "../types/stats";
import {
  FACT_RULES,
  playedRounds,
  ruleCount,
  ruleValues,
  waysOf,
} from "./missionRules";
import {
  loadMissionSave,
  missionFacts,
  missionValue,
  recordRoomGame,
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

function ostRound(
  won: boolean,
  tries = 1,
  extra: Partial<Round> = {},
  song = songs[0]
): Round {
  return {
    solution: song,
    currentTry: won ? tries : 6,
    didGuess: won,
    guesses: emptyGuesses(),
    startTime: 0,
    ...extra,
  };
}

/** A little of everything, on both servers. */
function playSome() {
  saveRounds(
    [
      ostRound(true, 1, { day: 3 }),
      ostRound(true, 2, { day: 4 }),
      ostRound(false, 6, { day: 5 }),
      ostRound(true, 1, { day: 6 }),
    ],
    "daily"
  );
  saveRounds(
    [ostRound(true, 1), ostRound(true, 3, {}, songs[1]), ostRound(false)],
    "endless"
  );
  saveRounds(
    [true, true, false, true, true, true].map((won) =>
      ostRound(won, 1, { tries: 1, clip: 3, choices: [] })
    ),
    "choice"
  );
  saveVoiceRounds("nohint", [
    { answer: a, guesses: [a], line: 0 },
    { answer: b, guesses: [c, b], line: 0 },
    { answer: c, guesses: [a, b, d, a], line: 0 },
  ]);
  saveVoiceRounds("timeattack", [
    { answer: a, guesses: [a], line: 0, run: 1 },
    { answer: b, guesses: [b], line: 0, run: 1 },
    { answer: c, guesses: [c], line: 0, run: 2 },
  ]);
  savePictureRounds("halo-silhouette", [
    { answer: a, guesses: [a] },
    { answer: b, guesses: [b, b] },
  ]);
  savePictureRounds("halo-timeattack", [
    { answer: c, guesses: [c], run: 7, shape: true },
    { answer: d, guesses: [d], run: 7 },
  ]);
  savePictureRounds("weapon-choice-silhouette", [
    { answer: a, guesses: [a], choices: [a, b, c, d] },
  ]);
  saveStudentRounds("gameplay-endless", [
    { answer: a, guesses: [b, a], time: 30_000 },
    { answer: b, guesses: [a, c, d, b], time: 90_000 },
    { answer: c, guesses: [a], gaveUp: true },
  ]);
  saveStudentRounds(
    "lore-daily",
    [{ answer: a, guesses: [a], day: 4, time: 5_000 }],
    "jp"
  );
  saveVoiceRounds(
    "daily",
    [{ answer: d, guesses: [d], line: 0, day: 3 }],
    "jp"
  );
  recordRoomGame(true);
  recordRoomGame(false);
  recordRoomGame(true);
}

/** Each of the game's own counts a rule counts the same, and that rule. */
const SAME = Object.entries(FACT_RULES) as Array<[MissionFact, MissionRule]>;

describe("mission rules", () => {
  it.each(SAME)("counts as %s does", (fact, rule) => {
    playSome();
    const save = loadMissionSave();
    const facts = missionFacts(10, save);
    expect(ruleCount(rule, playedRounds(save), save.roomRecord)).toBe(
      facts[fact]
    );
    expect(facts[fact]).toBeGreaterThan(0);
  });

  it("counts the seconds of the OST clip heard", () => {
    playSome();
    const rounds = playedRounds(loadMissionSave());
    const ost: MissionRule = { count: "rounds", games: ["ost"] };
    // Wins on the first try (1 s) and the second (2 s); 4-Choice's are 3 s.
    expect(ruleCount({ ...ost, clip: 1 }, rounds)).toBe(3);
    expect(ruleCount({ ...ost, clip: 2 }, rounds)).toBe(4);
    expect(ruleCount({ ...ost, clip: 3 }, rounds)).toBe(9);
  });

  it("counts days, across games and servers, once each", () => {
    playSome();
    const rounds = playedRounds(loadMissionSave());
    expect(ruleCount({ count: "days" }, rounds)).toBe(3);
    expect(ruleCount({ count: "days", server: "jp" }, rounds)).toBe(2);
    // Days 3 and 4 won in two games, 5 lost, 6 won.
    expect(ruleCount({ count: "dayStreak" }, rounds)).toBe(2);
  });

  it("breaks a streak on a round it doesn't count, in that list only", () => {
    playSome();
    const rounds = playedRounds(loadMissionSave());
    // No hints: 1st try, 2nd try, then a miss.
    const noHints = { count: "streak", games: ["voice"], modes: ["nohint"] };
    expect(ruleCount({ ...noHints, tries: 2 } as MissionRule, rounds)).toBe(2);
    expect(ruleCount({ ...noHints, tries: 1 } as MissionRule, rounds)).toBe(1);
    // Time Attack's three first tries are a list of their own.
    expect(
      ruleCount({ count: "streak", games: ["voice"], tries: 1 }, rounds)
    ).toBe(3);
    expect(
      ruleCount(
        { count: "streak", games: ["multiplayer"], result: "played" },
        rounds
      )
    ).toBe(3);
  });

  it("tells pictures from silhouettes, a run's too", () => {
    playSome();
    const rounds = playedRounds(loadMissionSave());
    expect(ruleCount({ count: "rounds", silhouette: false }, rounds)).toBe(1);
    expect(
      ruleCount({ count: "run", games: ["halo"], silhouette: true }, rounds)
    ).toBe(1);
    expect(ruleCount({ count: "run", games: ["halo"] }, rounds)).toBe(2);
  });

  it("counts different answers as one student, whatever the game", () => {
    playSome();
    const rounds = playedRounds(loadMissionSave());
    expect(
      ruleCount({ count: "different", games: ["voice", "gameplay"] }, rounds)
    ).toBe(4);
    expect(ruleCount({ count: "different", games: ["halo"] }, rounds)).toBe(4);
  });

  it("adds the multiplayer counts from before the list to plain counts", () => {
    const rounds = playedRounds(loadMissionSave());
    const legacy = { games: 5, wins: 2 };
    expect(ruleCount({ count: "rounds" }, rounds, legacy)).toBe(2);
    expect(
      ruleCount({ count: "rounds", result: "played" }, rounds, legacy)
    ).toBe(5);
    expect(ruleCount({ count: "rounds", tries: 3 }, rounds, legacy)).toBe(0);
    expect(ruleCount({ count: "streak" }, rounds, legacy)).toBe(0);
  });

  it("clears a mission with a rule", () => {
    playSome();
    const mission: Mission = {
      id: "test-rule",
      group: "voice",
      title: "Test",
      text: "Test",
      rule: { count: "rounds", games: ["voice"], modes: ["nohint"] },
      goal: 2,
    };
    const save = loadMissionSave();
    const ruled = ruleValues(save, [mission]);
    expect(ruled).toEqual({ "test-rule": 2 });
    expect(ruleValues(save, [{ ...mission, retired: true }])).toEqual({});
    expect(missionValue(mission, missionFacts(10, save), ruled)).toBe(2);
    expect(missionValue(mission, missionFacts(10, save), {})).toBe(0);
  });
});

describe("checking a rule", () => {
  it("takes a rule some way to play can count", () => {
    expect(ruleProblems({ count: "rounds" })).toEqual([]);
    expect(
      ruleProblems({ count: "run", games: ["ost", "voice"], clip: 3 })
    ).toEqual([]);
    expect(waysOf({ count: "run", clip: 3 })).toEqual([
      expect.objectContaining({ game: "ost", mode: "timeattack" }),
    ]);
  });

  it("refuses what no way to play has", () => {
    const none = /matches no way to play/;
    expect(ruleProblems({ count: "rounds", clip: 2, seconds: 30 })).toEqual([
      expect.stringMatching(none),
    ]);
    expect(ruleProblems({ count: "days", modes: ["timeattack"] })).toEqual([
      expect.stringMatching(none),
    ]);
    expect(
      ruleProblems({ count: "rounds", games: ["ost"], server: "jp" })
    ).toEqual([expect.stringMatching(none)]);
    expect(
      ruleProblems({ count: "rounds", silhouette: true, modes: ["daily"] })
    ).toEqual([expect.stringMatching(none)]);
  });

  it("refuses fields and values it doesn't know", () => {
    expect(
      ruleProblems({ count: "most", wins: 3 } as unknown as MissionRule)
    ).toEqual([
      "rule has a field it doesn't know, wins",
      "rule counts most, which isn't a count",
    ]);
    expect(
      ruleProblems({
        count: "rounds",
        games: ["ost", "ost"],
        tries: 0,
        clip: 20,
      } as MissionRule)
    ).toHaveLength(3);
  });
});
