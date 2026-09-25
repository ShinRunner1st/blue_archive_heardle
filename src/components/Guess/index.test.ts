import React from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createHarness } from "../../test/harness";

import { Guess } from "./index";
import { theme } from "../../constants";
import { GuessType } from "../../types/guess";
import { Song } from "../../types/song";

const solution: Song = {
  artist: "Mitsukiyo",
  name: "Constant Moderato",
  themeNo: "50",
};

function song(themeNo: string, name = "Some Track"): Song {
  return { artist: "KARUT", name, themeNo };
}

let harness: ReturnType<typeof createHarness>;
let container: HTMLDivElement;

function mount(guess: GuessType, active = false) {
  harness.render(React.createElement(Guess, { guess, active, solution }));
}

function row() {
  return container.firstElementChild as HTMLElement;
}

/** jsdom reports computed colours as rgb(), so compare in that form. */
function rgb(hex: string): string {
  const value = parseInt(hex.slice(1), 16);
  return `rgb(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255})`;
}

function borderColor(): string {
  return getComputedStyle(row()).borderColor;
}

const empty: GuessType = {
  song: undefined,
  skipped: false,
  isCorrect: undefined,
};

beforeEach(() => {
  harness = createHarness();
  container = harness.container;
});

afterEach(() => {
  harness.destroy();
});

describe("Guess", () => {
  it("renders nothing for an untouched slot", () => {
    mount(empty);

    expect(row().textContent).toBe("");
  });

  it("renders Skipped for a skipped try", () => {
    mount({ ...empty, skipped: true });

    expect(row().textContent).toContain("Skipped");
  });

  it("shows the guessed song and its theme number", () => {
    mount({ song: song("40", "Funky Road"), skipped: false, isCorrect: false });

    expect(row().textContent).toContain("KARUT - Funky Road");
    expect(row().textContent).toContain("Theme 40");
    expect(row().textContent).not.toContain("[");
  });

  it("points down when the guess is above the answer", () => {
    // Guessed 60, answer is 50.
    mount({ song: song("60"), skipped: false, isCorrect: false });

    expect(row().textContent).toContain("↓");
    expect(row().textContent).not.toContain("↑");
  });

  it("points up when the guess is below the answer", () => {
    mount({ song: song("40"), skipped: false, isCorrect: false });

    expect(row().textContent).toContain("↑");
    expect(row().textContent).not.toContain("↓");
  });

  it("shows no arrow on an exact match", () => {
    mount({ song: { ...solution }, skipped: false, isCorrect: true });

    expect(row().textContent).not.toContain("↑");
    expect(row().textContent).not.toContain("↓");
  });

  it("turns green for a correct guess", () => {
    mount({ song: { ...solution }, skipped: false, isCorrect: true });

    expect(borderColor()).toBe(rgb(theme.green));
  });

  it("turns orange for a near miss and red for a distant one", () => {
    mount({ song: song("45"), skipped: false, isCorrect: false });
    expect(borderColor()).toBe(rgb(theme.orange));

    mount({ song: song("200"), skipped: false, isCorrect: false });
    expect(borderColor()).toBe(rgb(theme.red));
  });

  it("highlights the active row", () => {
    mount(empty, true);

    expect(borderColor()).toBe(rgb(theme.border));
  });

  it("does not crash on a non-numeric theme number", () => {
    expect(() =>
      mount({ song: song("n/a"), skipped: false, isCorrect: false })
    ).not.toThrow();
  });
});
