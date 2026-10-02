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
import { fetchAccountState, resetAccountClientState } from "./accountClient";
import { loadClearedMissions, saveClearedMissions } from "./missions";
import {
  clearLocalProgress,
  hasLocalProgress,
  isLocalBehind,
  resetProgressSyncState,
  saveBeforeSignOut,
  syncProgress,
} from "./progressSync";
import { stamped } from "./roundId";
import { emptyGuesses, loadRounds, saveRounds } from "./storage";

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
  // A local dev server's page, as `npm run accounts` lets in.
  env = { db, stateKey: "test-key", localDev: true, now: () => now };
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
  it("deletes a guest's progress, never sending it, then sends what's played", async () => {
    const a = await device(account);
    on(a);
    // Played as a guest, before signing in.
    saveRounds([ost(0), ost(1)], "endless");
    saveClearedMissions(["first-daily"]);

    expect(await sync()).toBe("synced");
    expect(loadRounds("endless")).toEqual([]);
    expect(loadClearedMissions()).toEqual([]);
    expect(revision()).toBe(0);
    expect(await accountSave()).toBeNull();
    expect(a.storage.getItem(BACKUP_BEFORE_ACCOUNT_KEY)).toBeNull();
    expect(a.storage.getItem(PROGRESS_REVISION_KEY)).toBe("0");

    // Signed in, rounds go up as ever.
    saveRounds([ost(2)], "endless");
    expect(await sync()).toBe("synced");
    expect(revision()).toBe(1);
    const saved = (await accountSave())!;
    expect((saved.rounds as Record<string, unknown[]>).endless).toHaveLength(1);
  });

  it("brings the account's progress in place of a guest's", async () => {
    const a = await device(account);
    on(a);
    await sync();
    saveRounds([ost(0), ost(1)], "endless");
    await sync();

    const b = await device(account);
    on(b);
    const guest = ost(5);
    saveRounds([guest], "endless");
    expect(await sync()).toBe("synced");
    const accounts = ((await accountSave()) as { rounds: { endless: Round[] } })
      .rounds.endless;
    expect(ids(loadRounds("endless"))).toEqual(ids(accounts));
    expect(ids(accounts)).not.toContain(guest.id);
    // Nothing new: the account wasn't written again, nor kept a backup.
    expect(revision()).toBe(1);
    expect(
      db.sqlite.prepare("SELECT revision FROM progress_backups").get()
    ).toBeUndefined();
  });

  it("opens a page that has drawn again, once the guest's is gone", async () => {
    let reloads = 0;
    setGlobal("window", { location: { reload: () => (reloads += 1) } });
    const a = await device(account);
    on(a);
    saveRounds([ost(0)], "endless");
    expect(await sync(false)).toBe("synced");
    expect(reloads).toBe(1);
    expect(loadRounds("endless")).toEqual([]);
    expect(revision()).toBe(0);

    // The page open again, with nothing of the guest's: joined.
    on(a);
    expect(await opens()).toBe("synced");
    expect(reloads).toBe(1);
    expect(a.storage.getItem(PROGRESS_REVISION_KEY)).toBe("0");
    delete (globalThis as { window?: unknown }).window;
  });

  it("warns of played progress only, not a round dealt as a page opened", async () => {
    on(await device(account));
    saveRounds([ost(0, { didGuess: false, currentTry: 0 })], "daily");
    expect(hasLocalProgress()).toBe(false);
    saveRounds([ost(1)], "endless");
    expect(hasLocalProgress()).toBe(true);
    // Either way, the first sync leaves nothing of it.
    await sync();
    expect(loadRounds("daily")).toEqual([]);
  });

  it("does nothing for neither, and sends nothing when it can't clear", async () => {
    const a = await device(account);
    on(a);
    expect(await sync()).toBe("synced");
    expect(revision()).toBe(0);

    const b = await device(account);
    on(b);
    saveRounds([ost(0)], "endless");
    b.storage.failOn = b.storage
      .keys()
      .find((key) => key !== ACCOUNT_SESSION_KEY)!;
    expect(await sync()).toBe("clearFailed");
    expect(calls.filter(({ method }) => method === "PUT")).toEqual([]);
    expect(b.storage.getItem(PROGRESS_REVISION_KEY)).toBeNull();
  });
});

describe("after, between devices", () => {
  async function twoJoined() {
    const a = await device(account);
    on(a);
    await sync();
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
    await sync();
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

    // This page takes it in, then plays on and sends twice: none of it goes.
    const b = await device(account);
    on(b);
    await sync();
    saveRounds([...loadRounds("endless"), ost(7)], "endless");
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
    await sync();
    saveRounds([ost(0)], "endless");
    await sync();
    db.sqlite.prepare("UPDATE progress SET format = 3").run();

    const b = await device(account);
    on(b);
    expect(await sync()).toBe("newerFormat");
    expect(loadRounds("endless")).toEqual([]);
    expect(revision()).toBe(1);
    expect(b.storage.getItem(PROGRESS_REVISION_KEY)).toBeNull();
  });
});

describe("what a sync costs", () => {
  async function joined() {
    const a = await device(account);
    on(a);
    await opens();
    saveRounds([ost(0)], "endless");
    await sync(false);
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
    await sync();
    saveRounds([ost(0)], "endless");
    await sync();
    a.storage.setItem(BACKUP_BEFORE_ACCOUNT_KEY, "from before the change");
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
  it("is worked out from the account's progress, never a guest's", async () => {
    const { syncProfile } = await import("./profileSync");
    const a = await device(account);
    on(a);
    await sync();
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
    // The account's two rounds: the guest's one here was deleted.
    expect(JSON.parse(row.summary)).toMatchObject({
      roundsPlayed: 2,
      songsGuessed: 2,
    });
  });
});
