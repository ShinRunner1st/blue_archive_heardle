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
  it("lists every new thing", () => {
    WHATS_NEW.items.forEach(({ title }) => {
      expect(harness.container.textContent).toContain(title);
    });
  });
});
