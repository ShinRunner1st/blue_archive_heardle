import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { WhatsNewPopUp } from "./index";
import { createHarness } from "../../test/harness";
import { SHOWN_UPDATES, WHATS_NEW } from "../../constants/whatsNew";

let harness: ReturnType<typeof createHarness>;
const onClose = vi.fn();

beforeEach(() => {
  harness = createHarness();
  harness.render(React.createElement(WhatsNewPopUp, { onClose }));
});

afterEach(() => {
  harness.destroy();
  vi.clearAllMocks();
});

describe("WhatsNewPopUp", () => {
  it("shows the newest update first, marked as new", () => {
    const sections = harness.container.querySelectorAll("section");

    expect(sections[0].getAttribute("aria-label")).toBe(WHATS_NEW[0].name);
    expect(sections[0].textContent).toContain("New");
  });

  it("keeps the updates before it, for anyone who missed them", () => {
    const shown = WHATS_NEW.slice(0, SHOWN_UPDATES);

    expect(harness.container.querySelectorAll("section")).toHaveLength(
      shown.length
    );
    shown.forEach(({ items }) =>
      items.forEach(({ title }) =>
        expect(harness.container.textContent).toContain(title)
      )
    );
  });
});

describe("the update list", () => {
  it("gives every update its own id", () => {
    const ids = WHATS_NEW.map((update) => update.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
