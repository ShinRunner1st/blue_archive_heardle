import React, { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CUSTOM_CURSOR_KEY } from "../../constants/game";
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
});
