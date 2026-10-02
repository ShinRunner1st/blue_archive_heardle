// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { AccountsEnv, handle } from "../accounts/api";
import { makeRoomReceipt, newRoomGameId } from "../accounts/roomReceipt";
import { createAccount, createSession } from "../accounts/store";
import { dayInZone } from "../accounts/verified";
import { ACCOUNT_SESSION_KEY, VERIFIED_KEY } from "../constants/game";
import { fakeD1, FakeD1 } from "../test/fakeD1";
import { MemoryStorage } from "../test/memoryStorage";
import { ROOM_RECEIPT_MS } from "../types/verified";
import { resetAccountClientState, signOut } from "./accountClient";
import { currentSave } from "./saveFile";
import { loadRounds } from "./storage";
import { DailyMoves, verifiedAnswer, VerifiedDaily } from "./verifiedDaily";
import {
  entryOf,
  keepReceipt,
  readVerifiedStore,
  resetVerifiedState,
  verifiedRoundOver,
  verifiedSettled,
  verifiedStart,
} from "./verifiedPlay";
import { syncVerified } from "./verifiedSync";

/*
 * The page's verified play against the accounts Worker's own code and
 * tables (docs/verified-stats.md, sections 5, 6 and 8): what's sent, when,
 * what comes of it, and that none of it touches the saves.
 */

const SITE = "http://localhost:3000";
const DAY_MS = 24 * 60 * 60_000;
const ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

let db: FakeD1;
let env: AccountsEnv;
let now: number;
let online: boolean;
/** Every `/verified` request the page made, by its action. */
let calls: string[];
const realFetch = globalThis.fetch;

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
  resetAccountClientState();
  resetVerifiedState();
}

async function device(account?: string): Promise<Device> {
  const made = { storage: new MemoryStorage(), session: new MemoryStorage() };
  if (account) {
    made.storage.setItem(
      ACCOUNT_SESSION_KEY,
      await createSession(db, account, now)
    );
  }
  return made;
}

/** The account's day, as the page in this zone counts it. */
const today = () => dayInZone(ZONE, now);

/** The OST's daily named first try, or six skips. */
const ostMoves = (day: number, won = true): DailyMoves => ({
  guesses: won
    ? [verifiedAnswer("ost", day)]
    : [null, null, null, null, null, null],
});

const rows = () =>
  db.sqlite
    .prepare(
      "SELECT game, day, outcome, tries, time_verified FROM verified_daily"
    )
    .all() as Array<{
    game: string;
    day: number;
    outcome: string | null;
    tries: number | null;
    time_verified: number | null;
  }>;

/** Plays a daily through: its start, then its end with `moves`. */
async function play(daily: VerifiedDaily, day: number, moves: DailyMoves) {
  verifiedStart(daily, day, true);
  await verifiedSettled();
  verifiedRoundOver(daily, day, () => moves);
  await verifiedSettled();
}

let account: string;

beforeEach(async () => {
  db = fakeD1();
  now = Date.UTC(2026, 9, 12, 12);
  online = true;
  calls = [];
  env = {
    db,
    stateKey: "test-key",
    roomPassKey: "test-pass-key",
    localDev: true,
    now: () => now,
  };
  account = await createAccount(db, "google", "alice", now);
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    if (!online) throw new TypeError("Failed to fetch");
    const request = new Request(input, init);
    if (request.url.endsWith("/verified") && request.method === "POST") {
      const body = (await request.clone().json()) as { action: string };
      calls.push(body.action);
    }
    const headers = new Headers(request.headers);
    headers.set("Origin", SITE);
    return handle(new Request(request, { headers }), env);
  }) as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = realFetch;
});

describe("a guest", () => {
  it("plays every daily as now: nothing sent, nothing kept", async () => {
    on(await device());
    verifiedStart("ost", today(), true);
    verifiedRoundOver("ost", today(), () => ostMoves(today()));
    keepReceipt("a.b");
    await verifiedSettled();
    expect(calls).toEqual([]);
    expect(localStorage.getItem(VERIFIED_KEY)).toBeNull();
  });
});

describe("a signed-in daily", () => {
  it("is issued as it first plays, and judged by the server at its end", async () => {
    on(await device(account));
    verifiedStart("ost", today(), true);
    await verifiedSettled();
    expect(entryOf("ost", today())).toMatchObject({ state: "playing" });
    expect(rows()).toEqual([
      expect.objectContaining({ game: "ost", day: today(), outcome: null }),
    ]);

    verifiedRoundOver("ost", today(), () => ostMoves(today()));
    await verifiedSettled();
    expect(entryOf("ost", today())).toMatchObject({
      state: "verified",
      outcome: "won",
      tries: 1,
      timeVerified: true,
    });
    expect(rows()[0]).toMatchObject({ outcome: "won", tries: 1 });
    expect(calls).toEqual(["start", "finish"]);
    // Nothing kept once it's taken but the result to show.
    expect(entryOf("ost", today())?.moves).toBeUndefined();
  });

  it("judges a Students give-up as lost", async () => {
    on(await device(account));
    await play("lore.global", today(), { guesses: [], gaveUp: true });
    expect(entryOf("lore.global", today())).toMatchObject({
      state: "verified",
      outcome: "lost",
    });
  });

  it("is never asked for twice, nor for a daily already played here", async () => {
    on(await device(account));
    verifiedStart("ost", today(), true);
    verifiedStart("ost", today(), true);
    // Voice's daily, with guesses saved before signing in: personal.
    verifiedStart("voice.global", today(), false);
    verifiedRoundOver("voice.global", today(), () => ({ guesses: [0] }));
    await verifiedSettled();
    expect(calls).toEqual(["start"]);
    expect(entryOf("voice.global", today())).toBeUndefined();
    expect(rows()).toHaveLength(1);
  });

  it("stays apart from the saves, the save file and their sync", async () => {
    on(await device(account));
    const before = JSON.stringify(currentSave());
    await play("ost", today(), ostMoves(today()));
    expect(JSON.stringify(currentSave())).toBe(before);
    expect(JSON.stringify(currentSave())).not.toContain("verified");
    expect(loadRounds("daily")).toEqual([]);
    const attempt = entryOf("ost", today())?.attempt ?? "";
    expect(JSON.stringify(currentSave())).not.toContain(attempt.split("~")[2]);
  });

  it("stays personal, with nothing written, when the page's day isn't the account's", async () => {
    on(await device(account));
    verifiedStart("ost", today() + 1, true);
    await verifiedSettled();
    expect(entryOf("ost", today() + 1)).toMatchObject({
      state: "personal",
      why: "day",
    });
    verifiedRoundOver("ost", today() + 1, () => ostMoves(today() + 1));
    await verifiedSettled();
    expect(calls).toEqual(["start"]);
    expect(rows()).toEqual([]);
  });

  it("stays personal for good when its start can't reach the account", async () => {
    on(await device(account));
    online = false;
    verifiedStart("ost", today(), true);
    await verifiedSettled();
    expect(entryOf("ost", today())).toMatchObject({
      state: "personal",
      why: "offline",
    });
    // Back online, its end sends nothing, and nothing asks again.
    online = true;
    verifiedStart("ost", today(), true);
    verifiedRoundOver("ost", today(), () => ostMoves(today()));
    await syncVerified();
    await verifiedSettled();
    expect(calls).toEqual([]);
    expect(rows()).toEqual([]);
  }, 15_000);

  it("keeps a finish made offline, and sends it later, its time not counted", async () => {
    on(await device(account));
    verifiedStart("ost", today(), true);
    await verifiedSettled();
    online = false;
    verifiedRoundOver("ost", today(), () => ostMoves(today()));
    await verifiedSettled();
    expect(entryOf("ost", today())).toMatchObject({
      state: "finishing",
      sent: true,
    });
    // Kept across a reload, and sent as the page comes back online the
    // next day, within its deadline.
    online = true;
    now += DAY_MS;
    resetVerifiedState();
    await syncVerified();
    expect(entryOf("ost", today() - 1)).toMatchObject({
      state: "verified",
      outcome: "won",
      timeVerified: false,
    });
    expect(rows()[0]).toMatchObject({ outcome: "won", time_verified: 0 });
  });

  it("is closed as abandoned when its finish comes after its deadline", async () => {
    on(await device(account));
    const day = today();
    verifiedStart("ost", day, true);
    await verifiedSettled();
    online = false;
    verifiedRoundOver("ost", day, () => ostMoves(day));
    await verifiedSettled();
    online = true;
    now += 2 * DAY_MS;
    await syncVerified();
    expect(entryOf("ost", day)).toMatchObject({
      state: "personal",
      why: "late",
    });
    expect(rows()[0]).toMatchObject({ outcome: "abandoned" });
  });

  it("isn't sent when the rules refuse the round", async () => {
    on(await device(account));
    await play("ost", today(), { guesses: ["not a song"] });
    expect(entryOf("ost", today())).toMatchObject({
      state: "personal",
      why: "refused",
    });
    expect(calls).toEqual(["start"]);
  });

  it("played verified on another device: this one plays it personally", async () => {
    const phone = await device(account);
    on(phone);
    await play("ost", today(), ostMoves(today(), false));

    on(await device(account));
    verifiedStart("ost", today(), true);
    await verifiedSettled();
    expect(entryOf("ost", today())).toMatchObject({
      state: "elsewhere",
      outcome: "lost",
    });
    verifiedRoundOver("ost", today(), () => ostMoves(today()));
    await verifiedSettled();
    expect(rows()[0]).toMatchObject({ outcome: "lost" });
  });

  it("started on one device can be finished on another", async () => {
    const phone = await device(account);
    on(phone);
    verifiedStart("ost", today(), true);
    await verifiedSettled();

    on(await device(account));
    await play("ost", today(), ostMoves(today()));
    expect(entryOf("ost", today())).toMatchObject({ state: "verified" });
    expect(rows()).toEqual([expect.objectContaining({ outcome: "won" })]);
  });

  it("is forgotten when the session changes", async () => {
    on(await device(account));
    verifiedStart("ost", today(), true);
    await verifiedSettled();
    await signOut();
    expect(readVerifiedStore().entries).toEqual([]);
    expect(localStorage.getItem(VERIFIED_KEY)).toBeNull();
  });
});

describe("room receipts", () => {
  const publicId = () =>
    (
      db.sqlite
        .prepare("SELECT public_id FROM accounts WHERE id = ?")
        .get(account) as { public_id: string }
    ).public_id;

  const receiptFor = (who: string, endedAt = now) =>
    makeRoomReceipt(
      {
        gameId: newRoomGameId(),
        publicId: who,
        game: "ost",
        answers: "typed",
        rounds: 10,
        players: 4,
        place: 1,
        score: 7,
        endedAt,
      },
      "test-pass-key"
    );

  const roomRows = () =>
    (
      db.sqlite.prepare("SELECT COUNT(*) AS n FROM verified_room").get() as {
        n: number;
      }
    ).n;

  it("are taken by the account once, however often they come", async () => {
    on(await device(account));
    const receipt = await receiptFor(publicId());
    keepReceipt(receipt);
    keepReceipt(receipt);
    await verifiedSettled();
    expect(calls).toEqual(["room"]);
    expect(roomRows()).toBe(1);
    expect(readVerifiedStore().receipts).toEqual([]);
    // The room sends it again (a reload at the standings): already counted.
    keepReceipt(receipt);
    await verifiedSettled();
    expect(roomRows()).toBe(1);
    expect(readVerifiedStore().receipts).toEqual([]);
  });

  it("are kept while the account can't be reached", async () => {
    on(await device(account));
    online = false;
    const receipt = await receiptFor(publicId());
    keepReceipt(receipt);
    await verifiedSettled();
    expect(readVerifiedStore().receipts).toEqual([receipt]);
    online = true;
    await syncVerified();
    expect(roomRows()).toBe(1);
    expect(readVerifiedStore().receipts).toEqual([]);
  });

  it("are dropped when another account's, or run out, the second unsent", async () => {
    on(await device(account));
    keepReceipt(await receiptFor("aaaaaaaaaaaaaaaa"));
    await verifiedSettled();
    expect(roomRows()).toBe(0);
    // Run out by the page's own clock, which decides what it sends.
    keepReceipt(
      await receiptFor(publicId(), Date.now() - ROOM_RECEIPT_MS - 1000)
    );
    await verifiedSettled();
    expect(calls).toEqual(["room"]);
    expect(readVerifiedStore().receipts).toEqual([]);
  });
});
