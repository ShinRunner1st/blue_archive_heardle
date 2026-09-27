import React, { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { StatsPopUp } from "./index";
import { createHarness } from "../../test/harness";
import { GameMode } from "../../types/mode";
import { StatsTally } from "../../types/stats";

let harness: ReturnType<typeof createHarness>;
const onClose = vi.fn();

const stats: StatsTally = [1, 4, 2, 0, 0, 0, 0, 7];
const streaks = { current: 3, max: 9 };
const dailyResults = new Map([
  [1, { won: true as const, tries: 1 }],
  [2, { won: true as const, tries: 4 }],
  [3, { won: false as const }],
  [5, { won: true as const, tries: 6 }],
]);

function mount(mode: GameMode = "endless") {
  harness.render(
    React.createElement(StatsPopUp, {
      onClose,
      score: "4/7",
      stats,
      mode,
      streaks,
      dailyResults,
    })
  );
}

beforeEach(() => {
  vi.useFakeTimers();
  harness = createHarness();
});

afterEach(() => {
  harness.destroy();
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("StatsPopUp", () => {
  it("shows the score and the song total", () => {
    mount();

    expect(harness.container.textContent).toContain("4/7");
    expect(harness.container.textContent).toContain("Total OST");
  });

  it("renders a row for every try plus the loss row", () => {
    mount();

    // 1-6 plus X.
    const labels = ["1", "2", "3", "4", "5", "6", "X"];
    labels.forEach((label) => {
      expect(harness.container.textContent).toContain(label);
    });
  });

  it("says which mode's history it is showing", () => {
    mount("endless");
    expect(harness.container.textContent).toContain("endless round");

    mount("daily");
    expect(harness.container.textContent).toContain("daily puzzle");
  });

  it("swaps the song total for streaks in daily mode", () => {
    mount("daily");

    expect(harness.container.textContent).toContain("Streak");
    expect(harness.container.textContent).toContain("Best");
    expect(harness.container.textContent).not.toContain("Total OST");
  });

  it("closes when the close button is pressed", () => {
    mount();

    const close = Array.from(harness.container.querySelectorAll("button")).find(
      (b) => b.textContent === "Close"
    );

    act(() => {
      close?.click();
    });
    expect(onClose).toHaveBeenCalled();
  });
});

describe("StatsPopUp calendar", () => {
  const text = () => harness.container.textContent ?? "";
  const button = (label: string) =>
    harness.container.querySelector<HTMLButtonElement>(
      `button[aria-label="${label}"]`
    )!;

  beforeEach(() => {
    // Puzzle #6.
    vi.setSystemTime(new Date(2026, 9, 2, 12));
  });

  it("isn't in endless stats", () => {
    mount("endless");
    expect(text()).not.toContain("Calendar");
  });

  it("opens on this month and says how each day went", () => {
    mount("daily");

    expect(text()).toContain("October 2026");
    expect(text()).toContain("1 October, puzzle #5: won in 6 tries");
    expect(text()).toContain("2 October, puzzle #6: not finished yet");
    expect(button("Next month").disabled).toBe(true);
  });

  it("goes back to earlier months, as far as the first puzzle", () => {
    mount("daily");
    act(() => button("Previous month").click());

    expect(text()).toContain("September 2026");
    expect(text()).toContain("27 September, puzzle #1: won in 1 try");
    expect(text()).toContain("28 September, puzzle #2: won in 4 tries");
    expect(text()).toContain("29 September, puzzle #3: lost");
    expect(text()).toContain("30 September, puzzle #4: not played");
    expect(text()).not.toContain("puzzle #0");
    expect(button("Previous month").disabled).toBe(true);
  });
});
