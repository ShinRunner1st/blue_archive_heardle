import React, { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createHarness } from "../../test/harness";
import { ProfileViewAnswer } from "../../types/account";
import { PlayerView } from "../../types/room";
import { DEFAULT_LOOK } from "../../helpers/roomLook";

import { RoomProfile, RoomProfileState } from "./RoomProfile";

const PLAYER: PlayerView = {
  id: "abc123",
  name: "Mutsuki",
  icon: null,
  look: DEFAULT_LOOK,
  score: 0,
  time: 0,
  here: true,
  ready: -1,
  answered: false,
  returned: false,
  profile: true,
};

const ANSWER: ProfileViewAnswer = {
  summary: {
    roundsPlayed: 120,
    daysPlayed: 9,
    dailiesWon: 7,
    bestDailyStreak: 4,
    bestWinStreak: 11,
    songsGuessed: 80,
    studentsFound: 30,
    missionsCleared: 6,
    badgesEarned: 1,
    roomGames: 3,
    roomWins: 1,
    server: "jp",
  },
  verified: {
    since: 14,
    dailies: {
      ost: {
        played: 3,
        won: 2,
        lost: 1,
        abandoned: 0,
        spread: { "1": 1, "3": 1 },
        bestStreak: 2,
        bestTime: null,
        firstDay: 14,
      },
    },
    rooms: { played: 4, first: 1, places: { "1": 1, "2": 3 }, firstDay: 15 },
  },
};

let harness: ReturnType<typeof createHarness>;
beforeEach(() => {
  harness = createHarness();
});
afterEach(() => harness.destroy());

function show(state: RoomProfileState, onRetry = vi.fn()) {
  harness.render(
    React.createElement(RoomProfile, {
      player: PLAYER,
      state,
      onRetry,
      onClose: () => {},
    })
  );
  return harness.container.ownerDocument.body.textContent ?? "";
}

describe("RoomProfile", () => {
  it("shows the verified record, then their own saves' summary marked unverified", () => {
    const text = show({ status: "shown", answer: ANSWER });
    expect(text).toContain("Mutsuki's profile");
    const verified = text.indexOf("Verified since");
    const own = text.indexOf("From their own saves");
    expect(verified).toBeGreaterThan(-1);
    expect(own).toBeGreaterThan(verified);
    expect(text).toContain("Not verified: worked out in their own browser");
    expect(text).toContain("aren't cheat-proof");
    // Best streaks only: another player's current streaks aren't read.
    expect(text).toContain("Best streak");
    expect(text).not.toMatch(/Streak\d/);
    expect(text).toContain("120");
    expect(text).toContain("JP");
  });

  it("says when there's no summary yet", () => {
    const text = show({
      status: "shown",
      answer: { ...ANSWER, summary: null },
    });
    expect(text).toContain("Nothing synced yet.");
  });

  it("says it's loading, hidden, or failed, with Try again", () => {
    expect(show({ status: "loading" })).toContain("Opening their profile");
    harness.unmount();
    expect(show({ status: "hidden" })).toContain(
      "keeps their profile to themselves"
    );
    harness.unmount();
    const onRetry = vi.fn();
    expect(show({ status: "failed" }, onRetry)).toContain("couldn't be opened");
    const again = [
      ...harness.container.ownerDocument.querySelectorAll("button"),
    ].find((button) => button.textContent === "Try again");
    act(() => again!.click());
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
