import { beforeEach, describe, expect, it } from "vitest";

import { songs } from "../constants";
import { TIME_ATTACK_SETTINGS_KEY } from "../constants/game";
import { Round } from "../types/stats";
import {
  answerRound,
  dealRound,
  DEFAULT_SETTINGS,
  formatClock,
  loadSettings,
  runClock,
  runsOf,
  saveSettings,
  TIME_ATTACK_MS,
  timeAttackShareText,
  timeAttackStats,
  timeLeft,
} from "./timeAttack";

beforeEach(() => {
  localStorage.clear();
});

/** A run's answered song: right or not, typed or picked from four. */
function answered(run: number, right: boolean, choice = false): Round {
  const round = dealRound(
    { clip: 2, randomStart: false, answers: choice ? "choice" : "typed" },
    run,
    []
  );
  return answerRound(round, right ? round.solution : null);
}

describe("time attack settings", () => {
  it("start from the defaults, and are remembered", () => {
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);

    saveSettings({ clip: 5, randomStart: true, answers: "typed" });

    expect(loadSettings()).toEqual({
      clip: 5,
      randomStart: true,
      answers: "typed",
    });
  });

  it("fall back one by one on values that don't belong", () => {
    localStorage.setItem(
      TIME_ATTACK_SETTINGS_KEY,
      JSON.stringify({ clip: 4, randomStart: "yes", answers: "typed" })
    );

    expect(loadSettings()).toEqual({ ...DEFAULT_SETTINGS, answers: "typed" });
  });

  it("survive a save that isn't JSON", () => {
    localStorage.setItem(TIME_ATTACK_SETTINGS_KEY, "{oops");

    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
  });
});

describe("dealRound", () => {
  it("deals one try with the clip length picked, tagged with its run", () => {
    const round = dealRound(
      { clip: 4, randomStart: false, answers: "typed" },
      123,
      []
    );

    expect(round.tries).toBe(1);
    expect(round.clip).toBe(4);
    expect(round.run).toBe(123);
    expect(round.startTime).toBe(0);
    expect(round.choices).toBeUndefined();
  });

  it("keeps a random start inside the 16-second clip", () => {
    const settings = { clip: 7, randomStart: true, answers: "typed" as const };

    for (const draw of [0, 0.5, 0.9999]) {
      const { startTime } = dealRound(settings, 1, [], () => draw);
      expect(startTime).toBeGreaterThanOrEqual(0);
      expect(startTime! + 7).toBeLessThanOrEqual(16);
    }
    expect(dealRound(settings, 1, [], () => 0.5).startTime).toBe(4.5);
  });

  it("offers four answers when the run picks from four", () => {
    const round = dealRound({ ...DEFAULT_SETTINGS, answers: "choice" }, 1, []);

    expect(round.choices).toHaveLength(4);
    expect(round.choices).toContain(round.solution.themeNo);
  });

  it("doesn't repeat a song already played", () => {
    const played = songs.slice(1).map((song) => ({
      ...answered(1, true),
      solution: song,
    }));

    expect(dealRound(DEFAULT_SETTINGS, 1, played).solution).toEqual(songs[0]);
  });
});

describe("answerRound", () => {
  it("marks a right answer, a wrong one, and a pass", () => {
    const round = dealRound(DEFAULT_SETTINGS, 1, []);
    const other = songs.find(
      (song) => song.themeNo !== round.solution.themeNo
    )!;

    expect(answerRound(round, round.solution).didGuess).toBe(true);
    expect(answerRound(round, other).didGuess).toBe(false);

    const passed = answerRound(round, null);
    expect(passed.didGuess).toBe(false);
    expect(passed.currentTry).toBe(1);
    expect(passed.guesses[0].skipped).toBe(true);
  });
});

describe("the clock", () => {
  it("spends time only while it runs", () => {
    let clock = { spent: 0, since: null as number | null };
    expect(timeLeft(clock, 5000)).toBe(TIME_ATTACK_MS);

    clock = runClock(clock, true, 1000);
    expect(timeLeft(clock, 11_000)).toBe(TIME_ATTACK_MS - 10_000);

    // Stopped while the next song loads.
    clock = runClock(clock, false, 11_000);
    expect(timeLeft(clock, 99_000)).toBe(TIME_ATTACK_MS - 10_000);

    clock = runClock(clock, true, 99_000);
    expect(timeLeft(clock, 100_000)).toBe(TIME_ATTACK_MS - 11_000);
  });

  it("never goes below zero", () => {
    const clock = { spent: 0, since: 0 };

    expect(timeLeft(clock, TIME_ATTACK_MS * 2)).toBe(0);
  });

  it("leaves a clock already in the state asked for alone", () => {
    const clock = { spent: 5, since: null };

    expect(runClock(clock, false, 100)).toBe(clock);
  });

  it("reads as minutes and seconds, rounded up", () => {
    expect(formatClock(TIME_ATTACK_MS)).toBe("3:00");
    expect(formatClock(61_001)).toBe("1:02");
    expect(formatClock(400)).toBe("0:01");
    expect(formatClock(0)).toBe("0:00");
  });
});

describe("runs and their stats", () => {
  const rounds = [
    answered(1, true),
    answered(1, false),
    answered(1, true),
    answered(2, true, true),
    answered(2, true, true),
    answered(2, true, true),
  ];

  it("groups the saved songs into runs", () => {
    expect(runsOf(rounds)).toEqual([
      { id: 1, score: 2, answered: 3, answers: "typed", clip: 2 },
      { id: 2, score: 3, answered: 3, answers: "choice", clip: 2 },
    ]);
  });

  it("keeps the best score for each way of answering", () => {
    const stats = timeAttackStats(rounds);

    expect(stats.runs).toBe(2);
    expect(stats.best).toEqual({ typed: 2, choice: 3 });
    expect(stats.right).toBe(5);
    expect(stats.answered).toBe(6);
    expect(stats.last?.id).toBe(2);
  });

  it("starts at nothing", () => {
    expect(timeAttackStats([])).toEqual({
      runs: 0,
      best: { typed: 0, choice: 0 },
      right: 0,
      answered: 0,
      last: null,
    });
  });
});

describe("timeAttackShareText", () => {
  it("gives the score and settings, one square a song, and no names", () => {
    const run = [answered(1, true), answered(1, false), answered(1, true)];
    const text = timeAttackShareText(run, {
      clip: 1,
      randomStart: true,
      answers: "typed",
    });

    expect(text.split("\n")).toEqual([
      "Blue Archive Heardle ⏱ Time Attack",
      "2 right in 3:00 · Typed · 1s clips · random start",
      "🟩🟥🟩",
      "https://baheardle.com/",
    ]);
    for (const round of run) {
      expect(text).not.toContain(round.solution.name);
    }
  });

  it("keeps a long run's squares to one line", () => {
    const run = Array.from({ length: 40 }, () => answered(1, true));
    const squares = timeAttackShareText(run, DEFAULT_SETTINGS).split("\n")[2];

    expect(squares).toBe(`${"🟩".repeat(30)}…`);
  });
});
