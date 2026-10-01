// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { AccountsEnv, handle } from "../accounts/api";
import { createAccount, createSession } from "../accounts/store";
import {
  ACCOUNT_SESSION_KEY,
  BACKUP_BEFORE_ACCOUNT_KEY,
  PROGRESS_REVISION_KEY,
} from "../constants/game";
import { songs } from "../constants/songs";
import { fakeD1, FakeD1 } from "../test/fakeD1";
import { MemoryStorage } from "../test/memoryStorage";
import { Round } from "../types/stats";
import { StudentRound } from "../types/student";
import { fetchAccountState, resetAccountClientState } from "./accountClient";
import { loadRoomGames, recordRoomGame, saveClearedMissions } from "./missions";
import {
  clearLocalProgress,
  isLocalBehind,
  resetProgressSyncState,
  saveBeforeSignOut,
  syncProgress,
} from "./progressSync";
import { stamped } from "./roundId";
import { currentSave } from "./saveFile";
import {
  emptyGuesses,
  loadRounds,
  loadStudentRounds,
  saveRounds,
  saveStudentRounds,
} from "./storage";

const SITE = "http://localhost:3000";

let db: FakeD1;
let env: AccountsEnv;
let now: number;
let online: boolean;
/** Every request the page made: its method, address and revision header. */
let calls: { method: string; url: string; base: string | null }[];
const realFetch = globalThis.fetch;

/** A browser: its own storage, as each device has. */
interface Device {
  storage: MemoryStorage;
  session: MemoryStorage;
}

function setGlobal(name: string, value: unknown): void {
  Object.defineProperty(globalThis, name, {
    value,
    configurable: true,
    writable: true,
  });
}

/** Switches to a device, as a new page load on it. */
function on(device: Device): void {
  setGlobal("localStorage", device.storage);
  setGlobal("sessionStorage", device.session);
  resetProgressSyncState();
  resetAccountClientState();
}

/** A device signed in to `account`. */
async function device(account: string): Promise<Device> {
  const made = { storage: new MemoryStorage(), session: new MemoryStorage() };
  made.storage.setItem(
    ACCOUNT_SESSION_KEY,
    await createSession(db, account, now)
  );
  return made;
}

let at = 1000;
/** A finished OST round, dealt now. */
function ost(index: number, overrides: Partial<Round> = {}): Round {
  return stamped(
    {
      solution: songs[index],
      currentTry: 1,
      didGuess: true,
      guesses: emptyGuesses(),
      startTime: 0,
      ...overrides,
    },
    at++
  );
}

const student = (answer: number, day?: number): StudentRound =>
  stamped(
    { answer, guesses: [answer], ...(day === undefined ? {} : { day }) },
    at++
  );

/** The account's save, as the Worker keeps it. */
async function accountSave(): Promise<Record<string, unknown> | null> {
  const row = db.sqlite.prepare("SELECT data FROM progress").get() as
    | { data: Uint8Array }
    | undefined;
  if (!row) return null;
  const text = await new Response(
    new Blob([new Uint8Array(row.data)])
      .stream()
      .pipeThrough(new DecompressionStream("gzip"))
  ).text();
  return JSON.parse(text);
}

const revision = () =>
  (
    db.sqlite.prepare("SELECT revision FROM progress").get() as
      | { revision: number }
      | undefined
  )?.revision ?? 0;

const ids = (rounds: Array<{ id?: string }>) => rounds.map((round) => round.id);

const sync = (canApply = true) => syncProgress({ canApply: () => canApply });

/**
 * The page opening, as accountStartup.ts does it: the account's state read
 * first and handed to the sync, which then takes in another device's
 * writes. A later sync (a timer, a hidden tab) has none, and only sends.
 */
const opens = async () =>
  syncProgress({ canApply: () => true, state: await fetchAccountState() });

let account: string;

beforeEach(async () => {
  db = fakeD1();
  now = Date.UTC(2026, 9, 2, 12);
  online = true;
  calls = [];
  env = { db, stateKey: "test-key", now: () => now };
  account = await createAccount(db, "google", "alice", now);
  // The page's requests reach the Worker's code, from the site's address.
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    if (!online) throw new TypeError("Failed to fetch");
    const request = new Request(input, init);
    calls.push({
      method: request.method,
      url: request.url.replace(/^https?:\/\/[^/]+/, ""),
      base: request.headers.get("X-Base"),
    });
    const headers = new Headers(request.headers);
    headers.set("Origin", SITE);
    return handle(new Request(request, { headers }), env);
  }) as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = realFetch;
});

describe("the first sign-in in a browser", () => {
  it("sends this browser's progress to an account with none, kept aside first", async () => {
    const a = await device(account);
    on(a);
    saveRounds([ost(0), ost(1)], "endless");

    expect(await sync()).toBe("synced");

    expect(revision()).toBe(1);
    const saved = (await accountSave())!;
    expect((saved.rounds as Record<string, unknown[]>).endless).toHaveLength(2);
    expect(a.storage.getItem(BACKUP_BEFORE_ACCOUNT_KEY)).not.toBeNull();
    expect(a.storage.getItem(PROGRESS_REVISION_KEY)).toBe("1");
    expect(loadRounds("endless")).toHaveLength(2);
  });

  it("brings the account's progress to a browser with none", async () => {
    const a = await device(account);
    on(a);
    saveRounds([ost(0), ost(1)], "endless");
    await sync();

    const b = await device(account);
    on(b);
    expect(await sync()).toBe("synced");
    expect(ids(loadRounds("endless"))).toEqual(
      ids(
        ((await accountSave()) as { rounds: { endless: Round[] } }).rounds
          .endless
      )
    );
    expect(revision()).toBe(1);
    // Nothing to put aside: this browser had nothing.
    expect(b.storage.getItem(BACKUP_BEFORE_ACCOUNT_KEY)).toBeNull();
  });

  it("merges both, each kept aside first, one daily a day", async () => {
    const a = await device(account);
    on(a);
    const aDaily = student(10005, 3);
    saveStudentRounds("lore-daily", [aDaily]);
    saveRounds([ost(0)], "endless");
    await sync();

    const b = await device(account);
    on(b);
    // The same daily puzzle, played here later, and another round.
    const bDaily = student(10005, 3);
    saveStudentRounds("lore-daily", [bDaily]);
    saveRounds([ost(2)], "endless");

    expect(await sync()).toBe("synced");

    // Both rounds, and one daily: both finished, the one dealt first.
    expect(loadRounds("endless")).toHaveLength(2);
    expect(ids(loadStudentRounds("lore-daily"))).toEqual([aDaily.id]);
    expect(revision()).toBe(2);
    // The account kept what it had; this browser kept its own.
    const backup = db.sqlite
      .prepare("SELECT revision FROM progress_backups")
      .get() as { revision: number };
    expect(backup.revision).toBe(1);
    expect(b.storage.getItem(BACKUP_BEFORE_ACCOUNT_KEY)).not.toBeNull();
  });

  it("counts nothing twice when both have the same save", async () => {
    const a = await device(account);
    on(a);
    saveRounds([ost(0), ost(1)], "endless");
    recordRoomGame(true, 500);
    await sync();
    const same = currentSave();

    // The same save on another device (a save file carried over).
    const b = await device(account);
    on(b);
    saveRounds(same.rounds.endless, "endless");
    saveRoomGamesFrom(same.roomGames);
    expect(await sync()).toBe("synced");

    expect(loadRounds("endless")).toHaveLength(2);
    expect(loadRoomGames()).toHaveLength(1);
    // Nothing new: the account wasn't written again.
    expect(revision()).toBe(1);
  });

  it("does nothing for neither, and changes nothing when it can't copy aside", async () => {
    const a = await device(account);
    on(a);
    expect(await sync()).toBe("synced");
    expect(revision()).toBe(0);

    const b = await device(account);
    on(b);
    saveRounds([ost(0)], "endless");
    b.storage.failOn = BACKUP_BEFORE_ACCOUNT_KEY;
    expect(await sync()).toBe("backupFailed");
    expect(revision()).toBe(0);
    expect(b.storage.getItem(PROGRESS_REVISION_KEY)).toBeNull();
  });
});

function saveRoomGamesFrom(games: ReturnType<typeof loadRoomGames>): void {
  localStorage.setItem("roomGames", JSON.stringify(games));
}

describe("after, between devices", () => {
  async function twoJoined() {
    const a = await device(account);
    on(a);
    saveRounds([ost(0)], "endless");
    await sync();
    const b = await device(account);
    on(b);
    await sync();
    return { a, b };
  }

  it("sends a change, and only a change", async () => {
    const { a } = await twoJoined();
    on(a);
    expect(await sync()).toBe("synced");
    expect(revision()).toBe(1);
    saveRounds([...loadRounds("endless"), ost(3)], "endless");
    expect(await sync()).toBe("synced");
    expect(revision()).toBe(2);
  });

  it("merges after another device's write, losing neither", async () => {
    const { a, b } = await twoJoined();

    on(a);
    saveRounds([...loadRounds("endless"), ost(4)], "endless");
    await sync(false);
    expect(revision()).toBe(2);

    // B played too, from revision 1: refused, merged, sent again. The page
    // has drawn, so B's own save is left as it is for now.
    on(b);
    saveRounds([...loadRounds("endless"), ost(5)], "endless");
    expect(await sync(false)).toBe("synced");
    expect(revision()).toBe(3);
    const saved = (await accountSave()) as { rounds: { endless: Round[] } };
    expect(saved.rounds.endless).toHaveLength(3);
    expect(loadRounds("endless")).toHaveLength(2);
    expect(isLocalBehind()).toBe(true);

    // B opens again: it takes the merge in, and sends nothing new.
    on(b);
    expect(await opens()).toBe("synced");
    expect(loadRounds("endless")).toHaveLength(3);
    expect(revision()).toBe(3);

    on(a);
    await opens();
    expect(loadRounds("endless")).toHaveLength(3);
  });

  it("keeps the browser's save as it is offline, and sends it later", async () => {
    const { a } = await twoJoined();
    on(a);
    saveRounds([...loadRounds("endless"), ost(6)], "endless");
    online = false;
    expect(await sync()).toBe("offline");
    expect(loadRounds("endless")).toHaveLength(2);
    expect(revision()).toBe(1);

    online = true;
    expect(await sync()).toBe("synced");
    expect(revision()).toBe(2);
  });
});

describe("what this page doesn't know", () => {
  it("keeps a newer page's fields, lists and missions in the account", async () => {
    const a = await device(account);
    on(a);
    saveRounds([ost(0)], "endless");
    saveClearedMissions(["jp"]);
    await sync();

    // A newer page wrote what this one has no place for.
    const saved = (await accountSave())!;
    saved.futureThing = { kept: true };
    (saved.rounds as Record<string, unknown>).newMode = [{ id: "x" }];
    (saved.jp as Record<string, unknown>).later = 7;
    saved.missions = [...(saved.missions as string[]), "future-mission"];
    const data = new Uint8Array(
      await new Response(
        new Blob([JSON.stringify(saved)])
          .stream()
          .pipeThrough(new CompressionStream("gzip"))
      ).arrayBuffer()
    );
    db.sqlite.prepare("UPDATE progress SET data = ?, revision = 2").run(data);

    // This page merges, then plays on and sends again: none of it goes.
    const b = await device(account);
    on(b);
    saveRounds([ost(7)], "endless");
    await sync();
    saveRounds([...loadRounds("endless"), ost(8)], "endless");
    await sync();

    const after = (await accountSave())!;
    expect(after.futureThing).toEqual({ kept: true });
    expect((after.rounds as Record<string, unknown>).newMode).toEqual([
      { id: "x" },
    ]);
    expect((after.jp as Record<string, unknown>).later).toBe(7);
    expect(after.missions).toEqual(
      expect.arrayContaining(["jp", "future-mission"])
    );
    expect((after.rounds as Record<string, unknown[]>).endless).toHaveLength(3);
  });

  it("leaves a newer format's save alone", async () => {
    const a = await device(account);
    on(a);
    saveRounds([ost(0)], "endless");
    await sync();
    db.sqlite.prepare("UPDATE progress SET format = 3").run();

    const b = await device(account);
    on(b);
    saveRounds([ost(9)], "endless");
    expect(await sync()).toBe("newerFormat");
    expect(loadRounds("endless")).toHaveLength(1);
    expect(revision()).toBe(1);
  });
});

describe("what a sync costs", () => {
  async function joined() {
    const a = await device(account);
    on(a);
    saveRounds([ost(0)], "endless");
    await opens();
    calls = [];
    return a;
  }
  const said = () => calls.map(({ method, url }) => `${method} ${url}`);

  it("sends nothing when nothing changed: a tab switch costs no request", async () => {
    await joined();
    expect(await sync(false)).toBe("synced");
    expect(await saveBeforeSignOut()).toBe(true);
    expect(calls).toEqual([]);
  });

  it("sends a change straight up on the revision it matched, to one address", async () => {
    await joined();
    saveRounds([...loadRounds("endless"), ost(1)], "endless");
    expect(await sync(false)).toBe("synced");
    expect(said()).toEqual(["PUT /me/progress"]);
    expect(calls[0].base).toBe("1");

    saveRounds([...loadRounds("endless"), ost(2)], "endless");
    await sync(false);
    // The same address every time, so the browser's preflight is reused.
    expect(said()).toEqual(["PUT /me/progress", "PUT /me/progress"]);
    expect(calls[1].base).toBe("2");
    expect(revision()).toBe(3);
  });

  it("is refused on a stale revision, then reads, merges and backs up as ever", async () => {
    const a = await joined();
    const b = await device(account);
    on(b);
    await opens();
    saveRounds([...loadRounds("endless"), ost(5)], "endless");
    await sync(false);
    expect(revision()).toBe(2);

    on(a);
    calls = [];
    saveRounds([...loadRounds("endless"), ost(4)], "endless");
    expect(await sync(false)).toBe("synced");
    expect(said()).toEqual([
      "PUT /me/progress",
      "GET /me/profile",
      "GET /me/progress",
      "PUT /me/progress",
    ]);
    expect(calls[0].base).toBe("1");
    expect(calls[3].base).toBe("2");
    expect(revision()).toBe(3);
    const saved = (await accountSave()) as { rounds: { endless: Round[] } };
    expect(saved.rounds.endless).toHaveLength(3);
    // What the merge wrote over was kept.
    const backup = db.sqlite
      .prepare("SELECT revision FROM progress_backups")
      .get() as { revision: number };
    expect(backup.revision).toBe(2);
  });

  it("still never writes over a newer format", async () => {
    await joined();
    db.sqlite.prepare("UPDATE progress SET format = 3").run();
    saveRounds([...loadRounds("endless"), ost(1)], "endless");
    expect(await sync(false)).toBe("newerFormat");
    expect(revision()).toBe(1);
  });

  it("needs the session still, as every request does", async () => {
    await joined();
    db.sqlite.prepare("DELETE FROM sessions").run();
    saveRounds([...loadRounds("endless"), ost(1)], "endless");
    expect(await sync(false)).toBe("signedOut");
    expect(revision()).toBe(1);
  });
});

describe("signing out", () => {
  it("clears this browser's copy, the one put aside too", async () => {
    const a = await device(account);
    on(a);
    saveRounds([ost(0)], "endless");
    await sync();
    clearLocalProgress();
    expect(loadRounds("endless")).toEqual([]);
    expect(a.storage.getItem(BACKUP_BEFORE_ACCOUNT_KEY)).toBeNull();
    // The account keeps it.
    expect(
      ((await accountSave()) as { rounds: { endless: Round[] } }).rounds.endless
    ).toHaveLength(1);
  });
});

describe("the profile's summary", () => {
  it("is worked out from the progress after the merge", async () => {
    const { syncProfile } = await import("./profileSync");
    const a = await device(account);
    on(a);
    saveRounds([ost(0), ost(1)], "endless");
    await sync();

    const b = await device(account);
    on(b);
    saveRounds([ost(2)], "endless");
    await sync(true);
    await syncProfile();

    const row = db.sqlite.prepare("SELECT summary FROM profiles").get() as {
      summary: string;
    };
    // All three rounds: the merge's, not this browser's own one.
    expect(JSON.parse(row.summary)).toMatchObject({
      roundsPlayed: 3,
      songsGuessed: 3,
    });
  });
});
