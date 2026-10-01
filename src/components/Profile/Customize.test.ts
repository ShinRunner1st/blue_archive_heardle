import React, { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  FAV_STUDENT_KEY,
  PLAYER_NAME_KEY,
  SENSEI_TITLE_KEY,
} from "../../constants/game";
import { resetPlayerNameState } from "../../helpers/playerName";
import { createHarness } from "../../test/harness";

import { CustomizePopUp } from "./Customize";

let harness: ReturnType<typeof createHarness>;
const onClose = vi.fn();

const button = (label: string) =>
  [...harness.container.querySelectorAll<HTMLButtonElement>("button")].find(
    (each) => each.textContent?.trim() === label
  )!;

const titleSwitch = () =>
  [
    ...harness.container.querySelectorAll<HTMLButtonElement>('[role="switch"]'),
  ].find((each) => each.textContent?.includes("after my name"))!;

const type = (input: HTMLInputElement, value: string) =>
  act(() => {
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value"
    )!.set!.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });

describe("CustomizePopUp", () => {
  beforeEach(() => {
    resetPlayerNameState();
    onClose.mockClear();
    harness = createHarness();
    harness.render(React.createElement(CustomizePopUp, { onClose }));
  });

  afterEach(() => {
    harness.destroy();
    resetPlayerNameState();
  });

  it("keeps the name and the Sensei after it once saved", () => {
    const name = harness.container.querySelector<HTMLInputElement>(
      'input[name="player-name"]'
    )!;
    type(name, "Hoshino");
    expect(titleSwitch().textContent).toContain("Hoshino Sensei");
    act(() => titleSwitch().click());
    expect(titleSwitch().getAttribute("aria-checked")).toBe("false");

    // Nothing is kept until Save.
    expect(localStorage.getItem(PLAYER_NAME_KEY)).toBeNull();
    act(() => button("Save").click());

    expect(localStorage.getItem(PLAYER_NAME_KEY)).toBe("Hoshino");
    expect(localStorage.getItem(SENSEI_TITLE_KEY)).toBe("false");
    expect(onClose).toHaveBeenCalled();
  });

  it("keeps nothing on Cancel", () => {
    const name = harness.container.querySelector<HTMLInputElement>(
      'input[name="player-name"]'
    )!;
    type(name, "Hoshino");
    act(() => button("Cancel").click());
    expect(localStorage.getItem(PLAYER_NAME_KEY)).toBeNull();
  });

  it("removes the picture, back to the name's letter", () => {
    harness.destroy();
    resetPlayerNameState();
    localStorage.setItem(FAV_STUDENT_KEY, "10000");
    harness = createHarness();
    harness.render(React.createElement(CustomizePopUp, { onClose }));

    act(() => button("Remove").click());
    expect(harness.container.textContent).toContain("Your name's first letter");
    act(() => button("Save").click());
    expect(localStorage.getItem(FAV_STUDENT_KEY)).toBeNull();
  });
});
