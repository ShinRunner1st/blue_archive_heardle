import React, { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createHarness } from "../../test/harness";
import { fetchAccount } from "../../helpers/accountClient";

import ProfilePopUp from ".";

vi.mock("../../helpers/accountClient", async (original) => ({
  ...(await original<typeof import("../../helpers/accountClient")>()),
  fetchAccount: vi.fn(),
  finishSignIn: vi.fn(async () => null),
}));

const fetched = vi.mocked(fetchAccount);
let harness: ReturnType<typeof createHarness>;

beforeEach(() => {
  localStorage.clear();
  fetched.mockReset();
  fetched.mockResolvedValue({
    publicId: "p1",
    createdAt: Date.UTC(2026, 9, 2),
    identities: [{ provider: "discord", linkedAt: Date.UTC(2026, 9, 2) }],
  });
  harness = createHarness();
});

afterEach(() => harness.destroy());

const profile = (startTab?: "account") =>
  React.createElement(ProfilePopUp, {
    onClose: () => {},
    onSenseiCard: () => {},
    startTab,
  });

/** Lets the lazy Account tab load and its reads settle. */
const settle = () =>
  act(async () => {
    for (let i = 0; i < 40; i++) await new Promise((r) => setTimeout(r, 10));
  });

function tab(label: string) {
  const button = [
    ...harness.container.ownerDocument.querySelectorAll('[role="tab"]'),
  ].find((element) => element.textContent?.trim() === label);
  if (!button) throw new Error(`no ${label} tab`);
  act(() => (button as HTMLButtonElement).click());
}

describe("ProfilePopUp's Account tab", () => {
  it("reads the account once, however often the tabs are switched", async () => {
    harness.render(profile());
    expect(fetched).not.toHaveBeenCalled();

    tab("Account");
    await settle();
    expect(fetched).toHaveBeenCalledTimes(1);
    const panel = () =>
      harness.container.ownerDocument.querySelector('[role="tabpanel"]');
    expect(panel()?.textContent).toContain("Discord");

    for (let i = 0; i < 5; i++) {
      tab("Overview");
      tab("Account");
    }
    await settle();
    expect(fetched).toHaveBeenCalledTimes(1);
    expect(panel()?.textContent).toContain("Discord");

    // Hidden, not shown, on the other tabs.
    tab("Overview");
    const kept = panel()?.querySelector("[hidden]");
    expect(kept?.textContent).toContain("Discord");
  });

  it("reads it again when the profile is opened again", async () => {
    harness.render(profile("account"));
    await settle();
    expect(fetched).toHaveBeenCalledTimes(1);

    harness.unmount();
    harness.render(profile("account"));
    await settle();
    expect(fetched).toHaveBeenCalledTimes(2);
  });
});
