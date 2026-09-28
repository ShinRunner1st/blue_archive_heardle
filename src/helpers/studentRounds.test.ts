import { describe, expect, it } from "vitest";

import { gameplayOrder, loreOrder } from "../constants/studentDailyOrder";
import { students } from "../constants/students";
import { StudentRound } from "../types/student";
import { calStreaks } from "./streaks";
import { dailyOutcomes } from "./dailyCalendar";
import {
  asRound,
  averageTime,
  dailyAnswer,
  fastestTime,
  formatSolveTime,
  isOver,
  isWon,
  knownRounds,
  pickAnswer,
  poolOf,
  roundTime,
  studentTally,
} from "./studentRounds";

const [first, second] = students;

describe("poolOf", () => {
  it("has every costume in Gameplay and default costumes in Lore", () => {
    expect(poolOf("gameplay")).toHaveLength(students.length);
    expect(poolOf("lore").every(({ lore }) => lore)).toBe(true);
    expect(poolOf("lore").some(({ name }) => name.includes("("))).toBe(false);
  });
});

describe("isWon and isOver", () => {
  it("wins on the answer, and ends on a win or giving up", () => {
    const answer = first.id;
    expect(isWon({ answer, guesses: [second.id, answer] })).toBe(true);
    expect(isOver({ answer, guesses: [second.id] })).toBe(false);
    expect(isOver({ answer, guesses: [second.id], gaveUp: true })).toBe(true);
    expect(isWon({ answer, guesses: [second.id], gaveUp: true })).toBe(false);
  });
});

describe("dailyAnswer", () => {
  it("deals the schedule in order, for each way to play", () => {
    expect(dailyAnswer("gameplay", 1)).toBe(gameplayOrder[0]);
    expect(dailyAnswer("gameplay", 2)).toBe(gameplayOrder[1]);
    expect(dailyAnswer("lore", 1)).toBe(loreOrder[0]);
  });

  it("wraps round once the schedule runs out", () => {
    expect(dailyAnswer("lore", loreOrder.length + 1)).toBe(loreOrder[0]);
  });

  it("gives Lore default costumes only", () => {
    const lore = new Set(poolOf("lore").map(({ id }) => id));
    for (let day = 1; day <= 60; day++) {
      expect(lore.has(dailyAnswer("lore", day))).toBe(true);
    }
  });
});

describe("pickAnswer", () => {
  it("deals every student once before any comes round again", () => {
    const pool = poolOf("lore");
    const rounds: StudentRound[] = [];
    for (let i = 0; i < pool.length; i++) {
      rounds.push({ answer: pickAnswer("lore", rounds), guesses: [] });
    }
    expect(new Set(rounds.map(({ answer }) => answer)).size).toBe(pool.length);
  });

  it("doesn't repeat the last answer straight after a refill", () => {
    const pool = poolOf("lore");
    const rounds = pool.map(({ id }) => ({ answer: id, guesses: [] }));
    const last = rounds[rounds.length - 1].answer;
    for (const random of [0, 0.5, 0.999]) {
      expect(pickAnswer("lore", rounds, () => random)).not.toBe(last);
    }
  });
});

describe("knownRounds", () => {
  it("drops rounds and guesses of students the game doesn't know", () => {
    const rounds = [
      { answer: 1, guesses: [] },
      { answer: first.id, guesses: [2, second.id] },
    ];
    expect(knownRounds("gameplay", rounds)).toEqual([
      { answer: first.id, guesses: [second.id] },
    ]);
  });

  it("drops a costume from Lore", () => {
    const costume = students.find(({ lore }) => !lore);
    expect(
      knownRounds("lore", [{ answer: costume?.id ?? 0, guesses: [] }])
    ).toEqual([]);
  });
});

describe("asRound", () => {
  it("lets the OST's streak and calendar helpers count student rounds", () => {
    const rounds = [
      { answer: first.id, guesses: [second.id, first.id], day: 1 },
      { answer: first.id, guesses: [first.id], day: 2 },
      { answer: first.id, guesses: [second.id], gaveUp: true, day: 3 },
      { answer: first.id, guesses: [second.id], day: 4 },
    ].map(asRound);

    expect(calStreaks(rounds, 2)).toEqual({ current: 2, max: 2 });
    expect(calStreaks(rounds, 3).current).toBe(0);
    expect(dailyOutcomes(rounds)).toEqual(
      new Map([
        [1, { won: true, tries: 2 }],
        [2, { won: true, tries: 1 }],
        [3, { won: false }],
      ])
    );
  });
});

describe("studentTally", () => {
  it("counts wins by guesses and giving up, not the round in play", () => {
    const answer = first.id;
    const wrong = Array.from({ length: 11 }, (_, i) => students[i + 1].id);
    const tally = studentTally([
      { answer, guesses: [answer] },
      { answer, guesses: [...wrong.slice(0, 2), answer] },
      { answer, guesses: [...wrong, answer] },
      { answer, guesses: [], gaveUp: true },
      { answer, guesses: [wrong[0]] },
    ]);
    expect(tally[0]).toBe(1);
    expect(tally[1]).toBe(1);
    expect(tally[3]).toBe(1);
    expect(tally[10]).toBe(1);
    expect(tally.reduce((a, b) => a + b, 0)).toBe(4);
  });
});

describe("solve times", () => {
  const found = (time?: number): StudentRound => ({
    answer: first.id,
    guesses: [first.id],
    ...(time === undefined ? {} : { time }),
  });

  it("reads like a stopwatch, rounded down", () => {
    expect(formatSolveTime(0)).toBe("0:00");
    expect(formatSolveTime(59_999)).toBe("0:59");
    expect(formatSolveTime(102_000)).toBe("1:42");
    expect(formatSolveTime(3_723_000)).toBe("1:02:03");
    expect(formatSolveTime(-50)).toBe("0:00");
  });

  it("times only finds, and leaves rounds from before the clock out", () => {
    const rounds = [
      found(90_000),
      found(30_000),
      found(),
      { answer: first.id, guesses: [second.id], gaveUp: true, time: 5_000 },
    ];
    expect(fastestTime(rounds)).toBe(30_000);
    expect(averageTime(rounds)).toBe(60_000);
    expect(fastestTime([found()])).toBeNull();
    expect(averageTime([])).toBeNull();
  });

  it("shows a round's time, or nothing for an untimed one", () => {
    expect(roundTime(found(48_000))).toBe("0:48");
    expect(roundTime(found())).toBe("");
  });
});
