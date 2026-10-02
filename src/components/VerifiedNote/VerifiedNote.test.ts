import React, { act } from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { ACCOUNT_SESSION_KEY } from "../../constants/game";
import {
  resetVerifiedState,
  updateVerifiedStore,
  VerifiedEntry,
} from "../../helpers/verifiedPlay";
import { createHarness } from "../../test/harness";

import { VerifiedNote, verifiedText } from ".";

const entry = (fields: Partial<VerifiedEntry>): VerifiedEntry => ({
  daily: "ost",
  day: 16,
  state: "playing",
  askedAt: 0,
  ...fields,
});

describe("verifiedText", () => {
  it("says verified only for a round the server judged", () => {
    expect(
      verifiedText(entry({ state: "verified", outcome: "won", tries: 3 }))
    ).toBe("✓ Verified: won in 3 tries");
    for (const state of ["starting", "playing", "finishing"] as const) {
      expect(verifiedText(entry({ state }))).not.toContain("✓");
    }
    for (const why of [
      "day",
      "behind",
      "offline",
      "late",
      "refused",
    ] as const) {
      expect(verifiedText(entry({ state: "personal", why }))).toMatch(
        /^Not verified: /
      );
    }
    expect(
      verifiedText(entry({ state: "elsewhere", outcome: "lost", tries: 6 }))
    ).toBe("Already played verified on another device: not won");
  });

  it("names a Students find by guesses, and a late one's time as uncounted", () => {
    expect(
      verifiedText(
        entry({
          daily: "lore.jp",
          state: "verified",
          outcome: "won",
          tries: 1,
          timeVerified: false,
        })
      )
    ).toBe(
      "✓ Verified: found in 1 guess (sent late, so its time isn't counted)"
    );
  });
});

describe("VerifiedNote", () => {
  let harness: ReturnType<typeof createHarness>;
  beforeEach(() => {
    localStorage.clear();
    resetVerifiedState();
    harness = createHarness();
  });
  afterEach(() => harness.destroy());

  const note = () =>
    harness.container.querySelector('[role="status"]')?.textContent ?? null;

  it("shows nothing for a daily never sent, as a guest's", () => {
    harness.render(
      React.createElement(VerifiedNote, { daily: "ost", day: 16 })
    );
    expect(note()).toBeNull();
  });

  it("follows the daily as the server answers", () => {
    localStorage.setItem(ACCOUNT_SESSION_KEY, "token");
    updateVerifiedStore(() => ({
      entries: [entry({ state: "finishing" })],
      receipts: [],
    }));
    harness.render(
      React.createElement(VerifiedNote, { daily: "ost", day: 16 })
    );
    expect(note()).toBe("Sending to your verified record…");
    act(() =>
      updateVerifiedStore(() => ({
        entries: [entry({ state: "verified", outcome: "won", tries: 1 })],
        receipts: [],
      }))
    );
    expect(note()).toBe("✓ Verified: won in 1 try");
  });
});
