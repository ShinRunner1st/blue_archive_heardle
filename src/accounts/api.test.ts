// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { fakeD1, FakeD1 } from "../test/fakeD1";
import { AccountsEnv, handle, pageToReturnTo } from "./api";
import { signValue } from "./crypto";

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
  env = { db, stateKey: "test-state-key", fakeSignIn: true, now: () => now };
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
    expect(pageToReturnTo(`${PAGE}#old`)).toBe(PAGE);
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
      banner: "schale",
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
