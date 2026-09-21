import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { HowToPopUp } from "./index";
import { createHarness } from "../../test/harness";

let harness: ReturnType<typeof createHarness>;
const onClose = vi.fn();

beforeEach(() => {
  harness = createHarness();
  harness.render(React.createElement(HowToPopUp, { onClose }));
});

afterEach(() => {
  harness.destroy();
  vi.clearAllMocks();
});

describe("HowToPopUp", () => {
  it("explains the three ways to search", () => {
    const text = harness.container.textContent ?? "";

    expect(text).toContain("You can search by");
    expect(text).toContain("Name");
    expect(text).toContain("OST number");
    expect(text).toContain("Artist");
  });

  it("lays out the three steps as an ordered list", () => {
    const steps = harness.container.querySelectorAll("ol li");

    expect(steps).toHaveLength(3);
    expect(steps[0].textContent).toContain("Listen");
    expect(steps[2].textContent).toContain("Guess");
  });

  it("documents the keyboard shortcuts", () => {
    const keys = Array.from(harness.container.querySelectorAll("kbd")).map(
      (el) => el.textContent
    );

    expect(keys).toContain("Space");
    expect(keys).toContain("Enter");
    expect(keys).toContain("Esc");
  });

  it("pairs every shortcut key with a description", () => {
    const terms = harness.container.querySelectorAll("dt");
    const definitions = harness.container.querySelectorAll("dd");

    expect(terms.length).toBeGreaterThan(0);
    expect(definitions.length).toBe(terms.length);
  });
});
