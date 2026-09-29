import React, { act } from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createHarness } from "../test/harness";

import { dayNumber } from "../helpers/daily";
import { loadVoiceRounds, saveVoiceRounds } from "../helpers/storage";
import { dailyVoice, voicePool } from "../helpers/voiceRounds";
import { SKIPPED, VoiceRoundMode } from "../types/voice";
import { useVoiceGame, VoiceGameState } from "./useVoiceGame";

let harness: ReturnType<typeof createHarness>;
let game: VoiceGameState;

function Probe({ mode }: { mode: VoiceRoundMode }) {
  game = useVoiceGame(mode);
  return null;
}

function render(mode: VoiceRoundMode = "endless") {
  harness.render(React.createElement(Probe, { mode }));
}

/** Students who aren't the answer. */
function wrongIds(count: number): number[] {
  return voicePool()
    .filter(({ id }) => id !== game.round.answer)
    .slice(0, count)
    .map(({ id }) => id);
}

beforeEach(() => {
  localStorage.clear();
  harness = createHarness();
});

afterEach(() => {
  harness.destroy();
});

describe("useVoiceGame", () => {
  it("deals a round and saves it", () => {
    render();
    expect(game.round.guesses).toEqual([]);
    expect(game.round.choices).toBeUndefined();
    expect(loadVoiceRounds("endless")).toHaveLength(1);
  });

  it("takes each student once, skips as often as the tries allow", () => {
    render();
    const [wrong] = wrongIds(1);

    act(() => game.guess(wrong));
    act(() => game.guess(wrong));
    act(() => game.skip());
    expect(game.round.guesses).toEqual([wrong, SKIPPED]);

    act(() => game.guess(game.round.answer));
    expect(game.wins).toBe(1);
    expect(game.tally).toEqual([0, 0, 0, 1, 0]);
    expect(game.streak.current).toBe(1);

    // Over: nothing more counts.
    act(() => game.skip());
    expect(game.round.guesses).toHaveLength(3);
  });

  it("ends the round as a loss after four misses", () => {
    render();
    for (const id of wrongIds(4)) act(() => game.guess(id));
    expect(game.tally[0]).toBe(1);
    expect(game.streak.current).toBe(0);

    act(() => game.next());
    expect(game.round.guesses).toEqual([]);
    expect(game.rounds).toHaveLength(2);
  });

  it("gives 4-Choice four answers and one pick, and no skips", () => {
    render("choice");
    expect(game.round.choices).toHaveLength(4);

    act(() => game.skip());
    expect(game.round.guesses).toEqual([]);

    const wrong = game.round.choices!.find((id) => id !== game.round.answer)!;
    act(() => game.guess(wrong));
    expect(game.tally).toEqual([1, 0]);
  });

  it("keeps each mode apart", () => {
    render("nohint");
    act(() => game.guess(game.round.answer));
    expect(loadVoiceRounds("nohint")).toHaveLength(1);

    render("endless");
    expect(game.played).toBe(0);
  });

  it("plays today's line in daily, which can't be swapped or skipped past", () => {
    render("daily");
    const today = dailyVoice(dayNumber());
    expect(game.round).toEqual({ ...today, guesses: [], day: dayNumber() });

    act(() => game.replaceCurrent());
    act(() => game.next());
    expect(game.rounds).toHaveLength(1);
    expect(game.round.answer).toBe(today.answer);
  });

  it("swaps a line that won't play in the bag modes, counting nothing", () => {
    render();
    const before = game.round;
    act(() => game.replaceCurrent());
    expect(game.rounds).toHaveLength(1);
    expect(game.round).not.toBe(before);
    expect(game.played).toBe(0);
  });

  it("resumes the round left open, and resets on request", () => {
    const open = { answer: voicePool()[3].id, line: 0, guesses: [SKIPPED] };
    saveVoiceRounds("endless", [open]);
    render();
    expect(game.round).toEqual(open);

    act(() => game.guess(open.answer));
    expect(game.hasHistory).toBe(true);
    act(() => game.reset());
    expect(game.hasHistory).toBe(false);
    expect(game.rounds).toHaveLength(1);
  });
});
