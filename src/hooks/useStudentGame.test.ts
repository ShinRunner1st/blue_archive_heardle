import React, { act } from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createHarness } from "../test/harness";

import { dayNumber } from "../helpers/daily";
import { loadStudentRounds, saveStudentRounds } from "../helpers/storage";
import { dailyAnswer, poolOf } from "../helpers/studentRounds";
import { StudentGame, StudentMode } from "../types/student";
import { useStudentGame } from "./useStudentGame";

type Game = ReturnType<typeof useStudentGame>;

let harness: ReturnType<typeof createHarness>;
let game: Game;

function Probe({ kind, mode }: { kind: StudentGame; mode: StudentMode }) {
  game = useStudentGame(kind, mode);
  return null;
}

function render(kind: StudentGame = "gameplay", mode: StudentMode = "endless") {
  harness.render(React.createElement(Probe, { kind, mode }));
}

/** A student who isn't the answer. */
function wrongId(): number {
  const wrong = poolOf("gameplay").find(({ id }) => id !== game.round.answer);
  if (!wrong) throw new Error("the table needs two students");
  return wrong.id;
}

beforeEach(() => {
  localStorage.clear();
  harness = createHarness();
});

afterEach(() => {
  harness.destroy();
});

describe("useStudentGame", () => {
  it("deals a round and saves it", () => {
    render();

    expect(game.round.guesses).toEqual([]);
    expect(loadStudentRounds("gameplay-endless")).toHaveLength(1);
  });

  it("records guesses once each, and ends on the answer", () => {
    render();
    const wrong = wrongId();

    act(() => game.guess(wrong));
    act(() => game.guess(wrong));
    expect(game.round.guesses).toEqual([wrong]);

    act(() => game.guess(game.round.answer));
    expect(game.wins).toBe(1);
    expect(game.streak.current).toBe(1);

    // Over: nothing more counts.
    act(() => game.guess(wrongId()));
    expect(game.round.guesses).toHaveLength(2);
    expect(game.tally[2]).toBe(1);
  });

  it("ignores an id that isn't a student", () => {
    render();
    act(() => game.guess(1));
    expect(game.round.guesses).toEqual([]);
  });

  it("gives up as a loss and deals the next", () => {
    render();
    const first = game.round.answer;

    act(() => game.giveUp());
    expect(game.tally[0]).toBe(1);
    expect(game.streak.current).toBe(0);

    act(() => game.next());
    expect(game.round.answer).not.toBe(first);
    expect(game.rounds).toHaveLength(2);
  });

  it("deals today's puzzle in daily, the same for everyone", () => {
    render("lore", "daily");

    expect(game.round.day).toBe(dayNumber());
    expect(game.round.answer).toBe(dailyAnswer("lore", dayNumber()));

    // No next student in daily.
    act(() => game.next());
    expect(game.rounds).toHaveLength(1);
  });

  it("keeps each way to play and mode apart", () => {
    render("gameplay", "endless");
    act(() => game.guess(wrongId()));

    render("lore", "endless");
    expect(game.round.guesses).toEqual([]);

    render("gameplay", "endless");
    expect(game.round.guesses).toHaveLength(1);
  });

  it("resumes a round left open, and resets", () => {
    const [a, b] = poolOf("gameplay");
    saveStudentRounds("gameplay-endless", [{ answer: a.id, guesses: [b.id] }]);
    render();

    expect(game.round).toEqual({ answer: a.id, guesses: [b.id] });

    act(() => game.reset());
    expect(game.rounds).toHaveLength(1);
    expect(game.round.guesses).toEqual([]);
    expect(game.hasHistory).toBe(false);
  });

  it("counts the daily streak by day", () => {
    const today = dayNumber();
    const answer = dailyAnswer("gameplay", today - 1);
    saveStudentRounds("gameplay-daily", [
      { answer, guesses: [answer], day: today - 1 },
    ]);
    render("gameplay", "daily");

    expect(game.streak.current).toBe(1);
    act(() => game.guess(game.round.answer));
    expect(game.streak.current).toBe(2);
    expect(game.best).toBe(2);
    expect(game.dailyResults.get(today)).toEqual({ won: true, tries: 1 });
  });
});
