import React, { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CHARACTER_KEY, CUSTOM_CURSOR_KEY } from "../../constants/game";
import { createHarness } from "../../test/harness";

import { SettingsPopUp } from "./index";

// jsdom has no canvas, so the effects themselves are stubbed out.
vi.mock("../../helpers/cursorEffects", () => ({
  startCursorEffects: () => () => {},
}));

let harness: ReturnType<typeof createHarness>;
const onClose = vi.fn();

const cursorSwitch = () =>
  harness.container.querySelector<HTMLButtonElement>('[role="switch"]')!;

describe("SettingsPopUp", () => {
  beforeEach(() => {
    harness = createHarness();
    harness.render(React.createElement(SettingsPopUp, { onClose }));
  });

  afterEach(() => {
    harness.destroy();
  });

  it("shows the Blue Archive cursor as on, with what it does", () => {
    expect(cursorSwitch().getAttribute("aria-checked")).toBe("true");
    expect(cursorSwitch().textContent).toContain("Blue Archive cursor");
    expect(cursorSwitch().textContent).toContain("use your own cursor");
  });

  it("turns the cursor off and back on", async () => {
    act(() => cursorSwitch().click());

    expect(cursorSwitch().getAttribute("aria-checked")).toBe("false");
    expect(localStorage.getItem(CUSTOM_CURSOR_KEY)).toBe("false");
    expect(document.documentElement.dataset.cursor).toBeUndefined();

    act(() => cursorSwitch().click());

    expect(cursorSwitch().getAttribute("aria-checked")).toBe("true");
    expect(document.documentElement.dataset.cursor).toBe("custom");
    await vi.dynamicImportSettled();
  });

  it("picks the character, or none", () => {
    const option = (label: string) =>
      [
        ...harness.container.querySelectorAll<HTMLButtonElement>(
          '[role="radio"]'
        ),
      ].find((radio) => radio.textContent === label)!;

    expect(option("Arona & Plana").getAttribute("aria-checked")).toBe("true");

    act(() => option("Mari").click());
    expect(option("Mari").getAttribute("aria-checked")).toBe("true");
    expect(localStorage.getItem(CHARACTER_KEY)).toBe("mari");

    act(() => option("Off").click());
    expect(localStorage.getItem(CHARACTER_KEY)).toBe("off");
  });
});

describe("SettingsPopUp reset", () => {
  const onReset = vi.fn();
  const text = () => document.body.textContent ?? "";
  const button = (label: string) =>
    Array.from(document.querySelectorAll<HTMLButtonElement>("button")).find(
      (b) => b.textContent === label
    );

  function mount(canReset = true, withTarget = true) {
    harness.render(
      React.createElement(SettingsPopUp, {
        onClose,
        reset: withTarget
          ? { name: "Voice · 4-Choice", canReset, onReset }
          : undefined,
      })
    );
  }

  beforeEach(() => {
    harness = createHarness();
    onReset.mockClear();
  });

  afterEach(() => {
    harness.destroy();
  });

  it("names the game and mode it clears, and asks twice", () => {
    mount();
    expect(text()).toContain(
      "Clears the rounds, stats and streak of Voice · 4-Choice"
    );

    act(() => button("Reset")!.click());
    expect(onReset).not.toHaveBeenCalled();
    expect(text()).toContain("can't be undone");

    act(() => button("Cancel")!.click());
    expect(button("Reset for good")).toBeUndefined();

    act(() => button("Reset")!.click());
    act(() => button("Reset for good")!.click());
    expect(onReset).toHaveBeenCalledTimes(1);
    expect(text()).toContain("Voice · 4-Choice starts over.");
  });

  it("has no button when there is nothing to clear", () => {
    mount(false);

    expect(button("Reset")).toBeUndefined();
    expect(text()).toContain("Nothing to reset here yet.");
  });

  it("leaves the card out on the hub, which has no game on screen", () => {
    mount(true, false);

    expect(text()).not.toContain("Reset stats");
  });
});
