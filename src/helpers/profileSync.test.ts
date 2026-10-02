import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  PROFILE_BANNER_KEY,
  PROFILE_EDITED_KEY,
  PROFILE_MISSIONS_SENT_KEY,
  PROFILE_SUMMARY_SENT_KEY,
  PROGRESS_REVISION_KEY,
} from "../constants/game";
import { AccountProfile } from "../types/account";
import { fetchProfile, putProfile } from "./accountClient";
import { pickedOf, setPicked, storeAccountPick } from "./cosmetics";
import { getPlayerName, setPlayerName } from "./playerName";
import { profileEditedAt } from "./profileEdit";
import { saveClearedMissions } from "./missions";
import {
  forgetMissionsSent,
  profileUpToDate,
  resetProfileSyncState,
  syncProfile,
} from "./profileSync";
import { emptyGuesses, saveRounds } from "./storage";

// The account, as the Worker keeps it: the later change wins.
vi.mock("./accountClient", () => ({
  fetchProfile: vi.fn(),
  putProfile: vi.fn(),
}));

const fetched = vi.mocked(fetchProfile);
const put = vi.mocked(putProfile);

const account = (overrides: Partial<AccountProfile> = {}): AccountProfile => ({
  name: "Shin",
  sensei: true,
  student: 10004,
  title: "none",
  banner: "sakura",
  frame: "schale",
  background: "none",
  nameEffect: "none",
  cardColors: "schale",
  editedAt: 5000,
  ...overrides,
});

const song = { artist: "Mitsukiyo", name: "Constant Moderato", themeNo: "1" };

beforeEach(() => {
  localStorage.clear();
  // A browser joined with its account: one never joined sends nothing.
  localStorage.setItem(PROGRESS_REVISION_KEY, "1");
  resetProfileSyncState();
  fetched.mockReset();
  put.mockReset();
  put.mockImplementation(async (profile) => {
    const { summary: _ignored, ...picks } = profile;
    void _ignored;
    return picks;
  });
});

describe("syncProfile", () => {
  it("gives a new account this browser's profile and its summary", async () => {
    setPlayerName("Arona");
    localStorage.removeItem(PROFILE_EDITED_KEY);
    saveRounds(
      [
        {
          solution: song,
          currentTry: 1,
          didGuess: true,
          guesses: emptyGuesses(),
          startTime: 0,
        },
      ],
      "endless"
    );
    fetched.mockResolvedValue(null);

    await syncProfile(() => 9000);

    expect(put).toHaveBeenCalledOnce();
    const sent = put.mock.calls[0][0];
    expect(sent).toMatchObject({ name: "Arona", editedAt: 9000 });
    // Worked out from the saves, here.
    expect(sent.summary).toMatchObject({ roundsPlayed: 1, songsGuessed: 1 });
    expect(localStorage.getItem(PROFILE_SUMMARY_SENT_KEY)).toBe(
      JSON.stringify(sent.summary)
    );
  });

  it("takes in the account's later profile, a locked pick kept as it is", async () => {
    fetched.mockResolvedValue(account({ name: "Shin", banner: "sakura" }));

    await syncProfile();

    expect(getPlayerName()).toBe("Shin");
    // Not unlocked here yet: kept, and shown as the default until it is.
    expect(localStorage.getItem(PROFILE_BANNER_KEY)).toBe("sakura");
    expect(pickedOf("banner").id).toBe("none");
    // Taking it in isn't a change made here.
    expect(profileEditedAt()).toBe(5000);
  });

  it("sends this browser's later change, and nothing when nothing changed", async () => {
    fetched.mockResolvedValue(account({ editedAt: 1000 }));
    await syncProfile(); // takes the account's in
    put.mockClear();

    fetched.mockResolvedValue(account({ editedAt: 1000 }));
    await syncProfile();
    expect(put).not.toHaveBeenCalled();

    setPlayerName("Hoshino");
    const edited = profileEditedAt();
    expect(edited).toBeGreaterThan(1000);
    await syncProfile();
    expect(put).toHaveBeenCalledOnce();
    expect(put.mock.calls[0][0]).toMatchObject({
      name: "Hoshino",
      editedAt: edited,
    });
  });

  it("never sends an older change over the account's newer one", async () => {
    setPlayerName("Old here");
    localStorage.setItem(PROFILE_EDITED_KEY, "100");
    fetched.mockResolvedValue(account({ name: "New there", editedAt: 200 }));
    await syncProfile();
    expect(getPlayerName()).toBe("New there");
    // Sent only for the summary, with the account's own picks.
    expect(put.mock.calls[0]?.[0]).toMatchObject({ name: "New there" });
  });

  it("does nothing signed out, and never touches the progress", async () => {
    saveRounds(
      [
        {
          solution: song,
          currentTry: 1,
          didGuess: true,
          guesses: emptyGuesses(),
          startTime: 0,
        },
      ],
      "daily"
    );
    const progress = () =>
      Object.keys(localStorage)
        .filter((key) => key.startsWith("stats") || key.startsWith("ba-"))
        .map((key) => localStorage.getItem(key))
        .join("|");
    const before = progress();

    fetched.mockResolvedValue(undefined);
    await syncProfile();
    expect(put).not.toHaveBeenCalled();

    fetched.mockResolvedValue(account());
    await syncProfile();
    expect(progress()).toBe(before);
  });
});

describe("a browser not joined with its account yet", () => {
  it("sends nothing of the guest's progress it may still hold", async () => {
    localStorage.removeItem(PROGRESS_REVISION_KEY);
    saveClearedMissions(["daily-7"]);
    fetched.mockResolvedValue(null);
    await syncProfile();
    expect(fetched).not.toHaveBeenCalled();
    expect(put).not.toHaveBeenCalled();
  });
});

describe("missions for room passes", () => {
  const missionsSent = () =>
    put.mock.calls.map(([profile]) => profile.missions);

  it("sends the missions cleared once, and again only when one is new", async () => {
    fetched.mockResolvedValue(account({ editedAt: 1000 }));
    saveClearedMissions(["daily-7"]);
    await syncProfile();
    expect(missionsSent()).toEqual([["daily-7"]]);
    expect(localStorage.getItem(PROFILE_MISSIONS_SENT_KEY)).toBe("daily-7");

    put.mockClear();
    await syncProfile();
    expect(put).not.toHaveBeenCalled();

    saveClearedMissions(["first-daily", "daily-7"]);
    await syncProfile();
    expect(missionsSent()).toEqual([["first-daily", "daily-7"]]);

    // Signed out: the next account is sent them all.
    put.mockClear();
    forgetMissionsSent();
    await syncProfile();
    expect(missionsSent()).toEqual([["first-daily", "daily-7"]]);
  });

  it("syncs for a pass only when something changed since the last sync", async () => {
    fetched.mockResolvedValue(account({ editedAt: 1000 }));
    await profileUpToDate();
    expect(fetched).toHaveBeenCalledOnce();

    await profileUpToDate();
    expect(fetched).toHaveBeenCalledOnce();

    saveClearedMissions(["daily-7"]);
    await profileUpToDate();
    expect(fetched).toHaveBeenCalledTimes(2);
    expect(missionsSent().at(-1)).toEqual(["daily-7"]);

    setPlayerName("Hoshino");
    await profileUpToDate();
    expect(fetched).toHaveBeenCalledTimes(3);
    expect(put.mock.calls.at(-1)?.[0]).toMatchObject({ name: "Hoshino" });
  });
});

describe("profile picks", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("marks any change to a pick; refuses a locked one made here", () => {
    storeAccountPick("banner", "sakura");
    expect(profileEditedAt()).toBeGreaterThan(0);
    localStorage.removeItem(PROFILE_EDITED_KEY);
    setPicked("banner", "sakura"); // locked here: refused, nothing marked
    expect(profileEditedAt()).toBe(0);
  });
});
