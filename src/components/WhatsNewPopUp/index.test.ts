import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { WhatsNewPopUp } from "./index";
import { createHarness } from "../../test/harness";
import { WHATS_NEW } from "../../constants/whatsNew";

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
  it("shows only the newest update, with everything it added", () => {
    const sections = harness.container.querySelectorAll("section");

    expect(sections).toHaveLength(1);
    expect(sections[0].getAttribute("aria-label")).toBe(WHATS_NEW.name);
    WHATS_NEW.items.forEach(({ title }) =>
      expect(harness.container.textContent).toContain(title)
    );
  });
});
