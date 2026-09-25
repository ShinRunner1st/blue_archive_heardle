import React from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createHarness } from "../../test/harness";

import { ThemeTag } from "./index";

let harness: ReturnType<typeof createHarness>;

beforeEach(() => {
  harness = createHarness();
});

afterEach(() => {
  harness.destroy();
});

describe("ThemeTag", () => {
  it("shows the theme number without brackets", () => {
    harness.render(React.createElement(ThemeTag, { themeNo: "12" }));

    expect(harness.container.textContent).toBe("Theme 12");
  });

  it("says which way the answer lies, not just draws an arrow", () => {
    harness.render(
      React.createElement(ThemeTag, { themeNo: "60", direction: "down" })
    );

    const arrow = harness.container.querySelector('[role="img"]');
    expect(arrow?.textContent).toBe("↓");
    expect(arrow?.getAttribute("aria-label")).toBe(
      "The answer has a lower theme number"
    );
  });

  it("points up when the answer is higher", () => {
    harness.render(
      React.createElement(ThemeTag, { themeNo: "40", direction: "up" })
    );

    expect(
      harness.container
        .querySelector('[role="img"]')
        ?.getAttribute("aria-label")
    ).toBe("The answer has a higher theme number");
  });
});
