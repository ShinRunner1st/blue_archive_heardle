import React, { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createHarness } from "../../test/harness";

import { Choices } from "./index";

let harness: ReturnType<typeof createHarness>;
const onPick = vi.fn();
const choices = ["3", "1", "4", "2"];

function mount(extra: Partial<React.ComponentProps<typeof Choices>> = {}) {
  harness.render(React.createElement(Choices, { choices, onPick, ...extra }));
}

function buttons() {
  return Array.from(harness.container.querySelectorAll("button"));
}

function press(key: string) {
  act(() => {
    window.dispatchEvent(new KeyboardEvent("keydown", { key }));
  });
}

beforeEach(() => {
  harness = createHarness();
});

afterEach(() => {
  harness.destroy();
  vi.clearAllMocks();
});

describe("Choices", () => {
  it("shows the four answers by name and artist, in the round's order", () => {
    mount();

    expect(buttons().map((button) => button.textContent)).toEqual([
      "1Mischievous StepMitsukiyo",
      "2Constant ModeratoMitsukiyo",
      "3Lovely PicnicMitsukiyo",
      "4Luminous memoryMitsukiyo",
    ]);
  });

  it("picks the answer tapped", () => {
    mount();

    act(() => buttons()[1].click());

    expect(onPick).toHaveBeenCalledWith(
      expect.objectContaining({ themeNo: "1" })
    );
  });

  it("picks with the number keys", () => {
    mount();

    press("3");

    expect(onPick).toHaveBeenCalledWith(
      expect.objectContaining({ themeNo: "4" })
    );
  });

  it("ignores the keys while a dialog is open", () => {
    mount({ keyboardEnabled: false });

    press("1");
    press("5");

    expect(onPick).not.toHaveBeenCalled();
  });

  it("can't be picked from again once the round is over", () => {
    mount({ answer: "1", picked: "4" });

    press("1");
    act(() => buttons()[0].click());

    expect(onPick).not.toHaveBeenCalled();
    expect(buttons().every((button) => button.disabled)).toBe(true);
  });
});
