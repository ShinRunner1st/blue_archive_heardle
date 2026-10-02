// @vitest-environment node
import zlib from "node:zlib";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { fakeD1, FakeD1 } from "../test/fakeD1";
import { DEFAULT_LOOK } from "../helpers/roomLook";
import { ACCOUNT_UNUSED_DAYS } from "../types/account";
import { ROOM_PASS_MS } from "../types/room";
import { AccountsEnv, handle, pageToReturnTo, SITE_ORIGINS } from "./api";
import { signValue } from "./crypto";
import { tidyAccounts } from "./privacy";
import { verifiedAnswer } from "../helpers/verifiedDaily";
import { makeRoomReceipt, newRoomGameId } from "./roomReceipt";
import { readRoomPass } from "./roomPass";
import { dayInZone } from "./verified";

const WORKER = "http://localhost:8788";
const SITE = "http://localhost:3000";
const PAGE = `${SITE}/ost`;
const NONCE = "abcdefghijklmnop1234";
const DAY = 24 * 60 * 60_000;

let db: FakeD1;
let now: number;
let env: AccountsEnv;

beforeEach(() => {
  db = fakeD1();
  now = Date.UTC(2026, 9, 2, 12);
  // As `npm run accounts` runs it: stand-in sign-in pages, and a local dev
  // server's pages let in. "Where pages may come from" tests the deployed one.
  env = {
    db,
    stateKey: "test-state-key",
    fakeSignIn: true,
    localDev: true,
    now: () => now,
  };
});

function call(
  method: string,
  path: string,
  options: { token?: string; body?: unknown; origin?: string | null } = {}
): Promise<Response> {
  const headers: Record<string, string> = {};
  if (options.origin !== null) headers.Origin = options.origin ?? SITE;
  if (options.token) headers.Authorization = `Bearer ${options.token}`;
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  return handle(
    new Request(`${WORKER}${path}`, {
      method,
      headers,
      body:
        options.body === undefined ? undefined : JSON.stringify(options.body),
    }),
    env
  );
}

/** The browser following a redirect: where it goes. */
const location = (response: Response) => {
  expect(response.status).toBe(302);
  return new URL(response.headers.get("Location")!);
};

/** What came back in the page's `#` part. */
const fragment = (response: Response) =>
  Object.fromEntries(new URLSearchParams(location(response).hash.slice(1)));

/** Start a sign-in; returns the signed state the fake page carries. */
async function startSignIn(
  provider = "google",
  extra: Record<string, string> = {}
): Promise<string> {
  const query = new URLSearchParams({ nonce: NONCE, back: PAGE, ...extra });
  const to = location(
    await call("GET", `/auth/${provider}/start?${query}`, { origin: null })
  );
  expect(to.pathname).toBe("/auth/fake");
  return to.searchParams.get("state")!;
}

async function answer(
  provider: string,
  state: string,
  fields: Record<string, string>
): Promise<Response> {
  const query = new URLSearchParams({ state, ...fields });
  return call("GET", `/auth/${provider}/callback?${query}`, { origin: null });
}

/** A whole sign-in as `who` there; returns the session token. */
async function signIn(who: string, provider = "google"): Promise<string> {
  const state = await startSignIn(provider);
  const back = fragment(await answer(provider, state, { code: `fake:${who}` }));
  expect(back.nonce).toBe(NONCE);
  const response = await call("POST", "/auth/session", {
    body: { code: back.auth },
  });
  expect(response.status).toBe(200);
  return ((await response.json()) as { token: string }).token;
}

async function me(token: string) {
  const response = await call("GET", "/me", { token });
  return { status: response.status, body: await response.json() };
}

describe("signing in", () => {
  it("makes an account the first time, and finds it after", async () => {
    const first = await me(await signIn("alice"));
    expect(first.status).toBe(200);
    expect(first.body).toEqual({
      publicId: expect.stringMatching(/^[a-z2-7]{16}$/),
      createdAt: now,
      identities: [{ provider: "google", linkedAt: now }],
      // Shown in rooms by default (docs/room-profiles.md).
      profileShown: true,
    });

    const again = await me(await signIn("alice"));
    expect(again.body.publicId).toBe(first.body.publicId);
    const other = await me(await signIn("bob"));
    expect(other.body.publicId).not.toBe(first.body.publicId);
  });

  it("sends the page back only a one-time code, good for a minute", async () => {
    const state = await startSignIn();
    const back = fragment(
      await answer("google", state, { code: "fake:alice" })
    );
    expect(back.auth).toMatch(/^[a-z2-7]{52}$/);
    expect(
      location(await answer("google", state, { code: "fake:x" })).origin
    ).toBe(SITE);

    const swap = () =>
      call("POST", "/auth/session", { body: { code: back.auth } });
    expect((await swap()).status).toBe(200);
    expect((await swap()).status).toBe(401);

    const late = fragment(
      await answer("google", await startSignIn(), { code: "fake:alice" })
    );
    now += 61_000;
    expect(
      (await call("POST", "/auth/session", { body: { code: late.auth } }))
        .status
    ).toBe(401);
  });

  it("keeps only hashes of tokens and codes", async () => {
    const token = await signIn("alice");
    const rows = JSON.stringify([
      db.sqlite.prepare("SELECT * FROM sessions").all(),
      db.sqlite.prepare("SELECT * FROM sign_in_codes").all(),
      db.sqlite.prepare("SELECT * FROM identities").all(),
    ]);
    expect(rows).not.toContain(token);
    expect(rows).toContain("fake-alice");
    expect(rows).not.toContain("@");
  });

  it("goes back to the site only, and checks the nonce's shape", async () => {
    for (const back of [
      "https://evil.example/ost",
      "javascript:alert(1)",
      "",
    ]) {
      const response = await call(
        "GET",
        `/auth/google/start?${new URLSearchParams({ nonce: NONCE, back })}`,
        { origin: null }
      );
      expect(response.status).toBe(400);
    }
    const bad = await call(
      "GET",
      `/auth/google/start?${new URLSearchParams({ nonce: "x", back: PAGE })}`,
      { origin: null }
    );
    expect(bad.status).toBe(400);
    expect(pageToReturnTo(`${PAGE}#old`, true)).toBe(PAGE);
  });

  it("refuses a changed state, another provider's, or one too old", async () => {
    const state = await startSignIn("google");
    const changed = state.replace(/^./, (c) => (c === "a" ? "b" : "a"));
    expect((await answer("google", changed, { code: "fake:a" })).status).toBe(
      400
    );
    expect((await answer("discord", state, { code: "fake:a" })).status).toBe(
      400
    );
    const forged = await signValue(
      "state",
      { p: "google", n: NONCE, b: PAGE, e: now + 1000 },
      "another-key"
    );
    expect((await answer("google", forged, { code: "fake:a" })).status).toBe(
      400
    );

    now += 11 * 60_000;
    expect(fragment(await answer("google", state, { code: "fake:a" }))).toEqual(
      {
        authError: "expired",
        nonce: NONCE,
      }
    );
  });

  it("says when the player cancelled at the provider", async () => {
    const state = await startSignIn();
    expect(
      fragment(await answer("google", state, { error: "access_denied" }))
    ).toEqual({ authError: "cancelled", nonce: NONCE });
  });

  it("says a provider isn't set up, outside the local stand-in", async () => {
    env.fakeSignIn = false;
    const query = new URLSearchParams({ nonce: NONCE, back: PAGE });
    expect(
      fragment(
        await call("GET", `/auth/discord/start?${query}`, { origin: null })
      )
    ).toEqual({ authError: "unavailable", nonce: NONCE });
  });

  it("is slowed down per address", async () => {
    env.signInLimit = async () => false;
    env.limitKey = "address";
    const query = new URLSearchParams({ nonce: NONCE, back: PAGE });
    expect(
      fragment(
        await call("GET", `/auth/google/start?${query}`, { origin: null })
      )
    ).toEqual({ authError: "slow", nonce: NONCE });
    expect(
      (await call("POST", "/auth/session", { body: { code: "x" } })).status
    ).toBe(429);
  });
});

describe("where pages may come from", () => {
  const LIVE_PAGE = "https://baheardle.com/ost";
  const LOCAL_PAGES = [
    PAGE,
    "http://localhost:5173/",
    "http://127.0.0.1:3000/ost",
    "http://localhost:3000.evil.example/ost",
  ];

  /** As deployed: real sign-in pages, and no local dev server let in. */
  function deployed() {
    env.fakeSignIn = false;
    env.localDev = false;
    env.google = { clientId: "google-id", clientSecret: "google-secret" };
  }

  const preflight = (origin: string) => call("OPTIONS", "/me", { origin });

  it("lists only the site, its test address and its preview", () => {
    expect([...SITE_ORIGINS]).toEqual([
      "https://baheardle.com",
      "https://ba-heardle-site.shinrunner1st.workers.dev",
      "https://ba-heardle-site-preview.shinrunner1st.workers.dev",
    ]);
  });

  it("turns a localhost page away from a deployed Worker's API", async () => {
    deployed();
    for (const origin of [
      SITE,
      "http://localhost:5173",
      "http://127.0.0.1:3000",
    ]) {
      expect((await preflight(origin)).status).toBe(403);
      expect((await call("GET", "/me", { origin })).status).toBe(403);
      expect(
        (await call("POST", "/auth/session", { origin, body: { code: "x" } }))
          .status
      ).toBe(403);
    }
    const site = await preflight("https://baheardle.com");
    expect(site.status).toBe(204);
    expect(site.headers.get("Access-Control-Allow-Origin")).toBe(
      "https://baheardle.com"
    );
  });

  it("never sends a deployed Worker's sign-in back to localhost", async () => {
    deployed();
    for (const back of LOCAL_PAGES) {
      const query = new URLSearchParams({ nonce: NONCE, back });
      const started = await call("GET", `/auth/google/start?${query}`, {
        origin: null,
      });
      expect(started.status).toBe(400);
      expect(started.headers.get("Location")).toBeNull();
      expect(pageToReturnTo(back)).toBeNull();
    }
    // The site itself still starts one, to Google.
    const query = new URLSearchParams({ nonce: NONCE, back: LIVE_PAGE });
    expect(
      location(
        await call("GET", `/auth/google/start?${query}`, { origin: null })
      ).origin
    ).toBe("https://accounts.google.com");
  });

  it("won't follow a signed state back to localhost on a deployed Worker", async () => {
    deployed();
    // Signed with the Worker's own key, as a local run sharing it could.
    const toLocal = await signValue(
      "state",
      { p: "google", n: NONCE, b: PAGE, e: now + 60_000 },
      "test-state-key"
    );
    const refused = await answer("google", toLocal, { error: "access_denied" });
    expect(refused.status).toBe(400);
    expect(refused.headers.get("Location")).toBeNull();

    const toSite = await signValue(
      "state",
      { p: "google", n: NONCE, b: LIVE_PAGE, e: now + 60_000 },
      "test-state-key"
    );
    const back = location(
      await answer("google", toSite, { error: "access_denied" })
    );
    expect(back.origin).toBe("https://baheardle.com");
    expect(back.hash).toBe(`#authError=cancelled&nonce=${NONCE}`);
  });

  it("lets a local dev server's pages in, as `npm run accounts` runs", async () => {
    const local = await preflight(SITE);
    expect(local.status).toBe(204);
    expect(local.headers.get("Access-Control-Allow-Origin")).toBe(SITE);
    expect(pageToReturnTo(PAGE, true)).toBe(PAGE);
    expect(
      pageToReturnTo("http://localhost:3000.evil.example/ost", true)
    ).toBeNull();
    // A whole sign-in comes back to the local page.
    const token = await signIn("dev");
    expect((await me(token)).status).toBe(200);
  });
});

describe("linking", () => {
  async function link(token: string, provider: string, who: string) {
    const ticket = (await (
      await call("POST", "/auth/link-ticket", { token })
    ).json()) as { ticket: string };
    const state = await startSignIn(provider, { ticket: ticket.ticket });
    return fragment(await answer(provider, state, { code: `fake:${who}` }));
  }

  it("links another provider to the account, one of each", async () => {
    const token = await signIn("alice", "google");
    expect(await link(token, "discord", "alice-d")).toEqual({
      linked: "discord",
      nonce: NONCE,
    });
    const view = (await me(token)).body;
    expect(
      view.identities.map((each: { provider: string }) => each.provider)
    ).toEqual(["google", "discord"]);
    // Either way in reaches the one account.
    expect((await me(await signIn("alice-d", "discord"))).body.publicId).toBe(
      view.publicId
    );

    expect(await link(token, "google", "alice-2")).toEqual({
      authError: "has",
      nonce: NONCE,
    });
  });

  it("won't take an identity from another account", async () => {
    await signIn("carol", "discord");
    const token = await signIn("alice", "google");
    expect(await link(token, "discord", "carol")).toEqual({
      authError: "taken",
      nonce: NONCE,
    });
  });

  it("needs a ticket that's fresh and signed", async () => {
    const token = await signIn("alice");
    const { ticket } = (await (
      await call("POST", "/auth/link-ticket", { token })
    ).json()) as { ticket: string };
    now += 61_000;
    const query = new URLSearchParams({ nonce: NONCE, back: PAGE, ticket });
    expect(
      fragment(
        await call("GET", `/auth/discord/start?${query}`, { origin: null })
      )
    ).toEqual({ authError: "expired", nonce: NONCE });
  });

  it("unlinks, but never the last way in", async () => {
    const token = await signIn("alice", "google");
    await link(token, "discord", "alice-d");
    expect(
      (await call("DELETE", "/me/identities/google", { token })).status
    ).toBe(204);
    expect(
      (await call("DELETE", "/me/identities/discord", { token })).status
    ).toBe(409);
    expect((await me(token)).body.identities).toEqual([
      { provider: "discord", linkedAt: now },
    ]);
  });
});

describe("sessions", () => {
  it("signs out: the token works no more", async () => {
    const token = await signIn("alice");
    expect((await call("POST", "/auth/sign-out", { token })).status).toBe(204);
    expect((await me(token)).status).toBe(401);
  });

  it("lasts 90 days from its last use, pushed back once a day", async () => {
    const token = await signIn("alice");
    const expiry = () =>
      (
        db.sqlite.prepare("SELECT expires_at FROM sessions").get() as {
          expires_at: number;
        }
      ).expires_at;
    const first = expiry();

    now += 60 * 60_000;
    await me(token);
    expect(expiry()).toBe(first);

    now += 2 * DAY;
    await me(token);
    expect(expiry()).toBe(now + 90 * DAY);

    now += 91 * DAY;
    expect((await me(token)).status).toBe(401);
    expect(db.sqlite.prepare("SELECT * FROM sessions").all()).toEqual([]);
  });

  it("marks the account used, once a day", async () => {
    const token = await signIn("alice");
    const seen = () =>
      (
        db.sqlite.prepare("SELECT seen_day FROM accounts").get() as {
          seen_day: number;
        }
      ).seen_day;
    const day = seen();
    now += 3 * DAY;
    await me(token);
    expect(seen()).toBe(day + 3);
  });

  it("knows nothing else: a stray address is just not found", async () => {
    expect((await call("GET", "/favicon.ico", { origin: null })).status).toBe(
      404
    );
    expect((await call("GET", "/admin")).status).toBe(404);
  });

  it("turns away bad tokens and other sites", async () => {
    expect((await me("not-a-token")).status).toBe(401);
    expect((await me("a".repeat(52))).status).toBe(401);
    const token = await signIn("alice");
    expect(
      (await call("GET", "/me", { token, origin: "https://evil.example" }))
        .status
    ).toBe(403);
    expect((await call("GET", "/me", { token, origin: null })).status).toBe(
      403
    );
  });

  it("lets the site's pages ask first, once in two hours", async () => {
    const response = await call("OPTIONS", "/me");
    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(SITE);
    expect(response.headers.get("Access-Control-Allow-Headers")).toContain(
      "Authorization"
    );
    expect(response.headers.get("Access-Control-Max-Age")).toBe("7200");
  });
});

describe("Google and Discord", () => {
  const base64url = (value: object) =>
    btoa(JSON.stringify(value))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

  beforeEach(() => {
    env.fakeSignIn = false;
    env.google = { clientId: "google-id", clientSecret: "google-secret" };
    env.discord = { clientId: "discord-id", clientSecret: "discord-secret" };
  });

  async function startReal(provider: string) {
    const query = new URLSearchParams({ nonce: NONCE, back: PAGE });
    const to = location(
      await call("GET", `/auth/${provider}/start?${query}`, { origin: null })
    );
    return to;
  }

  it("asks Google for the openid scope only, and reads its sub", async () => {
    const to = await startReal("google");
    expect(to.origin).toBe("https://accounts.google.com");
    expect(to.searchParams.get("scope")).toBe("openid");
    expect(to.searchParams.get("redirect_uri")).toBe(
      `${WORKER}/auth/google/callback`
    );

    const idToken = (aud: string) =>
      `${base64url({ alg: "RS256" })}.${base64url({
        iss: "https://accounts.google.com",
        aud,
        sub: "1234567890",
        exp: Math.floor(Date.now() / 1000) + 600,
      })}.signature`;
    env.fetcher = vi.fn(async () =>
      Response.json({ id_token: idToken("google-id"), access_token: "x" })
    ) as unknown as typeof fetch;
    const back = fragment(
      await answer("google", to.searchParams.get("state")!, { code: "c" })
    );
    expect(back.auth).toBeDefined();
    const [, init] = vi.mocked(env.fetcher).mock.calls[0];
    expect(String(init?.body)).toContain("client_secret=google-secret");
    expect(
      db.sqlite.prepare("SELECT provider, subject FROM identities").all()
    ).toEqual([{ provider: "google", subject: "1234567890" }]);

    env.fetcher = vi.fn(async () =>
      Response.json({ id_token: idToken("someone-else") })
    ) as unknown as typeof fetch;
    const again = await startReal("google");
    expect(
      fragment(
        await answer("google", again.searchParams.get("state")!, { code: "c" })
      )
    ).toEqual({ authError: "failed", nonce: NONCE });
  });

  it("asks Discord for identify only, and reads the user's id", async () => {
    const to = await startReal("discord");
    expect(to.origin).toBe("https://discord.com");
    expect(to.searchParams.get("scope")).toBe("identify");

    env.fetcher = vi.fn(async (input: RequestInfo | URL) =>
      String(input).endsWith("/token")
        ? Response.json({ access_token: "discord-token" })
        : Response.json({ id: "80351110224678912", username: "nobody" })
    ) as unknown as typeof fetch;
    fragment(
      await answer("discord", to.searchParams.get("state")!, { code: "c" })
    );
    expect(
      db.sqlite.prepare("SELECT provider, subject FROM identities").all()
    ).toEqual([{ provider: "discord", subject: "80351110224678912" }]);
  });
});

describe("the profile", () => {
  const profile = (overrides: Record<string, unknown> = {}) => ({
    name: "Shin",
    sensei: true,
    student: 10004,
    title: "dependable",
    banner: "sakura",
    frame: "gold",
    background: "cherry",
    cardColors: "night",
    editedAt: now,
    summary: { roundsPlayed: 12, songsGuessed: 3, server: "jp" },
    ...overrides,
  });
  const put = (token: string, body: unknown) =>
    call("PUT", "/me/profile", { token, body });
  const get = async (token: string) =>
    (
      (await (await call("GET", "/me/profile", { token })).json()) as {
        profile: Record<string, unknown> | null;
      }
    ).profile;

  it("has none at first, then keeps what's sent, without its summary", async () => {
    const token = await signIn("alice");
    expect(await get(token)).toBeNull();
    expect((await put(token, profile())).status).toBe(200);
    const picks: Record<string, unknown> = profile();
    delete picks.summary;
    expect(await get(token)).toEqual(picks);
    // The summary is kept, as a cache, but never handed back.
    const row = db.sqlite.prepare("SELECT summary FROM profiles").get() as {
      summary: string;
    };
    expect(JSON.parse(row.summary)).toMatchObject({
      roundsPlayed: 12,
      songsGuessed: 3,
      daysPlayed: 0,
      server: "jp",
    });
  });

  it("keeps only what's whole: a clean name, real cosmetics, numbers", async () => {
    const token = await signIn("alice");
    await put(
      token,
      profile({
        name: "  A\u200brona\u202e Sensei of Schale and more  ",
        student: -3,
        banner: "no-such-banner",
        frame: 5,
        summary: { roundsPlayed: -1, songsGuessed: 2.5, extra: 9, server: "x" },
      })
    );
    expect(await get(token)).toMatchObject({
      name: "Arona Sensei of Scha",
      student: null,
      banner: "none",
      frame: "schale",
    });
    const row = db.sqlite.prepare("SELECT summary FROM profiles").get() as {
      summary: string;
    };
    const summary = JSON.parse(row.summary);
    expect(summary).toMatchObject({
      roundsPlayed: 0,
      songsGuessed: 0,
      server: "global",
    });
    expect(summary.extra).toBeUndefined();
  });

  it("never lets an older change undo a newer one, but takes its summary", async () => {
    const token = await signIn("alice");
    await put(token, profile({ name: "Newer", editedAt: now }));
    await put(
      token,
      profile({
        name: "Older",
        editedAt: now - 1000,
        summary: { roundsPlayed: 99, server: "global" },
      })
    );
    expect(await get(token)).toMatchObject({ name: "Newer", editedAt: now });
    const row = db.sqlite.prepare("SELECT summary FROM profiles").get() as {
      summary: string;
    };
    expect(JSON.parse(row.summary).roundsPlayed).toBe(99);
  });

  it("is one row, written in one go", async () => {
    const token = await signIn("alice");
    await put(token, profile());
    await put(token, profile({ name: "Again", editedAt: now + 1 }));
    expect(db.sqlite.prepare("SELECT * FROM profiles").all()).toHaveLength(1);
  });

  it("needs a session, and keeps no clock far ahead", async () => {
    expect((await put("a".repeat(52), profile())).status).toBe(401);
    const token = await signIn("alice");
    await put(token, profile({ editedAt: now + 365 * DAY }));
    expect((await get(token))!.editedAt).toBe(now + DAY);
  });
});

describe("the progress", () => {
  const bytes = (text: string) =>
    new Uint8Array(new TextEncoder().encode(text));
  const put = (
    token: string,
    data: Uint8Array<ArrayBuffer>,
    query: Record<string, string>
  ) =>
    handle(
      new Request(`${WORKER}/me/progress?${new URLSearchParams(query)}`, {
        method: "PUT",
        headers: { Origin: SITE, Authorization: `Bearer ${token}` },
        body: data,
      }),
      env
    );
  const get = (token: string) => call("GET", "/me/progress", { token });
  /** As the page sends it now: the revision and format in headers. */
  const putHeaders = (
    token: string,
    data: Uint8Array<ArrayBuffer>,
    fields: Record<string, string>
  ) =>
    handle(
      new Request(`${WORKER}/me/progress`, {
        method: "PUT",
        headers: { Origin: SITE, Authorization: `Bearer ${token}`, ...fields },
        body: data,
      }),
      env
    );

  it("takes the revision, format and backup from headers, at one address", async () => {
    const token = await signIn("alice");
    const first = await putHeaders(token, bytes("one"), {
      "X-Base": "0",
      "X-Format": "2",
    });
    expect(await first.json()).toEqual({ revision: 1 });
    // Stale: refused, saying which is current, as by the address.
    const stale = await putHeaders(token, bytes("two"), {
      "X-Base": "0",
      "X-Format": "2",
    });
    expect(stale.status).toBe(409);
    expect(await stale.json()).toMatchObject({
      error: "conflict",
      revision: 1,
    });
    const merged = await putHeaders(token, bytes("three"), {
      "X-Base": "1",
      "X-Format": "2",
      "X-Backup": "1",
    });
    expect(merged.status).toBe(200);
    const backup = db.sqlite
      .prepare("SELECT revision FROM progress_backups")
      .get() as { revision: number };
    expect(backup.revision).toBe(1);
    // A page from before, with them in the address, still works.
    expect(
      (await put(token, bytes("four"), { base: "2", format: "2" })).status
    ).toBe(200);
    // Neither: refused.
    expect((await putHeaders(token, bytes("five"), {})).status).toBe(400);
  });

  it("lets the site's pages send those headers", async () => {
    const response = await call("OPTIONS", "/me/progress");
    expect(response.headers.get("Access-Control-Allow-Headers")).toBe(
      "Authorization, Content-Type, X-Base, X-Format, X-Backup"
    );
  });

  it("has none at first, then keeps what's sent, as it was sent", async () => {
    const token = await signIn("alice");
    expect((await get(token)).status).toBe(204);

    const first = await put(token, bytes("save one"), {
      base: "0",
      format: "2",
    });
    expect(await first.json()).toEqual({ revision: 1 });

    const back = await get(token);
    expect(back.status).toBe(200);
    expect(back.headers.get("X-Revision")).toBe("1");
    expect(back.headers.get("X-Format")).toBe("2");
    expect(back.headers.get("Access-Control-Expose-Headers")).toContain(
      "X-Revision"
    );
    expect(new TextDecoder().decode(await back.arrayBuffer())).toBe("save one");

    const state = (await (
      await call("GET", "/me/profile", { token })
    ).json()) as {
      progress: unknown;
    };
    expect(state.progress).toEqual({ format: 2, revision: 1 });
  });

  it("refuses a write built on an older revision, saying which is current", async () => {
    const token = await signIn("alice");
    await put(token, bytes("one"), { base: "0", format: "2" });
    await put(token, bytes("two"), { base: "1", format: "2" });

    const stale = await put(token, bytes("old"), { base: "1", format: "2" });
    expect(stale.status).toBe(409);
    expect(await stale.json()).toEqual({
      error: "conflict",
      revision: 2,
      format: 2,
    });
    // A page that thinks there's none yet is turned away too.
    expect(
      (await put(token, bytes("new"), { base: "0", format: "2" })).status
    ).toBe(409);
    expect(
      new TextDecoder().decode(await (await get(token)).arrayBuffer())
    ).toBe("two");
  });

  it("gives one of two writes on the same revision, never both", async () => {
    const token = await signIn("alice");
    await put(token, bytes("one"), { base: "0", format: "2" });
    const results = await Promise.all([
      put(token, bytes("a"), { base: "1", format: "2" }),
      put(token, bytes("b"), { base: "1", format: "2" }),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
  });

  it("copies what a merge writes over, when asked", async () => {
    const token = await signIn("alice");
    await put(token, bytes("before"), { base: "0", format: "2" });
    await put(token, bytes("merged"), { base: "1", format: "2", backup: "1" });
    const backup = db.sqlite
      .prepare("SELECT revision, data FROM progress_backups")
      .get() as { revision: number; data: Uint8Array };
    expect(backup.revision).toBe(1);
    expect(new TextDecoder().decode(backup.data)).toBe("before");
  });

  it("never lets an older format write over a newer one", async () => {
    const token = await signIn("alice");
    await put(token, bytes("newer"), { base: "0", format: "3" });
    const old = await put(token, bytes("older"), { base: "1", format: "2" });
    expect(old.status).toBe(409);
    expect(await old.json()).toMatchObject({ error: "format", format: 3 });
  });

  it("takes a save of 1 MB at most, and needs a session", async () => {
    const token = await signIn("alice");
    expect(
      (
        await put(token, new Uint8Array(1024 * 1024 + 1), {
          base: "0",
          format: "2",
        })
      ).status
    ).toBe(413);
    expect(
      (await put("a".repeat(52), bytes("x"), { base: "0", format: "2" })).status
    ).toBe(401);
    expect(
      (await put(token, bytes("x"), { base: "-1", format: "2" })).status
    ).toBe(400);
  });
});

describe("missions and room passes", () => {
  const KEY = "test-room-pass-key";
  const profile = (overrides: Record<string, unknown> = {}) => ({
    name: "Shin",
    sensei: true,
    student: 10004,
    title: "dependable", // daily-7
    banner: "sakura", // daily-14
    frame: "gold", // daily-30
    background: "cherry", // first-daily
    cardColors: "schale",
    editedAt: now,
    summary: {},
    ...overrides,
  });
  const put = (token: string, body: unknown) =>
    call("PUT", "/me/profile", { token, body });
  const missionsOf = () =>
    (
      db.sqlite
        .prepare("SELECT mission FROM missions_cleared ORDER BY mission")
        .all() as { mission: string }[]
    ).map(({ mission }) => mission);
  const passFor = async (token: string) => {
    const response = await call("GET", "/room-pass", { token });
    return {
      status: response.status,
      body: (await response.json()) as { pass: string; expires: number },
    };
  };

  beforeEach(() => {
    env = { ...env, roomPassKey: KEY };
  });

  it("keeps the missions sent, known ones only, and only ever adds", async () => {
    const token = await signIn("alice");
    await put(token, {
      ...profile(),
      missions: ["daily-7", "first-daily", "made-up", 7, "daily-7"],
    });
    expect(missionsOf()).toEqual(["daily-7", "first-daily"]);

    // The same again writes nothing; one more adds one row; a shorter list
    // (a browser that hasn't the others yet) takes nothing away.
    const prepare = vi.spyOn(db, "prepare");
    const missionWrites = () =>
      prepare.mock.calls.filter(([sql]) =>
        /INSERT INTO missions_cleared/.test(sql)
      ).length;
    await put(token, { ...profile(), missions: ["first-daily", "daily-7"] });
    expect(missionsOf()).toEqual(["daily-7", "first-daily"]);
    expect(missionWrites()).toBe(0);
    await put(token, { ...profile(), missions: ["daily-60"] });
    expect(missionsOf()).toEqual(["daily-60", "daily-7", "first-daily"]);
    expect(missionWrites()).toBe(1);
    await put(token, profile());
    expect(missionsOf()).toEqual(["daily-60", "daily-7", "first-daily"]);
  });

  it("gives a signed pass with only the cosmetics the account unlocked", async () => {
    const token = await signIn("alice");
    await put(token, { ...profile(), missions: ["daily-7", "first-daily"] });
    const { status, body } = await passFor(token);
    expect(status).toBe(200);
    expect(body.expires).toBe(now + ROOM_PASS_MS);

    const pass = await readRoomPass(body.pass, KEY, now);
    const account = (await me(token)).body as { publicId: string };
    expect(pass).toEqual({
      publicId: account.publicId,
      name: "Shin",
      student: 10004,
      // Sakura banner and the gold frame need missions not cleared: the
      // banner falls back to none, the default.
      look: {
        title: "dependable",
        banner: "none",
        frame: "schale",
        background: "cherry",
      },
      expires: now + ROOM_PASS_MS,
    });
  });

  it("says nothing in a pass but what a room shows", async () => {
    const token = await signIn("alice");
    await put(token, profile());
    const { body } = await passFor(token);
    const json = atob(
      body.pass.split(".")[0].replace(/-/g, "+").replace(/_/g, "/")
    );
    const accountId = (
      db.sqlite.prepare("SELECT id FROM accounts").get() as { id: string }
    ).id;
    expect(json).not.toContain(accountId);
    expect(json).not.toContain(token);
    expect(json).not.toContain("fake-alice");
    expect(Object.keys(JSON.parse(json)).sort()).toEqual([
      "e",
      "l",
      "n",
      "p",
      "s",
    ]);
  });

  it("gives defaults to an account with no profile yet", async () => {
    const token = await signIn("bob");
    const pass = await readRoomPass((await passFor(token)).body.pass, KEY, now);
    expect(pass).toMatchObject({ name: "", student: null, look: DEFAULT_LOOK });
  });

  it("is refused once changed, out of time, or signed with another key", async () => {
    const token = await signIn("alice");
    await put(token, profile());
    const { pass } = (await passFor(token)).body;
    expect(await readRoomPass(pass, KEY, now)).not.toBeNull();
    expect(await readRoomPass(pass, KEY, now + ROOM_PASS_MS + 1)).toBeNull();
    expect(await readRoomPass(pass, "another-key", now)).toBeNull();

    const [body, signature] = pass.split(".");
    const forged = JSON.parse(
      atob(body.replace(/-/g, "+").replace(/_/g, "/"))
    ) as Record<string, unknown>;
    forged.l = ["champion", "gold", "prism", "plaza"];
    const forgedBody = btoa(JSON.stringify(forged))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    expect(
      await readRoomPass(`${forgedBody}.${signature}`, KEY, now)
    ).toBeNull();
    // A sign-in's state, signed with the same key, isn't a pass.
    const state = await signValue("state", forged, KEY);
    expect(await readRoomPass(state, KEY, now)).toBeNull();
  });

  it("needs a session, and a key on the Worker", async () => {
    expect((await passFor("a".repeat(52))).status).toBe(401);
    const token = await signIn("alice");
    env = { ...env, roomPassKey: undefined };
    expect((await passFor(token)).status).toBe(503);
  });

  it("reads the profile and missions only: two small queries", async () => {
    const token = await signIn("alice");
    await put(token, {
      ...profile(),
      missions: ["daily-7", "first-daily", "daily-14"],
    });
    const prepare = vi.spyOn(db, "prepare");
    await passFor(token);
    const queries = prepare.mock.calls.map(
      ([sql]) => sql.trim().split(/\s+/)[0]
    );
    // The session (one read, as for every call), then the pass's three.
    expect(queries.filter((word) => word !== "SELECT")).toEqual([]);
    expect(queries).toHaveLength(4);
  });
});

describe("deleting and downloading an account", () => {
  const TABLES = [
    "accounts",
    "identities",
    "sessions",
    "sign_in_codes",
    "profiles",
    "progress",
    "progress_backups",
    "missions_cleared",
    "verified_clock",
    "verified_daily",
    "verified_summary",
    "verified_room",
  ];
  const rows = () =>
    Object.fromEntries(
      TABLES.map((table) => [
        table,
        (
          db.sqlite.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get() as {
            n: number;
          }
        ).n,
      ])
    );
  /** An account with something in every table, and its token. */
  async function fullAccount(who: string) {
    const token = await signIn(who);
    // Discord linked too.
    const ticket = (
      (await (await call("POST", "/auth/link-ticket", { token })).json()) as {
        ticket: string;
      }
    ).ticket;
    const state = await startSignIn("discord", { ticket });
    await answer("discord", state, { code: `fake:${who}-discord` });
    await call("PUT", "/me/profile", {
      token,
      body: {
        name: "Shin",
        student: 10004,
        title: "dependable",
        summary: { roundsPlayed: 3 },
        missions: ["daily-7", "first-daily"],
        editedAt: now,
      },
    });
    const put = (base: number, backup = false) =>
      handle(
        new Request(
          `${WORKER}/me/progress?base=${base}&format=2${
            backup ? "&backup=1" : ""
          }`,
          {
            method: "PUT",
            headers: { Origin: SITE, Authorization: `Bearer ${token}` },
            body: gzip('{"format":2}'),
          }
        ),
        env
      );
    expect((await put(0)).status).toBe(200);
    expect((await put(1, true)).status).toBe(200);
    // A verified daily played, and a room's result counted.
    const zone = "UTC";
    const day = dayInZone(zone, now);
    const started = await call("POST", "/verified", {
      token,
      body: { action: "start", game: "ost", day, zone },
    });
    const { attempt } = (await started.json()) as { attempt: string };
    const finished = await call("POST", "/verified", {
      token,
      body: {
        action: "finish",
        attempt,
        guesses: [verifiedAnswer("ost", day)],
      },
    });
    expect(finished.status).toBe(200);
    env.roomPassKey = "test-pass-key";
    const { publicId } = (await me(token)).body as { publicId: string };
    const receipt = await makeRoomReceipt(
      {
        gameId: newRoomGameId(),
        publicId,
        game: "voice",
        answers: "choice",
        rounds: 10,
        players: 3,
        place: 2,
        score: 6,
        endedAt: now,
      },
      env.roomPassKey
    );
    const room = await call("POST", "/verified", {
      token,
      body: { action: "room", receipt },
    });
    expect(room.status).toBe(200);
    // A sign-in half done: its one-time code is still waiting.
    await answer("google", await startSignIn(), { code: `fake:${who}` });
    return token;
  }
  const gzip = (text: string) =>
    new Uint8Array(
      zlib.gzipSync(Buffer.from(text, "utf8"))
    ) as Uint8Array<ArrayBuffer>;

  it("deletes everything kept for the account, and nobody else's", async () => {
    const alice = await fullAccount("alice");
    const bob = await fullAccount("bob");
    const before = rows();
    expect(Object.values(before).every((n) => n > 0)).toBe(true);

    expect((await call("DELETE", "/me", { token: alice })).status).toBe(204);
    const after = rows();
    for (const table of TABLES) {
      expect(after[table], table).toBe(before[table] / 2);
    }
    expect((await me(alice)).status).toBe(401);
    expect((await me(bob)).status).toBe(200);
    // Signing in with the same Google again makes a new, empty account.
    const again = await signIn("alice");
    const profile = await call("GET", "/me/profile", { token: again });
    expect(await profile.json()).toEqual({ profile: null, progress: null });
  });

  it("deletes in one batch: all of it, or none", async () => {
    const token = await fullAccount("alice");
    const batch = vi.spyOn(db, "batch");
    await call("DELETE", "/me", { token });
    expect(batch).toHaveBeenCalledOnce();
    expect(batch.mock.calls[0][0]).toHaveLength(TABLES.length);
  });

  it("gives the player everything kept for them, and no secret", async () => {
    const token = await fullAccount("alice");
    const response = await call("GET", "/me/data", { token });
    expect(response.status).toBe(200);
    const data = (await response.json()) as Record<string, unknown> & {
      progress: { gzipBase64: string };
    };
    expect(data).toMatchObject({
      account: { createdAt: new Date(now).toISOString() },
      identities: [
        { provider: "google", id: "fake-alice" },
        { provider: "discord", id: "fake-alice-discord" },
      ],
      profile: {
        name: "Shin",
        favouriteStudent: 10004,
        title: "dependable",
        summary: { roundsPlayed: 3 },
      },
      missions: [{ mission: "daily-7" }, { mission: "first-daily" }],
      progress: { format: 2, revision: 2 },
      progressBackup: { format: 2, revision: 1 },
    });
    expect(
      zlib
        .gunzipSync(Buffer.from(data.progress.gzipBase64, "base64"))
        .toString()
    ).toBe('{"format":2}');
    expect((data.sessions as unknown[]).length).toBe(1);
    // The verified record, with the daily time zone, apart from the save.
    expect(data.verified).toEqual({
      dailyTimeZone: { zone: "UTC", setAt: new Date(now).toISOString() },
      dailies: [
        {
          daily: "ost",
          puzzle: dayInZone("UTC", now),
          attemptId: expect.stringMatching(/^[a-z2-7]{26}$/),
          startedAt: new Date(now).toISOString(),
          finishedAt: new Date(now).toISOString(),
          outcome: "won",
          tries: 1,
          moves: {
            guesses: [verifiedAnswer("ost", dayInZone("UTC", now))],
          },
          timeMs: 0,
          timeCounted: true,
        },
      ],
      summaries: [
        expect.objectContaining({ game: "ost", played: 1, won: 1 }),
        expect.objectContaining({ game: "rooms", played: 1, won: 0 }),
      ],
      rooms: [
        {
          gameId: expect.stringMatching(/^[a-z2-7]{26}$/),
          game: "voice",
          answers: "choice",
          rounds: 10,
          players: 3,
          place: 2,
          score: 6,
          endedAt: new Date(now).toISOString(),
        },
      ],
    });
    const text = JSON.stringify(data);
    expect(text).not.toContain(token);
    const accountId = (
      db.sqlite.prepare("SELECT id FROM accounts").get() as { id: string }
    ).id;
    expect(text).not.toContain(accountId);
    expect(text).not.toMatch(/token_hash|code_hash/);
  });

  it("needs a session for either", async () => {
    expect(
      (await call("DELETE", "/me", { token: "a".repeat(52) })).status
    ).toBe(401);
    expect(
      (await call("GET", "/me/data", { token: "a".repeat(52) })).status
    ).toBe(401);
  });
});

describe("the daily run", () => {
  it("deletes accounts unused for two years, and runs-out sessions", async () => {
    const old = await signIn("old");
    now += 100 * DAY;
    const recent = await signIn("recent");
    // Two years later, less a day for the recent one.
    now += (ACCOUNT_UNUSED_DAYS - 100) * DAY + DAY / 2;
    const result = await tidyAccounts(db, now);
    expect(result).toEqual({ accounts: 1 });
    now -= DAY; // within the session's time again, for the check
    expect((await me(old)).status).toBe(401);

    // The recent one is kept, but its session ran out long ago: gone.
    const sessions = db.sqlite
      .prepare("SELECT COUNT(*) AS n FROM sessions")
      .get() as { n: number };
    expect(sessions.n).toBe(0);
    const accounts = db.sqlite
      .prepare("SELECT COUNT(*) AS n FROM accounts")
      .get() as { n: number };
    expect(accounts.n).toBe(1);
    void recent;
  });

  it("keeps an account used within the two years, by any call", async () => {
    const token = await signIn("alice");
    now += (ACCOUNT_UNUSED_DAYS - 10) * DAY;
    // Its session ran out, but a sign-in marks it used.
    await signIn("alice");
    now += 20 * DAY;
    expect(await tidyAccounts(db, now)).toEqual({ accounts: 0 });
    void token;
  });

  it("deletes many in batches", async () => {
    for (let i = 0; i < 120; i++) {
      db.sqlite
        .prepare(
          "INSERT INTO accounts (id, public_id, created_at, seen_day) VALUES (?, ?, 0, 0)"
        )
        .run(`account${i}`, `public${i}`);
    }
    const batch = vi.spyOn(db, "batch");
    expect(await tidyAccounts(db, now)).toEqual({ accounts: 120 });
    // The sessions' tidy, then three batches of at most 50.
    expect(batch).toHaveBeenCalledTimes(4);
  });
});
