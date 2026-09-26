import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { BadgesPopUp } from "./index";
import { createHarness } from "../../test/harness";
import { VOLUMES } from "../../constants/volumes";
import { badgeProgress } from "../../helpers/badges";

let harness: ReturnType<typeof createHarness>;
const onClose = vi.fn();

function mount(guessed: string[]) {
  harness.render(
    React.createElement(BadgesPopUp, {
      onClose,
      badges: badgeProgress(new Set(guessed)),
    })
  );
}

const badge = (n: number) =>
  [...harness.container.querySelectorAll("li")].find((el) =>
    el.getAttribute("aria-label")?.startsWith(`Original Soundtrack Vol.${n}:`)
  );

beforeEach(() => {
  harness = createHarness();
});

afterEach(() => {
  harness.destroy();
  vi.clearAllMocks();
});

describe("BadgesPopUp", () => {
  it("shows every album with how far along it is", () => {
    // Vol.2 complete, one song towards Vol.1.
    mount([...VOLUMES[1].songs, "1"]);

    // Vol.1: theme 1, plus Water Drop (39), which is on Vol.2 as well.
    expect(badge(1)?.textContent).toContain("2 / 39");
    expect(badge(2)?.textContent).toContain("Earned");
    expect(badge(8)?.textContent).toContain("0 / 28");
    expect(badge(3)?.textContent).toContain("Reaching for the precious time");
  });

  it("counts the badges earned", () => {
    mount([...VOLUMES[1].songs]);

    expect(harness.container.textContent).toContain("1 of 8 earned");
  });

  it("congratulates a full shelf", () => {
    mount(VOLUMES.flatMap((volume) => volume.songs));

    expect(harness.container.textContent).toContain("Every album complete");
  });
});
