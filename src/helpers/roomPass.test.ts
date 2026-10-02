import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ROOM_PASS_MS } from "../types/room";
import { accountsEnabled, hasSession } from "./accountFlag";
import { fetchRoomPass } from "./accountClient";
import { saveClearedMissions } from "./missions";
import { markProfileEdited } from "./profileEdit";
import { profileUpToDate } from "./profileSync";
import { forgetRoomPass, ownLook, roomPass } from "./roomPass";

vi.mock("./accountFlag", () => ({
  accountsEnabled: vi.fn(),
  hasSession: vi.fn(),
}));
vi.mock("./accountClient", () => ({ fetchRoomPass: vi.fn() }));
vi.mock("./profileSync", () => ({ profileUpToDate: vi.fn() }));

const fetched = vi.mocked(fetchRoomPass);
const upToDate = vi.mocked(profileUpToDate);
const NOW = Date.UTC(2026, 9, 2, 12);

beforeEach(() => {
  localStorage.clear();
  forgetRoomPass();
  vi.mocked(accountsEnabled).mockReturnValue(true);
  vi.mocked(hasSession).mockReturnValue(true);
  fetched.mockReset();
  upToDate.mockReset();
  upToDate.mockResolvedValue();
  let n = 0;
  fetched.mockImplementation(async () => ({
    pass: `pass-${++n}`,
    expires: NOW + ROOM_PASS_MS,
  }));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("roomPass", () => {
  it("asks nothing for a guest, nor where accounts are off", async () => {
    vi.mocked(hasSession).mockReturnValue(false);
    expect(await roomPass(NOW)).toBeNull();
    vi.mocked(hasSession).mockReturnValue(true);
    vi.mocked(accountsEnabled).mockReturnValue(false);
    expect(await roomPass(NOW)).toBeNull();
    expect(upToDate).not.toHaveBeenCalled();
    expect(fetched).not.toHaveBeenCalled();
  });

  it("brings the account up to date, then keeps the pass for the visit", async () => {
    expect(await roomPass(NOW)).toBe("pass-1");
    expect(upToDate).toHaveBeenCalledOnce();
    expect(await roomPass(NOW + 60_000)).toBe("pass-1");
    expect(fetched).toHaveBeenCalledOnce();
  });

  it("asks again once a pick or a mission changes, or it's nearly out", async () => {
    await roomPass(NOW);
    markProfileEdited();
    expect(await roomPass(NOW)).toBe("pass-2");
    saveClearedMissions(["daily-7"]);
    expect(await roomPass(NOW)).toBe("pass-3");
    expect(await roomPass(NOW + ROOM_PASS_MS - 10 * 60_000)).toBe("pass-4");
    expect(upToDate).toHaveBeenCalledTimes(4);
  });

  it("joins as a guest would when the account is slow or can't make one", async () => {
    vi.useFakeTimers();
    fetched.mockImplementation(() => new Promise(() => {}));
    const waiting = roomPass(NOW);
    await vi.advanceTimersByTimeAsync(4000);
    expect(await waiting).toBeNull();

    vi.useRealTimers();
    forgetRoomPass();
    fetched.mockReset();
    fetched.mockResolvedValue(null);
    expect(await roomPass(NOW)).toBeNull();
  });

  it("is never kept in storage", async () => {
    await roomPass(NOW);
    const stored = [
      ...Object.values(localStorage),
      ...Object.values(sessionStorage),
    ].join("|");
    expect(stored).not.toContain("pass-1");
  });
});

describe("ownLook", () => {
  it("wears what's picked and unlocked here, the defaults otherwise", () => {
    expect(ownLook()).toEqual({
      title: "none",
      banner: "none",
      frame: "schale",
      background: "none",
      nameEffect: "none",
    });
  });
});
