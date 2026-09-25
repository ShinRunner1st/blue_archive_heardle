import React, { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createHarness } from "../../test/harness";

import { VOLUME_KEY } from "../../constants/game";
import { VolumeControl } from "./index";

let harness: ReturnType<typeof createHarness>;

function slider() {
  return harness.container.querySelector<HTMLInputElement>(
    'input[type="range"]'
  );
}

function muteButton() {
  return harness.container.querySelector("button");
}

/** Moves the slider the way a drag does, through React's change handling. */
function drag(to: number) {
  act(() => {
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value"
    )!.set!.call(slider(), String(to));
    slider()!.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

beforeEach(() => {
  harness = createHarness();
});

afterEach(() => {
  harness.destroy();
});

describe("VolumeControl", () => {
  it("starts a new player at 20%", () => {
    harness.render(React.createElement(VolumeControl));

    expect(slider()?.value).toBe("20");
    expect(slider()?.getAttribute("aria-valuetext")).toBe("20%");
  });

  it("shows a returning player the level they chose", () => {
    localStorage.setItem(VOLUME_KEY, "0.75");
    harness.render(React.createElement(VolumeControl));

    expect(slider()?.value).toBe("75");
  });

  it("saves the level as the slider moves", () => {
    harness.render(React.createElement(VolumeControl));

    drag(60);

    expect(slider()?.value).toBe("60");
    expect(localStorage.getItem(VOLUME_KEY)).toBe("0.6");
  });

  it("shows the level as a percentage beside the slider", () => {
    harness.render(React.createElement(VolumeControl));
    expect(harness.container.textContent).toContain("20%");

    drag(85);
    expect(harness.container.textContent).toContain("85%");

    act(() => muteButton()!.click());
    expect(harness.container.textContent).toContain("0%");
  });

  it("mutes and unmutes back to where it was", () => {
    harness.render(React.createElement(VolumeControl));
    drag(40);

    act(() => muteButton()!.click());
    expect(slider()?.value).toBe("0");
    expect(muteButton()?.getAttribute("aria-label")).toBe("Unmute");

    act(() => muteButton()!.click());
    expect(slider()?.value).toBe("40");
    expect(muteButton()?.getAttribute("aria-label")).toBe("Mute");
  });

  it("is left out where the browser ignores it, as on iOS", () => {
    vi.spyOn(HTMLMediaElement.prototype, "volume", "get").mockReturnValue(1);
    harness.render(React.createElement(VolumeControl));

    expect(harness.container.innerHTML).toBe("");
  });
});
