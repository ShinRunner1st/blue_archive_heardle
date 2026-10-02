// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { verifiedAnswer } from "../helpers/verifiedDaily";
import { fakeD1, FakeD1 } from "../test/fakeD1";
import {
  PROFILE_TICKET_MS,
  ProfileSummary,
  ProfileViewAnswer,
} from "../types/account";
import { AccountsEnv, handle } from "./api";
import { signValue } from "./crypto";
import { makeProfileTicket, readProfileTicket } from "./profileTicket";
import { makeRoomReceipt, newRoomGameId } from "./roomReceipt";
import { readRoomPass } from "./roomPass";
import { dayInZone } from "./verified";

/*
 * Profiles from a card (docs/room-profiles.md), the accounts Worker's side:
 * the room's ticket, the view it opens, and the Account tab's switch.
 */

const WORKER = "http://localhost:8788";
const SITE = "http://localhost:3000";
const NONCE = "abcdefghijklmnop1234";
const KEY = "test-pass-key";

let db: FakeD1;
let now: number;
let env: AccountsEnv;

beforeEach(() => {
  db = fakeD1();
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
  options: {
    token?: string;
    body?: unknown;
    raw?: string;
    origin?: string;
  } = {}
): Promise<Response> {
  const headers: Record<string, string> = { Origin: options.origin ?? SITE };
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

async function publicIdOf(token: string): Promise<string> {
  const response = await call("GET", "/me", { token });
  return ((await response.json()) as { publicId: string }).publicId;
}

const SUMMARY: ProfileSummary = {
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
  server: "global",
};

/** An account with a profile, a verified daily won, and a room counted. */
async function fullAccount(who: string) {
  const token = await signIn(who);
  await call("PUT", "/me/profile", {
    token,
    body: {
      name: "Shin",
      sensei: true,
      student: 10004,
      title: "dependable",
      banner: "sakura",
      frame: "gold",
      background: "cherry",
      cardColors: "schale",
      editedAt: now,
      summary: SUMMARY,
    },
  });
  const day = dayInZone("UTC", now);
  const started = await call("POST", "/verified", {
    token,
    body: { action: "start", game: "ost", day, zone: "UTC" },
  });
  const { attempt } = (await started.json()) as { attempt: string };
  await call("POST", "/verified", {
    token,
    body: {
      action: "finish",
      attempt,
      guesses: [verifiedAnswer("ost", day)],
    },
  });
  const publicId = await publicIdOf(token);
  await call("POST", "/verified", {
    token,
    body: {
      action: "room",
      receipt: await makeRoomReceipt(
        {
          gameId: newRoomGameId(),
          publicId,
          game: "voice",
          answers: "typed",
          rounds: 10,
          players: 4,
          place: 1,
          score: 8,
          endedAt: now,
        },
        KEY
      ),
    },
  });
  return { token, publicId };
}

async function look(ticket: unknown, origin?: string) {
  const response = await call("POST", "/profile-view", {
    body: { ticket },
    origin,
  });
  return {
    status: response.status,
    body: (await response.json().catch(() => null)) as ProfileViewAnswer | null,
  };
}

describe("the room's profile ticket", () => {
  it("is read back for its public id until it runs out", async () => {
    const ticket = await makeProfileTicket("abcdefghijklmnop", KEY, now);
    expect(await readProfileTicket(ticket, KEY, now)).toBe("abcdefghijklmnop");
    expect(await readProfileTicket(ticket, KEY, now + PROFILE_TICKET_MS)).toBe(
      "abcdefghijklmnop"
    );
    expect(
      await readProfileTicket(ticket, KEY, now + PROFILE_TICKET_MS + 1)
    ).toBeNull();
  });

  it("can't be made of anything else signed with the key, or another key", async () => {
    const value = { p: "abcdefghijklmnop", e: now + 60_000 };
    for (const kind of ["room", "room-result", "link", "state"]) {
      expect(
        await readProfileTicket(await signValue(kind, value, KEY), KEY, now)
      ).toBeNull();
    }
    const ticket = await makeProfileTicket("abcdefghijklmnop", "other", now);
    expect(await readProfileTicket(ticket, KEY, now)).toBeNull();
    // Changed, or not a ticket at all.
    const good = await makeProfileTicket("abcdefghijklmnop", KEY, now);
    const [body, signature] = good.split(".");
    expect(
      await readProfileTicket(`${body}x.${signature}`, KEY, now)
    ).toBeNull();
    for (const bad of [undefined, 7, "", "a.b", "x".repeat(300)]) {
      expect(await readProfileTicket(bad, KEY, now)).toBeNull();
    }
  });

  it("refuses one from further ahead than a room's clock could be", async () => {
    const ahead = await signValue(
      "profile-view",
      { p: "abcdefghijklmnop", e: now + PROFILE_TICKET_MS + 2 * 60_000 },
      KEY
    );
    expect(await readProfileTicket(ahead, KEY, now)).toBeNull();
    const badId = await signValue(
      "profile-view",
      { p: "NOT-A-PUBLIC-ID!", e: now + 60_000 },
      KEY
    );
    expect(await readProfileTicket(badId, KEY, now)).toBeNull();
  });
});

describe("POST /profile-view", () => {
  it("shows the summary, labelled by the page, and the verified totals", async () => {
    const { publicId } = await fullAccount("alice");
    const seen = await look(await makeProfileTicket(publicId, KEY, now));
    expect(seen.status).toBe(200);
    expect(seen.body).toEqual({
      summary: SUMMARY,
      verified: {
        since: dayInZone("UTC", now),
        dailies: {
          ost: expect.objectContaining({ played: 1, won: 1, bestStreak: 1 }),
        },
        rooms: expect.objectContaining({ played: 1, first: 1 }),
      },
    });
    // No current streaks, time zone, today, ids or anything of the sign-in.
    const text = JSON.stringify(seen.body);
    expect(text).not.toMatch(/"streak"|"zone"|"today"|publicId|identities/);
    expect(text).not.toContain(publicId);
  });

  it("needs no session, so guests in the room can look", async () => {
    const { publicId } = await fullAccount("alice");
    const response = await handle(
      new Request(`${WORKER}/profile-view`, {
        method: "POST",
        headers: { Origin: SITE, "Content-Type": "application/json" },
        body: JSON.stringify({
          ticket: await makeProfileTicket(publicId, KEY, now),
        }),
      }),
      env
    );
    expect(response.status).toBe(200);
  });

  it("shows an account with no profile or verified record yet", async () => {
    const token = await signIn("bob");
    const seen = await look(
      await makeProfileTicket(await publicIdOf(token), KEY, now)
    );
    expect(seen).toEqual({
      status: 200,
      body: {
        summary: null,
        verified: { since: null, dailies: {}, rooms: null },
      },
    });
  });

  it("answers nothing for a bad, expired, unknown or hidden one", async () => {
    const { token, publicId } = await fullAccount("alice");
    expect((await look("not.a-ticket")).status).toBe(404);
    expect(
      (
        await look(
          await makeProfileTicket(publicId, KEY, now - PROFILE_TICKET_MS - 1)
        )
      ).status
    ).toBe(404);
    expect(
      (await look(await makeProfileTicket("aaaaaaaaaaaaaaaa", KEY, now))).status
    ).toBe(404);
    // Hidden after the ticket was made: hidden at once.
    const ticket = await makeProfileTicket(publicId, KEY, now);
    const off = await call("PUT", "/me/profile-shown", {
      token,
      body: { shown: false },
    });
    expect(await off.json()).toEqual({ shown: false });
    const hidden = await look(ticket);
    expect(hidden).toEqual({ status: 404, body: { error: "notFound" } });
  });

  it("reads and writes nothing it shouldn't", async () => {
    const { publicId } = await fullAccount("alice");
    const ticket = await makeProfileTicket(publicId, KEY, now);
    const prepare = vi.spyOn(db, "prepare");
    await look(ticket);
    const sql = prepare.mock.calls.map(([text]) => String(text));
    expect(sql).toHaveLength(3);
    expect(sql.join(" ")).not.toMatch(/INSERT|UPDATE|DELETE|sessions/i);
  });

  it("is the site's pages only, needs the rooms' key, and takes no big body", async () => {
    const { publicId } = await fullAccount("alice");
    const ticket = await makeProfileTicket(publicId, KEY, now);
    expect((await look(ticket, "https://evil.example")).status).toBe(403);
    const big = await call("POST", "/profile-view", {
      raw: JSON.stringify({ ticket, pad: "x".repeat(2000) }),
    });
    expect(big.status).toBe(413);
    env.roomPassKey = undefined;
    expect((await look(ticket)).status).toBe(503);
  });
});

describe("the Account tab's switch", () => {
  it("is on for every account, and turns off and on again", async () => {
    const token = await signIn("alice");
    const me = async () =>
      (
        (await (await call("GET", "/me", { token })).json()) as {
          profileShown: boolean;
        }
      ).profileShown;
    expect(await me()).toBe(true);
    await call("PUT", "/me/profile-shown", { token, body: { shown: false } });
    expect(await me()).toBe(false);
    await call("PUT", "/me/profile-shown", { token, body: { shown: true } });
    expect(await me()).toBe(true);
  });

  it("takes only a yes or no, and a session", async () => {
    const token = await signIn("alice");
    for (const shown of ["no", 0, null, undefined]) {
      const response = await call("PUT", "/me/profile-shown", {
        token,
        body: { shown },
      });
      expect(response.status).toBe(400);
    }
    expect(
      (await call("PUT", "/me/profile-shown", { body: { shown: false } }))
        .status
    ).toBe(401);
  });

  it("rides on the room pass, so a room neither marks nor signs for it", async () => {
    const token = await signIn("alice");
    const passOf = async () => {
      const response = await call("GET", "/room-pass", { token });
      const { pass } = (await response.json()) as { pass: string };
      return readRoomPass(pass, KEY, now);
    };
    expect(await passOf()).not.toHaveProperty("hidden");
    await call("PUT", "/me/profile-shown", { token, body: { shown: false } });
    expect(await passOf()).toMatchObject({ hidden: true });
  });

  it("is in Download my data", async () => {
    const token = await signIn("alice");
    await call("PUT", "/me/profile-shown", { token, body: { shown: false } });
    const data = (await (await call("GET", "/me/data", { token })).json()) as {
      account: { profileShownInRooms: boolean };
    };
    expect(data.account.profileShownInRooms).toBe(false);
  });
});
