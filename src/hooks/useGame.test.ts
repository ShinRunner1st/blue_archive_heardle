import React, { act } from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createHarness } from "../test/harness";

import { MAX_TRIES, STORAGE_KEY } from "../constants/game";
import { songs } from "../constants";
import { dailySong, dayNumber } from "../helpers/daily";
import { loadRounds } from "../helpers/storage";
import { GameMode } from "../types/mode";
import { useGame } from "./useGame";

type Game = ReturnType<typeof useGame>;

let harness: ReturnType<typeof createHarness>;
let game: Game;

function Probe({ mode }: { mode: GameMode }) {
  game = useGame(mode);
  return null;
}

function render(mode: GameMode = "endless") {
  harness.render(React.createElement(Probe, { mode }));
}

/** Picks any song that is not the current answer. */
function aWrongSong() {
  const wrong = songs.find((song) => song.themeNo !== game.solution.themeNo);
  if (!wrong) throw new Error("song list needs at least two entries");
  return wrong;
}

beforeEach(() => {
  localStorage.clear();
  harness = createHarness();
});

afterEach(() => {
  harness.destroy();
});

describe("useGame", () => {
  it("opens a fresh round and persists it", () => {
    render();

    expect(game.currentTry).toBe(0);
    expect(game.didGuess).toBe(false);
    expect(game.guesses).toHaveLength(MAX_TRIES);
    expect(loadRounds()).toHaveLength(1);
  });

  it("records a wrong guess and advances the try counter", () => {
    render();
    const wrong = aWrongSong();

    act(() => game.guess(wrong));

    expect(game.currentTry).toBe(1);
    expect(game.didGuess).toBe(false);
    expect(game.guesses[0].song).toEqual(wrong);
    expect(game.guesses[0].isCorrect).toBe(false);
  });

  it("wins on a matching theme number rather than object identity", () => {
    render();
    // A structurally equal copy must still count as correct.
    const copy = { ...game.solution };

    act(() => game.guess(copy));

    expect(game.didGuess).toBe(true);
    expect(game.currentTry).toBe(1);
    expect(game.score).toBe("1/1");
    expect(game.stats[1]).toBe(1);
  });

  it("records a skip without a song", () => {
    render();

    act(() => game.skip());

    expect(game.currentTry).toBe(1);
    expect(game.guesses[0].skipped).toBe(true);
    expect(game.guesses[0].song).toBeUndefined();
  });

  it("loses the round after six wrong guesses and ignores further input", () => {
    render();
    const wrong = aWrongSong();

    for (let i = 0; i < MAX_TRIES; i += 1) {
      act(() => game.guess(wrong));
    }

    expect(game.currentTry).toBe(MAX_TRIES);
    expect(game.didGuess).toBe(false);
    expect(game.score).toBe("0/1");

    // A finished round must not accept a seventh guess.
    act(() => game.guess(wrong));
    expect(game.currentTry).toBe(MAX_TRIES);
  });

  it("moves to a different song without repeating the last one", () => {
    render();
    const first = game.solution;

    act(() => game.guess({ ...first }));
    act(() => game.nextSong());

    expect(game.solution.themeNo).not.toBe(first.themeNo);
    expect(game.currentTry).toBe(0);
    expect(game.didGuess).toBe(false);
    expect(game.guesses.every((slot) => slot.song === undefined)).toBe(true);
    expect(loadRounds()).toHaveLength(2);
  });

  it("keeps the running score across rounds", () => {
    render();

    act(() => game.guess({ ...game.solution }));
    act(() => game.nextSong());
    for (let i = 0; i < MAX_TRIES; i += 1) {
      act(() => game.guess(aWrongSong()));
    }

    expect(game.score).toBe("1/2");
  });

  it("resumes an unfinished round after a reload", () => {
    render();
    const solution = game.solution;
    act(() => game.skip());
    act(() => game.setStartTime(42));

    // Re-mount, as a page reload would.
    harness.unmount();
    render();

    expect(game.solution.themeNo).toBe(solution.themeNo);
    expect(game.currentTry).toBe(1);
    expect(game.startTime).toBe(42);
    expect(game.guesses[0].skipped).toBe(true);
  });

  it("starts a new round when the stored one was already finished", () => {
    render();
    act(() => game.guess({ ...game.solution }));

    harness.unmount();
    render();

    expect(game.currentTry).toBe(0);
    expect(game.didGuess).toBe(false);
    expect(game.score).toBe("1/1");
  });

  it("recovers from corrupted storage instead of throwing", () => {
    localStorage.setItem(STORAGE_KEY, "not json at all");

    expect(() => render()).not.toThrow();
    expect(game.currentTry).toBe(0);
  });

  it("clears history on reset", () => {
    render();
    act(() => game.guess({ ...game.solution }));
    act(() => game.nextSong());

    act(() => game.resetScore());

    expect(game.score).toBe("0/0");
    expect(game.hasHistory).toBe(false);
    expect(loadRounds()).toHaveLength(1);
  });
});

describe("useGame in daily mode", () => {
  it("opens today's puzzle and stamps it with the day number", () => {
    render("daily");

    const today = dayNumber();
    expect(game.day).toBe(today);
    expect(game.solution).toEqual(dailySong(today));
    expect(loadRounds("daily")).toHaveLength(1);
  });

  it("gives every player the same song for a given day", () => {
    // The daily order is a fixed permutation, so a day maps to one song for
    // everyone, forever - that is the whole point of the mode.
    expect(dailySong(1)).toEqual(dailySong(1));
    expect(dailySong(1)).not.toEqual(dailySong(2));
  });

  it("shows the finished puzzle again instead of dealing another song", () => {
    render("daily");
    const solution = game.solution;
    act(() => game.guess({ ...solution }));

    harness.unmount();
    render("daily");

    expect(game.solution.themeNo).toBe(solution.themeNo);
    expect(game.didGuess).toBe(true);
    expect(loadRounds("daily")).toHaveLength(1);
  });

  it("has no next song to move to", () => {
    render("daily");
    const solution = game.solution;

    act(() => game.nextSong());

    expect(game.solution.themeNo).toBe(solution.themeNo);
    expect(loadRounds("daily")).toHaveLength(1);
  });

  it("counts a win towards the streak", () => {
    render("daily");
    act(() => game.guess({ ...game.solution }));

    expect(game.streaks.current).toBe(1);
    expect(game.streaks.max).toBe(1);
  });

  it("keeps its history separate from endless", () => {
    render("endless");
    act(() => game.guess({ ...game.solution }));
    act(() => game.nextSong());

    harness.unmount();
    render("daily");

    // The endless run is three rounds in; daily has only today's.
    expect(game.score).toBe("0/0");
    expect(loadRounds("daily")).toHaveLength(1);
    expect(loadRounds("endless")).toHaveLength(2);
  });
});
