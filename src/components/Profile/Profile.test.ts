import React, { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createHarness } from "../../test/harness";
import {
  fetchAccount,
  fetchVerified,
  putProfileShown,
} from "../../helpers/accountClient";

import ProfilePopUp from ".";

vi.mock("../../helpers/accountClient", async (original) => ({
  ...(await original<typeof import("../../helpers/accountClient")>()),
  fetchAccount: vi.fn(),
  fetchVerified: vi.fn(),
  finishSignIn: vi.fn(async () => null),
  putProfileShown: vi.fn(async () => true),
}));

const fetched = vi.mocked(fetchAccount);
const verified = vi.mocked(fetchVerified);
let harness: ReturnType<typeof createHarness>;

beforeEach(() => {
  localStorage.clear();
  verified.mockReset();
  verified.mockResolvedValue({
    zone: "Asia/Bangkok",
    today: 16,
    since: 14,
    dailies: {
      ost: {
        played: 3,
        won: 2,
        lost: 1,
        abandoned: 0,
        spread: { "1": 1, "3": 1 },
        streak: 2,
        bestStreak: 2,
        bestTime: null,
        firstDay: 14,
      },
      "lore.jp": {
        played: 1,
        won: 1,
        lost: 0,
        abandoned: 0,
        spread: { "5": 1 },
        streak: 1,
        bestStreak: 1,
        bestTime: 83_000,
        firstDay: 16,
      },
    },
    rooms: { played: 4, first: 1, places: { "1": 1, "3": 2 }, firstDay: 15 },
  });
  fetched.mockReset();
  fetched.mockResolvedValue({
    publicId: "p1",
    createdAt: Date.UTC(2026, 9, 2),
    identities: [{ provider: "discord", linkedAt: Date.UTC(2026, 9, 2) }],
    profileShown: true,
  });
  harness = createHarness();
});

afterEach(() => harness.destroy());

const profile = (startTab?: "account" | "verified") =>
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

describe("ProfilePopUp's Verified tab", () => {
  const panel = () =>
    harness.container.ownerDocument.querySelector('[role="tabpanel"]');

  it("reads the verified record once, as it first opens", async () => {
    harness.render(profile());
    tab("Account");
    await settle();
    expect(verified).not.toHaveBeenCalled();

    tab("Verified");
    await settle();
    expect(verified).toHaveBeenCalledTimes(1);
    for (let i = 0; i < 5; i++) {
      tab("Overview");
      tab("Verified");
    }
    await settle();
    expect(verified).toHaveBeenCalledTimes(1);
  });

  it("shows each daily played, its streak and spread, and the rooms", async () => {
    harness.render(profile("verified"));
    await settle();
    const text = panel()?.textContent ?? "";
    expect(text).toContain("Verified since 10 Oct 2026");
    expect(text).toContain("not looking an answer up");
    expect(text).toContain("OST");
    expect(text).toContain("Students · Lore (JP)");
    expect(text).toContain("1:23");
    expect(text).toContain("1 first, 3 in the top three");
    // Only the dailies played.
    expect(text).not.toContain("Voice");
  });

  it("says so when the account can't be reached, and tries again", async () => {
    verified.mockRejectedValueOnce(new Error("offline"));
    harness.render(profile("verified"));
    await settle();
    expect(panel()?.textContent).toContain("couldn't be reached");
    const again = [
      ...harness.container.ownerDocument.querySelectorAll("button"),
    ].find((button) => button.textContent === "Try again");
    act(() => again!.click());
    await settle();
    expect(verified).toHaveBeenCalledTimes(2);
    expect(panel()?.textContent).toContain("OST");
  });
});

describe("ProfilePopUp's switch for profiles in rooms", () => {
  it("hides the profile, then reads the account again to show it", async () => {
    const put = vi.mocked(putProfileShown);
    put.mockClear();
    harness.render(profile("account"));
    await settle();
    const panel = () =>
      harness.container.ownerDocument.querySelector('[role="tabpanel"]');
    expect(panel()?.textContent).toContain(
      "Players in a room with you can see it from your card"
    );
    fetched.mockResolvedValue({
      publicId: "p1",
      createdAt: Date.UTC(2026, 9, 2),
      identities: [{ provider: "discord", linkedAt: Date.UTC(2026, 9, 2) }],
      profileShown: false,
    });
    const hide = [
      ...harness.container.ownerDocument.querySelectorAll("button"),
    ].find((button) => button.textContent === "Hide");
    act(() => hide!.click());
    await settle();
    expect(put).toHaveBeenCalledWith(false);
    expect(panel()?.textContent).toContain("Hidden: your card in a room");
  });
});
