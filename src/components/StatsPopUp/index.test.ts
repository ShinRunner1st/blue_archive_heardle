import React, { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { StatsPopUp } from "./index";
import { createHarness } from "../../test/harness";
import { GameMode } from "../../types/mode";
import { StatsTally } from "../../types/stats";
import { VOLUMES } from "../../constants/volumes";
import { badgeProgress } from "../../helpers/badges";

let harness: ReturnType<typeof createHarness>;
const onClose = vi.fn();

const stats: StatsTally = [1, 4, 2, 0, 0, 0, 0, 7];
const streaks = { current: 3, max: 9 };
// Vol.2 complete, one song towards Vol.1.
const badges = badgeProgress(new Set([...VOLUMES[1].songs, "1"]));

function mount(mode: GameMode = "endless") {
  harness.render(
    React.createElement(StatsPopUp, {
      onClose,
      score: "4/7",
      stats,
      mode,
      streaks,
      badges,
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

describe("OST badges", () => {
  it("shows every album with how far along it is", () => {
    mount();

    const badge = (n: number) =>
      [...harness.container.querySelectorAll("[title]")].find((el) =>
        el.getAttribute("title")?.startsWith(`Original Soundtrack Vol.${n} `)
      );
    // Vol.1: theme 1, plus Water Drop (39), which is on Vol.2 as well.
    expect(badge(1)?.textContent).toContain("2/39");
    expect(badge(2)?.textContent).toContain("✓");
    expect(badge(8)?.textContent).toContain("0/28");
  });
});
