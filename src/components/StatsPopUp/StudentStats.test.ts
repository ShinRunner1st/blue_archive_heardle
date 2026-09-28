import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createHarness } from "../../test/harness";

import { StudentStats } from "./StudentStats";

let harness: ReturnType<typeof createHarness>;

function mount(extra: Partial<React.ComponentProps<typeof StudentStats>> = {}) {
  const tally = Array.from({ length: 11 }, () => 0);
  tally[0] = 1;
  tally[3] = 2;
  tally[10] = 1;
  harness.render(
    React.createElement(StudentStats, {
      onClose: vi.fn(),
      game: "lore",
      mode: "endless",
      tally,
      played: 4,
      averageGuesses: 5.5,
      streak: 2,
      best: 3,
      found: 2,
      dailyResults: new Map(),
      ...extra,
    })
  );
}

const text = () => document.body.textContent ?? "";

beforeEach(() => {
  harness = createHarness();
});

afterEach(() => {
  harness.destroy();
});

describe("StudentStats", () => {
  it("sums up the way to play and mode on screen", () => {
    mount();
    expect(text()).toContain("Across 4 finished Lore rounds.");
    expect(text()).toContain("75%");
    expect(text()).toContain("5.5");
    expect(text()).toContain("10+");
    expect(text()).not.toContain("Calendar");
  });

  it("has a calendar in daily, counted in guesses", () => {
    mount({
      mode: "daily",
      game: "gameplay",
      played: 0,
      tally: Array(11).fill(0),
    });
    expect(text()).toContain(
      "Finish today's Gameplay daily puzzle and your history shows up here."
    );
    expect(text()).toContain("Calendar");
    expect(text()).toContain("1-3 guesses");
    expect(text()).toContain("7+");
  });
});
