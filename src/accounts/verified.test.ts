// @vitest-environment node
import { beforeEach, describe, expect, it } from "vitest";

import { fakeD1, FakeD1 } from "../test/fakeD1";
import { dayNumber } from "../helpers/daily";
import { verifiedAnswer } from "../helpers/verifiedDaily";
import { students } from "../constants/students";
import { songs } from "../constants/songs";
import { SKIPPED } from "../types/voice";
import {
  MAX_VERIFIED_BODY,
  ROOM_RECEIPT_MS,
  VerifiedView,
} from "../types/verified";
import { AccountsEnv, handle } from "./api";
import { signValue } from "./crypto";
import { tidyAccounts } from "./privacy";
import { makeRoomReceipt, newRoomGameId, RoomReceipt } from "./roomReceipt";
import { changesOf, checkZone, countInSummary, dayInZone } from "./verified";

const WORKER = "http://localhost:8788";
const SITE = "http://localhost:3000";
const NONCE = "abcdefghijklmnop1234";
const HOUR = 60 * 60_000;
const DAY = 24 * HOUR;
const KEY = "test-pass-key";

let db: FakeD1;
let now: number;
let env: AccountsEnv;

beforeEach(() => {
  db = fakeD1();
  // Noon UTC on 2026-10-12: puzzle 16 in UTC and Bangkok alike.
  now = Date.UTC(2026, 9, 12, 12);
  env = {
    db,
    stateKey: "test-state-key",
    roomPassKey: KEY,
    fakeSignIn: true,
    localDev: true,
    now: () => now,
  };
});

function call(
  method: string,
  path: string,
  options: { token?: string; body?: unknown; raw?: string } = {}
): Promise<Response> {
  const headers: Record<string, string> = { Origin: SITE };
  if (options.token) headers.Authorization = `Bearer ${options.token}`;
  if (options.body !== undefined || options.raw !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  return handle(
    new Request(`${WORKER}${path}`, {
      method,
      headers,
      body:
        options.raw ??
        (options.body === undefined ? undefined : JSON.stringify(options.body)),
    }),
    env
  );
}

/** A whole sign-in with the stand-in page; returns the session token. */
async function signIn(who: string): Promise<string> {
  const start = await call(
    "GET",
    `/auth/google/start?${new URLSearchParams({
      nonce: NONCE,
      back: `${SITE}/ost`,
    })}`
  );
  const state = new URL(start.headers.get("Location")!).searchParams.get(
    "state"
  )!;
  const back = await call(
    "GET",
    `/auth/google/callback?${new URLSearchParams({
      state,
      code: `fake:${who}`,
    })}`
  );
  const code = new URLSearchParams(
    new URL(back.headers.get("Location")!).hash.slice(1)
  ).get("auth");
  const session = await call("POST", "/auth/session", { body: { code } });
  return ((await session.json()) as { token: string }).token;
}

async function post(token: string, body: unknown) {
  const response = await call("POST", "/verified", { token, body });
  return {
    status: response.status,
    body: (await response.json()) as Record<string, unknown>,
  };
}

async function view(token: string): Promise<VerifiedView> {
  const response = await call("GET", "/verified", { token });
  expect(response.status).toBe(200);
  return (await response.json()) as VerifiedView;
}

const today = (zone = "UTC") => dayInZone(zone, now);

async function start(
  token: string,
  game = "ost",
  zone = "UTC",
  day = today(zone)
) {
  return post(token, { action: "start", game, day, zone });
}

/** Starts and wins a daily on its day; returns the finish's answer. */
async function win(token: string, game = "ost", zone = "UTC") {
  const started = await start(token, game, zone);
  expect(started.status, JSON.stringify(started.body)).toBe(200);
  return post(token, {
    action: "finish",
    attempt: started.body.attempt,
    guesses: [verifiedAnswer(game as never, today(zone))],
  });
}

const count = (table: string) =>
  (
    db.sqlite.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get() as {
      n: number;
    }
  ).n;

/** An OST song that isn't the day's answer. */
const wrongSong = (day: number) =>
  songs.find(({ themeNo }) => themeNo !== verifiedAnswer("ost", day))!.themeNo;

describe("the tables", () => {
  it("are keyed by their primary keys alone, with no other index", () => {
    const tables = db.sqlite
      .prepare(
        "SELECT name, sql FROM sqlite_master WHERE type = 'table' AND name LIKE 'verified_%'"
      )
      .all() as { name: string; sql: string }[];
    expect(tables.map(({ name }) => name).sort()).toEqual([
      "verified_clock",
      "verified_daily",
      "verified_room",
      "verified_summary",
    ]);
    for (const { sql } of tables) expect(sql).toMatch(/WITHOUT ROWID$/);
    const indexes = db.sqlite
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'index' AND tbl_name LIKE 'verified_%'"
      )
      .all();
    expect(indexes).toEqual([]);
  });
});

describe("the daily's day", () => {
  it("is the page's dayNumber in the page's own zone", () => {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    for (
      let t = Date.UTC(2026, 9, 1);
      t < Date.UTC(2026, 9, 5);
      t += HOUR / 2
    ) {
      expect([t, dayInZone(zone, t)]).toEqual([t, dayNumber(new Date(t))]);
    }
  });

  it("follows each zone's own calendar date", () => {
    // 11:00 UTC on 2 October: the 3rd at UTC+14, still the 2nd at UTC-11.
    const at = Date.UTC(2026, 9, 2, 11);
    expect(dayInZone("UTC", at)).toBe(6);
    expect(dayInZone("Asia/Bangkok", at)).toBe(6);
    expect(dayInZone("Pacific/Kiritimati", at)).toBe(7);
    expect(dayInZone("Pacific/Pago_Pago", at)).toBe(6);
    expect(dayInZone("Pacific/Pago_Pago", Date.UTC(2026, 9, 2, 10, 59))).toBe(
      5
    );
    expect(dayInZone("UTC", Date.UTC(2026, 8, 1))).toBe(1);
  });

  it("turns over at local midnight across summer time", () => {
    // New York leaves summer time on 1 November 2026.
    expect(dayInZone("America/New_York", Date.UTC(2026, 10, 1, 3, 59))).toBe(
      35
    );
    expect(dayInZone("America/New_York", Date.UTC(2026, 10, 1, 4))).toBe(36);
    expect(dayInZone("America/New_York", Date.UTC(2026, 10, 2, 4, 59))).toBe(
      36
    );
    expect(dayInZone("America/New_York", Date.UTC(2026, 10, 2, 5))).toBe(37);
  });

  it("takes only real zone names", () => {
    expect(checkZone("Asia/Bangkok")).toBe("Asia/Bangkok");
    expect(checkZone("UTC")).toBe("UTC");
    for (const bad of [
      "Mars/Base",
      "../etc/passwd",
      "",
      " UTC",
      5,
      null,
      "A".repeat(65),
    ]) {
      expect(checkZone(bad)).toBeNull();
    }
  });
});

describe("starting a verified daily", () => {
  it("issues an attempt before play, and sets the account's zone", async () => {
    const token = await signIn("alice");
    const started = await start(token, "ost", "Asia/Bangkok");
    expect(started).toEqual({
      status: 200,
      body: {
        status: "started",
        attempt: expect.stringMatching(/^16~ost~[a-z2-7]{26}$/),
        day: 16,
      },
    });
    expect(db.sqlite.prepare("SELECT zone FROM verified_clock").get()).toEqual({
      zone: "Asia/Bangkok",
    });
    expect(
      db.sqlite
        .prepare("SELECT day, game, started_at, outcome FROM verified_daily")
        .get()
    ).toEqual({ day: 16, game: "ost", started_at: now, outcome: null });
  });

  it("writes nothing when the page's day isn't the account's", async () => {
    const token = await signIn("alice");
    const wrong = await post(token, {
      action: "start",
      game: "ost",
      day: 15,
      zone: "UTC",
    });
    expect(wrong).toEqual({ status: 409, body: { error: "day", day: 16 } });
    expect(count("verified_clock")).toBe(0);
    expect(count("verified_daily")).toBe(0);
  });

  it("is one attempt per account, day and daily", async () => {
    const alice = await signIn("alice");
    const first = await start(alice);
    // Another of her devices: the same attempt, to finish there.
    const again = await start(alice);
    expect(again.body).toEqual({ ...first.body, status: "open" });
    // Another daily the same day is its own.
    expect((await start(alice, "voice.jp")).body.status).toBe("started");
    // Another account's is its own.
    expect((await start(await signIn("bob"))).body.status).toBe("started");
    expect(count("verified_daily")).toBe(3);

    await post(alice, {
      action: "finish",
      attempt: first.body.attempt,
      guesses: [verifiedAnswer("ost", today())],
    });
    expect((await start(alice)).body).toEqual({
      status: "done",
      outcome: "won",
      tries: 1,
    });
  });

  it("refuses what isn't a daily, a day or a zone", async () => {
    const token = await signIn("alice");
    for (const body of [
      { action: "start", game: "ost.global", day: 16, zone: "UTC" },
      { action: "start", game: "students", day: 16, zone: "UTC" },
      { action: "start", game: "ost", day: 0, zone: "UTC" },
      { action: "start", game: "ost", day: "16", zone: "UTC" },
      { action: "start", game: "ost", day: 16, zone: "Nowhere/City" },
      { action: "start", game: "ost", day: 16 },
      { action: "jump" },
    ]) {
      expect((await post(token, body)).status, JSON.stringify(body)).toBe(400);
    }
    expect(count("verified_daily")).toBe(0);
  });

  it("needs a session, and the site's own pages", async () => {
    const body = JSON.stringify({
      action: "start",
      game: "ost",
      day: 16,
      zone: "UTC",
    });
    expect((await call("POST", "/verified", { raw: body })).status).toBe(401);
    const elsewhere = await handle(
      new Request(`${WORKER}/verified`, {
        method: "POST",
        headers: {
          Origin: "https://example.com",
          "Content-Type": "application/json",
        },
        body,
      }),
      env
    );
    expect(elsewhere.status).toBe(403);
  });
});

describe("the account's zone", () => {
  it("moves east at once", async () => {
    const token = await signIn("alice");
    await win(token, "ost", "UTC");
    // 11:00 UTC the next day: already the day after at UTC+14.
    now = Date.UTC(2026, 9, 13, 11);
    expect(today("UTC")).toBe(17);
    expect(today("Pacific/Kiritimati")).toBe(18);
    const east = await start(token, "ost", "Pacific/Kiritimati", 18);
    expect(east.body).toMatchObject({ status: "started", day: 18 });
    expect(db.sqlite.prepare("SELECT zone FROM verified_clock").get()).toEqual({
      zone: "Pacific/Kiritimati",
    });
  });

  it("won't move west to play a missed day late", async () => {
    const token = await signIn("alice");
    await win(token, "ost", "Asia/Bangkok"); // day 16
    // Day 17 is missed; on day 18 in Bangkok it's still day 17 at UTC-11.
    now = Date.UTC(2026, 9, 14, 6);
    expect(today("Asia/Bangkok")).toBe(18);
    expect(today("Pacific/Pago_Pago")).toBe(17);
    const late = await start(token, "ost", "Pacific/Pago_Pago", 17);
    expect(late).toEqual({ status: 409, body: { error: "day", day: 18 } });
    expect(db.sqlite.prepare("SELECT zone FROM verified_clock").get()).toEqual({
      zone: "Asia/Bangkok",
    });
    // Once that zone's date has caught up, the move is taken.
    now = Date.UTC(2026, 9, 15, 11, 30);
    expect(today("Pacific/Pago_Pago")).toBe(19);
    expect(today("Asia/Bangkok")).toBe(19);
    expect(
      (await start(token, "ost", "Pacific/Pago_Pago", 19)).body.status
    ).toBe("started");
  });

  it("never issues a day before the latest one", async () => {
    const token = await signIn("alice");
    await win(token);
    const account = (
      db.sqlite.prepare("SELECT id FROM accounts").get() as { id: string }
    ).id;
    db.sqlite
      .prepare(
        "INSERT INTO verified_daily (account_id, day, game, attempt_id, started_at) VALUES (?, 17, 'voice.global', ?, ?)"
      )
      .run(account, "a".repeat(26), now);
    expect(await start(token, "lore.jp")).toEqual({
      status: 409,
      body: { error: "behind", day: 17 },
    });
  });
});

describe("finishing a verified daily", () => {
  it("judges the guesses itself and keeps the result", async () => {
    const token = await signIn("alice");
    const started = await start(token);
    now += 42_000;
    const day = today();
    const finished = await post(token, {
      action: "finish",
      attempt: started.body.attempt,
      guesses: [wrongSong(day), null, verifiedAnswer("ost", day)],
    });
    expect(finished).toEqual({
      status: 200,
      body: {
        status: "finished",
        outcome: "won",
        tries: 3,
        time: 42_000,
        timeVerified: true,
      },
    });
    const v = await view(token);
    expect(v.dailies.ost).toEqual({
      played: 1,
      won: 1,
      lost: 0,
      abandoned: 0,
      spread: { 3: 1 },
      streak: 1,
      bestStreak: 1,
      bestTime: 42_000,
      firstDay: 16,
    });
  });

  it("refuses moves the game wouldn't take, and keeps the attempt open", async () => {
    const token = await signIn("alice");
    const started = await start(token, "voice.global");
    const answer = verifiedAnswer("voice.global", today());
    const attempt = started.body.attempt;
    for (const [guesses, reason, at] of [
      [[answer, answer], "over", 1],
      [[999_999_999], "ignored", 0],
      [["Hina"], "shape", 0],
    ] as const) {
      expect(await post(token, { action: "finish", attempt, guesses })).toEqual(
        {
          status: 400,
          body: { error: "invalid", reason, at },
        }
      );
    }
    expect(
      await post(token, { action: "finish", attempt, guesses: [SKIPPED] })
    ).toEqual({
      status: 400,
      body: { error: "unfinished" },
    });
    expect(
      await post(token, { action: "finish", attempt, guesses: "x" })
    ).toEqual({
      status: 400,
      body: { error: "bad" },
    });
    expect(
      db.sqlite.prepare("SELECT outcome FROM verified_daily").get()
    ).toEqual({ outcome: null });
    const lost = await post(token, {
      action: "finish",
      attempt,
      guesses: [SKIPPED, SKIPPED, SKIPPED, SKIPPED],
    });
    expect(lost.body).toMatchObject({
      status: "finished",
      outcome: "lost",
      tries: 4,
    });
  });

  it("counts a finish once, however often it's sent", async () => {
    const token = await signIn("alice");
    const started = await start(token);
    const body = {
      action: "finish",
      attempt: started.body.attempt,
      guesses: [verifiedAnswer("ost", today())],
    };
    const first = await post(token, body);
    now += 5_000;
    const second = await post(token, {
      ...body,
      guesses: [null, null, null, null, null, null],
    });
    expect(second.body).toEqual({ ...first.body, status: "done" });
    expect((await view(token)).dailies.ost).toMatchObject({
      played: 1,
      won: 1,
    });
  });

  it("finds only the account's own attempt", async () => {
    const alice = await signIn("alice");
    const bob = await signIn("bob");
    const started = await start(alice);
    const guesses = [verifiedAnswer("ost", today())];
    expect(
      (
        await post(bob, {
          action: "finish",
          attempt: started.body.attempt,
          guesses,
        })
      ).status
    ).toBe(404);
    const forged = String(started.body.attempt).replace(
      /~[a-z2-7]{26}$/,
      `~${"b".repeat(26)}`
    );
    expect(
      (await post(alice, { action: "finish", attempt: forged, guesses })).status
    ).toBe(404);
    for (const attempt of ["16~ost", "16~nope~" + "a".repeat(26), 7]) {
      expect(
        (await post(alice, { action: "finish", attempt, guesses })).status
      ).toBe(400);
    }
  });

  it("judges Students' give-up as a loss, and times only verified wins", async () => {
    const token = await signIn("alice");
    const day = today();
    const started = await start(token, "lore.global");
    const wrong = students.find(
      ({ id, lore, global }) =>
        lore && global && id !== verifiedAnswer("lore.global", day)
    )!.id;
    const gaveUp = await post(token, {
      action: "finish",
      attempt: started.body.attempt,
      guesses: [wrong],
      gaveUp: true,
    });
    expect(gaveUp.body).toMatchObject({ outcome: "lost", tries: 1 });
    const stats = (await view(token)).dailies["lore.global"];
    expect(stats).toMatchObject({
      played: 1,
      won: 0,
      lost: 1,
      bestTime: null,
      spread: {},
    });
  });
});

describe("late and offline finishes", () => {
  it("takes a finish the next day, with its time unverified", async () => {
    const token = await signIn("alice");
    const started = await start(token, "gameplay.jp");
    const day = today();
    now += DAY;
    const late = await post(token, {
      action: "finish",
      attempt: started.body.attempt,
      guesses: [verifiedAnswer("gameplay.jp", day)],
    });
    expect(late.body).toEqual({
      status: "finished",
      outcome: "won",
      tries: 1,
      time: DAY,
      timeVerified: false,
    });
    expect((await view(token)).dailies["gameplay.jp"]).toMatchObject({
      won: 1,
      bestTime: null,
    });
  });

  it("doesn't time a finish the page says it sent again", async () => {
    const token = await signIn("alice");
    const started = await start(token);
    const finished = await post(token, {
      action: "finish",
      attempt: started.body.attempt,
      guesses: [verifiedAnswer("ost", today())],
      retry: true,
    });
    expect(finished.body).toMatchObject({
      outcome: "won",
      timeVerified: false,
    });
    expect(
      await post(token, {
        action: "finish",
        attempt: started.body.attempt,
        guesses: [],
        retry: "yes",
      })
    ).toMatchObject({ status: 400 });
  });

  it("closes an attempt past its deadline as abandoned, and refuses it after", async () => {
    const token = await signIn("alice");
    const started = await start(token);
    const day = today();
    now += 2 * DAY;
    const body = {
      action: "finish",
      attempt: started.body.attempt,
      guesses: [verifiedAnswer("ost", day)],
    };
    expect(await post(token, body)).toEqual({
      status: 409,
      body: { error: "late" },
    });
    expect(await post(token, body)).toEqual({
      status: 409,
      body: { error: "closed" },
    });
    expect((await view(token)).dailies.ost).toMatchObject({
      played: 1,
      won: 0,
      lost: 0,
      abandoned: 1,
    });
  });
});

describe("closing attempts lazily", () => {
  it("leaves yesterday's open attempt finishable, and closes older ones at the next start", async () => {
    const token = await signIn("alice");
    await start(token, "voice.jp"); // day 16, never finished
    now += DAY;
    await start(token); // day 17
    expect(
      db.sqlite
        .prepare("SELECT outcome FROM verified_daily WHERE day = 16")
        .get()
    ).toEqual({ outcome: null });
    now += DAY;
    await start(token); // day 18
    expect(
      db.sqlite
        .prepare("SELECT outcome FROM verified_daily WHERE day = 16")
        .get()
    ).toEqual({ outcome: "abandoned" });
    // Day 17's is still finishable on day 18.
    expect(
      db.sqlite
        .prepare("SELECT outcome FROM verified_daily WHERE day = 17")
        .get()
    ).toEqual({ outcome: null });
    expect((await view(token)).dailies["voice.jp"]).toMatchObject({
      played: 1,
      abandoned: 1,
    });
  });

  it("closes them when the stats are read, after any absence", async () => {
    const token = await signIn("alice");
    await start(token, "halo.global");
    await start(token, "weapon.jp");
    now += 40 * DAY;
    const v = await view(token);
    expect(v.dailies["halo.global"]).toMatchObject({
      played: 1,
      abandoned: 1,
      streak: 0,
    });
    expect(v.dailies["weapon.jp"]).toMatchObject({ played: 1, abandoned: 1 });
    // Read again: counted once.
    expect((await view(token)).dailies["halo.global"]).toMatchObject({
      played: 1,
    });
  });
});

describe("verified streaks", () => {
  it("count days won in a row; today not yet played doesn't break one", async () => {
    const token = await signIn("alice");
    for (let i = 0; i < 3; i++) {
      await win(token);
      now += DAY;
    }
    let v = await view(token);
    expect(v.dailies.ost).toMatchObject({
      streak: 3,
      bestStreak: 3,
      played: 3,
    });
    now += DAY; // a day missed
    v = await view(token);
    expect(v.dailies.ost).toMatchObject({ streak: 0, bestStreak: 3 });
    await win(token);
    expect((await view(token)).dailies.ost).toMatchObject({
      streak: 1,
      bestStreak: 3,
    });
  });

  it("break on a loss", async () => {
    const token = await signIn("alice");
    await win(token);
    now += DAY;
    const started = await start(token);
    await post(token, {
      action: "finish",
      attempt: started.body.attempt,
      guesses: [null, null, null, null, null, null],
    });
    expect((await view(token)).dailies.ost).toMatchObject({
      streak: 0,
      bestStreak: 1,
      lost: 1,
    });
  });

  it("join up when yesterday's is finished late", async () => {
    const token = await signIn("alice");
    const yesterday = await start(token); // day 16, left open
    now += DAY;
    // Open yesterday doesn't break today's.
    await win(token); // day 17
    expect((await view(token)).dailies.ost).toMatchObject({ streak: 1 });
    await post(token, {
      action: "finish",
      attempt: yesterday.body.attempt,
      guesses: [verifiedAnswer("ost", 16)],
    });
    expect((await view(token)).dailies.ost).toMatchObject({
      streak: 2,
      bestStreak: 2,
    });
  });

  it("go back further than a page of days", async () => {
    const token = await signIn("alice");
    for (let i = 0; i < 70; i++) {
      await win(token);
      now += DAY;
    }
    expect((await view(token)).dailies.ost).toMatchObject({
      streak: 70,
      bestStreak: 70,
      won: 70,
    });
  });
});

describe("room receipts", () => {
  async function receiptFor(token: string, change: Partial<RoomReceipt> = {}) {
    const { publicId } = (await (
      await call("GET", "/me", { token })
    ).json()) as { publicId: string };
    return makeRoomReceipt(
      {
        gameId: newRoomGameId(),
        publicId,
        game: "ost",
        answers: "typed",
        rounds: 10,
        players: 4,
        place: 1,
        score: 8,
        endedAt: now - 60_000,
        ...change,
      },
      KEY
    );
  }

  it("count a signed result for its own account, once", async () => {
    const token = await signIn("alice");
    const receipt = await receiptFor(token);
    expect(await post(token, { action: "room", receipt })).toEqual({
      status: 200,
      body: { status: "counted" },
    });
    expect(await post(token, { action: "room", receipt })).toEqual({
      status: 200,
      body: { status: "already" },
    });
    await post(token, {
      action: "room",
      receipt: await receiptFor(token, { place: 3, game: "halo" }),
    });
    expect((await view(token)).rooms).toEqual({
      played: 2,
      first: 1,
      places: { 1: 1, 3: 1 },
      firstDay: 16,
    });
    expect(count("verified_room")).toBe(2);
  });

  it("refuse another account's receipt, however valid its signature", async () => {
    const alice = await signIn("alice");
    const bob = await signIn("bob");
    const hers = await receiptFor(alice);
    expect(await post(bob, { action: "room", receipt: hers })).toEqual({
      status: 403,
      body: { error: "notYours" },
    });
    expect(count("verified_room")).toBe(0);
    expect((await view(bob)).rooms).toBeNull();
  });

  it("refuse a receipt changed, expired, from the future, out of range or signed otherwise", async () => {
    const token = await signIn("alice");
    const { publicId } = (await (
      await call("GET", "/me", { token })
    ).json()) as { publicId: string };
    const good = await receiptFor(token);
    const [body, signature] = good.split(".");
    const fields = {
      g: newRoomGameId(),
      p: publicId,
      k: "ost",
      a: "typed",
      r: 10,
      n: 4,
      o: 1,
      s: 8,
      t: now,
      e: now + ROOM_RECEIPT_MS,
    };
    const signed = (
      change: Record<string, unknown>,
      kind = "room-result",
      key = KEY
    ) => signValue(kind, { ...fields, ...change }, key);
    const bad = [
      `${body}x.${signature}`,
      await receiptFor(token, { endedAt: now - ROOM_RECEIPT_MS - 1 }),
      await receiptFor(token, { endedAt: now + HOUR }),
      await receiptFor(token, { place: 5 }),
      await receiptFor(token, { score: 11 }),
      await receiptFor(token, { players: 9 }),
      await receiptFor(token, { rounds: 4 }),
      await signed({ k: "students" }),
      await signed({ e: now + 30 * DAY }),
      await signed({ g: "short" }),
      await signed({}, "room"),
      await signed({}, "room-result", "another-key"),
      12345,
      "x".repeat(2000),
    ];
    for (const receipt of bad) {
      expect((await post(token, { action: "room", receipt })).status).toBe(400);
    }
    expect(count("verified_room")).toBe(0);
    expect(
      (await post(token, { action: "room", receipt: await signed({}) })).status
    ).toBe(200);
  });

  it("aren't taken without the rooms' key", async () => {
    const token = await signIn("alice");
    const receipt = await receiptFor(token);
    env.roomPassKey = undefined;
    expect(await post(token, { action: "room", receipt })).toEqual({
      status: 503,
      body: { error: "unavailable" },
    });
  });
});

describe("a summary", () => {
  it("counts only a write that changed a row: two finishes racing count once", async () => {
    const token = await signIn("alice");
    await start(token);
    const account = (
      db.sqlite.prepare("SELECT id FROM accounts").get() as { id: string }
    ).id;
    const finish = () =>
      db.batch([
        db
          .prepare(
            `UPDATE verified_daily SET outcome = 'won', tries = 1, finished_at = ?
             WHERE account_id = ? AND day = 16 AND game = 'ost' AND outcome IS NULL`
          )
          .bind(now, account),
        countInSummary(db, account, "ost", {
          won: true,
          abandoned: false,
          key: "1",
          streak: 1,
          time: 1000,
          day: 16,
        }),
      ]);
    // Both pass their checks before either writes; the second changes nothing.
    const [first, second] = [await finish(), await finish()];
    expect(changesOf(first[0])).toBe(1);
    expect(changesOf(second[0])).toBe(0);
    expect(
      db.sqlite
        .prepare("SELECT played, won, spread FROM verified_summary")
        .get()
    ).toEqual({ played: 1, won: 1, spread: '{"1":1}' });
  });
});

describe("verified data apart from the saves", () => {
  it("starts empty: a save sent up never becomes verified", async () => {
    const token = await signIn("alice");
    const put = await handle(
      new Request(`${WORKER}/me/progress`, {
        method: "PUT",
        headers: {
          Origin: SITE,
          Authorization: `Bearer ${token}`,
          "X-Base": "0",
          "X-Format": "2",
        },
        body: new Uint8Array([31, 139, 8, 0]),
      }),
      env
    );
    expect(put.status).toBe(200);
    expect(await view(token)).toEqual({
      zone: null,
      today: null,
      since: null,
      dailies: {},
      rooms: null,
    });
    for (const table of [
      "verified_clock",
      "verified_daily",
      "verified_summary",
      "verified_room",
    ]) {
      expect(count(table)).toBe(0);
    }
  });

  it("never touches the progress or the profile", async () => {
    const token = await signIn("alice");
    await win(token);
    expect(count("progress")).toBe(0);
    expect(count("profiles")).toBe(0);
  });

  it("goes with the account, deleted or unused for two years", async () => {
    const alice = await signIn("alice");
    await win(alice);
    const bob = await signIn("bob");
    await win(bob);
    expect((await call("DELETE", "/me", { token: alice })).status).toBe(204);
    expect(count("verified_daily")).toBe(1);
    expect(count("verified_clock")).toBe(1);
    now += 731 * DAY;
    await tidyAccounts(db, now);
    for (const table of [
      "verified_clock",
      "verified_daily",
      "verified_summary",
      "verified_room",
    ]) {
      expect(count(table)).toBe(0);
    }
  });

  it("takes no body over its limit", async () => {
    const token = await signIn("alice");
    const raw = JSON.stringify({
      action: "start",
      pad: "x".repeat(MAX_VERIFIED_BODY),
    });
    expect((await call("POST", "/verified", { token, raw })).status).toBe(413);
    expect(
      (await call("POST", "/verified", { token, raw: "{nope" })).status
    ).toBe(400);
    expect(
      (await call("POST", "/verified", { token, raw: "[1]" })).status
    ).toBe(400);
  });
});
