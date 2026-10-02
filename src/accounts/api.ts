import {
  AuthError,
  isProvider,
  LINK_TICKET_MS,
  Provider,
  PROVIDER_NAMES,
  SIGN_IN_STATE_MS,
} from "../types/account";
import { readSigned, signValue } from "./crypto";
import { addMissions, cleanMissions } from "./missions";
import { deleteAccounts, exportAccount } from "./privacy";
import { cleanProfile, readProfile, writeProfile } from "./profile";
import {
  MAX_PROGRESS_BYTES,
  progressMeta,
  readProgress,
  writeProgress,
} from "./progress";
import {
  authorizeUrl,
  exchangeCode,
  ProviderError,
  ProviderKeys,
} from "./providers";
import { MAX_VERIFIED_BODY } from "../types/verified";
import { readRoomReceipt, recordRoomResult } from "./roomReceipt";
import { makeRoomPass } from "./roomPass";
import {
  accountView,
  createAccount,
  createSession,
  createSignInCode,
  Db,
  endSession,
  findIdentity,
  linkIdentity,
  sessionAccount,
  takeSignInCode,
  unlinkIdentity,
} from "./store";
import { finishDaily, readVerified, startDaily } from "./verified";

/**
 * The accounts Worker's requests (accounts-worker/ is only its glue):
 *
 * - `GET /auth/<provider>/start?nonce=&back=[&ticket=]` sends the browser to
 *   Google or Discord, with a signed `state` (the page's nonce, the page to
 *   come back to, and for linking the account), good for 10 minutes.
 * - `GET /auth/<provider>/callback` is where they send it back: the code is
 *   swapped for the person's id, the account found, made or linked, and the
 *   browser sent back to the page with a one-time code in the `#` part
 *   (`#auth=…&nonce=…`), or `#linked=…` or `#authError=…`.
 * - `POST /auth/session` swaps that code for a session token.
 * - `GET /me`, `POST /auth/link-ticket`, `DELETE /me/identities/<provider>`
 *   and `POST /auth/sign-out` take the token, in `Authorization: Bearer`.
 * - `GET /me/profile` and `PUT /me/profile`: the profile in the account
 *   (step 2). The summary goes in with it and never comes back out: it's
 *   for other players later, and the page works its own out from the
 *   progress. The read also says which progress the account has, so a
 *   page opening needs no second request to know whether to download.
 * - `GET /me/progress` and `PUT /me/progress`: the save in the account
 *   (step 3), gzipped, as bytes; its revision and format ride in headers
 *   both ways (a write's in `X-Base`, `X-Format` and `X-Backup: 1`, so its
 *   address, and the browser's preflight for it, stays the same; the
 *   query `?base=&format=&backup=1` of the first pages still works). A
 *   write built on an older revision gets 409 and the account's revision,
 *   for the page to merge and send again.
 * - `PUT /me/profile` also takes the missions cleared, when they changed
 *   (step 4): rows only ever added, for the room pass.
 * - `GET /room-pass`: a signed-in player's pass for the rooms (step 4),
 *   signed with the key the rooms Worker shares; good for 12 hours.
 * - `GET /me/data`: everything kept for the account, for the player to
 *   download; `DELETE /me` deletes it all (step 5, the privacy policy).
 * - `/verified` (docs/verified-stats.md): `POST` with `{ action }` "start"
 *   or "finish" for a verified daily, or "room" for a room's receipt, and
 *   `GET` for the account's verified record. One address for all, so a
 *   page's preflight is asked once.
 *
 * The token is a credential: it only ever travels in that header, and
 * nothing here logs a header, a body, a token or a code (docs/accounts.md,
 * section 2). Only the site's own pages may call the API (CORS).
 */

export interface AccountsEnv {
  db: Db;
  /** Signs `state` and link tickets; a Worker secret. */
  stateKey: string;
  /**
   * Signs room passes, shared with the rooms Worker; a secret. Unset, a
   * page gets no pass and joins rooms as a guest would.
   */
  roomPassKey?: string;
  /** Unset until that provider's sign-in is set up. */
  google?: ProviderKeys;
  discord?: ProviderKeys;
  /**
   * A stand-in for Google's and Discord's pages, for trying it all locally
   * without them: only with `wrangler dev`'s FAKE_SIGN_IN and on
   * localhost (see accounts-worker/index.ts). Never on a deployed Worker.
   */
  fakeSignIn?: boolean;
  /**
   * A local dev server's pages (`http://localhost:<port>`) may call the API
   * and be signed in to: only with `wrangler dev`'s LOCAL_DEV and on
   * localhost (see accounts-worker/index.ts). Never on a deployed Worker,
   * where only SITE_ORIGINS may.
   */
  localDev?: boolean;
  /** Sign-ins, and everything else, per address a minute. */
  signInLimit?: (key: string) => Promise<boolean>;
  apiLimit?: (key: string) => Promise<boolean>;
  /** The address's key for the limits; see accounts-worker/index.ts. */
  limitKey?: string;
  fetcher?: typeof fetch;
  now?: () => number;
}

/**
 * The only pages a deployed Worker lets sign in, call the API and be sent
 * back to: the site, its test address and its preview. A page anywhere
 * else could be handed a sign-in's one-time code, so a local dev server is
 * let in only by `localDev`.
 */
export const SITE_ORIGINS: readonly string[] = [
  "https://baheardle.com",
  "https://ba-heardle-site.shinrunner1st.workers.dev",
  "https://ba-heardle-site-preview.shinrunner1st.workers.dev",
];

const LOCAL_ORIGIN = /^http:\/\/localhost:\d+$/;

/** Whether a page may sign in and call the API; see SITE_ORIGINS. */
export function isSiteOrigin(origin: string | null, localDev = false): boolean {
  if (origin === null) return false;
  return (
    SITE_ORIGINS.includes(origin) || (localDev && LOCAL_ORIGIN.test(origin))
  );
}

/** The page to come back to: on the site, with no `#` part of its own. */
export function pageToReturnTo(
  back: string | null,
  localDev = false
): string | null {
  if (!back) return null;
  try {
    const url = new URL(back);
    if (!isSiteOrigin(url.origin, localDev)) return null;
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

const NONCE = /^[a-z0-9]{16,64}$/i;
/** A token or code: 256 bits as base32. */
const SECRET = /^[a-z2-7]{52}$/;

/** The provider's address for its answer: this Worker's callback. */
const callbackOf = (request: Request, provider: Provider) =>
  `${new URL(request.url).origin}/auth/${provider}/callback`;

const keysOf = (env: AccountsEnv, provider: Provider) => env[provider];

/** Back to the page, with what happened in its `#` part. */
function backTo(page: string, fields: Record<string, string>): Response {
  return new Response(null, {
    status: 302,
    headers: {
      Location: `${page}#${new URLSearchParams(fields)}`,
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
    },
  });
}

function failBack(page: string, nonce: string, error: AuthError): Response {
  return backTo(page, { authError: error, nonce });
}

/** A plain page from the Worker itself, for a sign-in it can't send back. */
function plainPage(status: number, text: string): Response {
  return new Response(
    `<!doctype html><meta charset="utf-8"><title>Blue Archive Heardle</title><p>${text}</p>`,
    {
      status,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        "Content-Security-Policy": "default-src 'none'",
      },
    }
  );
}

function corsHeaders(origin: string): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers":
      "Authorization, Content-Type, X-Base, X-Format, X-Backup",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE",
    // Kept two hours (browsers' cap), so a page asks once, not each call:
    // every request, the check included, counts against the free plan.
    "Access-Control-Max-Age": "7200",
    // The progress's revision and format, for the page to read.
    "Access-Control-Expose-Headers": "X-Revision, X-Format",
    Vary: "Origin",
  };
}

function json(origin: string, status: number, body?: unknown): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(origin),
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      "Cache-Control": "no-store",
    },
  });
}

async function allowed(
  limit: ((key: string) => Promise<boolean>) | undefined,
  key: string | undefined
): Promise<boolean> {
  if (!limit || !key) return true;
  try {
    return await limit(key);
  } catch {
    // The counter failing shouldn't lock everyone out.
    return true;
  }
}

/** The session token in the request's Authorization header, if well formed. */
function bearer(request: Request): string | null {
  const match = /^Bearer ([a-z2-7]+)$/.exec(
    request.headers.get("Authorization") ?? ""
  );
  return match && SECRET.test(match[1]) ? match[1] : null;
}

export async function handle(
  request: Request,
  env: AccountsEnv
): Promise<Response> {
  const now = (env.now ?? Date.now)();
  const url = new URL(request.url);
  const path = url.pathname;

  const auth = /^\/auth\/(\w+)\/(start|callback)$/.exec(path);
  if (auth && request.method === "GET") {
    if (!isProvider(auth[1])) return plainPage(404, "Not found.");
    return auth[2] === "start"
      ? start(request, env, auth[1], now)
      : callback(request, env, auth[1], now);
  }
  if (path === "/auth/fake" && request.method === "GET" && env.fakeSignIn) {
    return fakeProviderPage(url);
  }

  if (!isApiPath(path)) return new Response("Not found", { status: 404 });

  // The API: the site's pages only.
  const origin = request.headers.get("Origin");
  if (!origin || !isSiteOrigin(origin, env.localDev)) {
    return new Response("Forbidden", { status: 403 });
  }
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }

  if (path === "/auth/session" && request.method === "POST") {
    if (!(await allowed(env.signInLimit, env.limitKey))) {
      return json(origin, 429, { error: "slow" });
    }
    const body = await readJson(request);
    const code = typeof body?.code === "string" ? body.code : "";
    const account = SECRET.test(code)
      ? await takeSignInCode(env.db, code, now)
      : null;
    if (!account) return json(origin, 401, { error: "expired" });
    return json(origin, 200, {
      token: await createSession(env.db, account, now),
    });
  }

  if (!(await allowed(env.apiLimit, env.limitKey))) {
    return json(origin, 429, { error: "slow" });
  }
  const token = bearer(request);
  const account = token ? await sessionAccount(env.db, token, now) : null;
  if (!token || !account) return json(origin, 401, { error: "signedOut" });

  if (path === "/me" && request.method === "GET") {
    const view = await accountView(env.db, account);
    return view ? json(origin, 200, view) : json(origin, 401, {});
  }
  if (path === "/me" && request.method === "DELETE") {
    await deleteAccounts(env.db, [account]);
    return json(origin, 204);
  }
  if (path === "/me/data" && request.method === "GET") {
    const data = await exportAccount(env.db, account);
    return data ? json(origin, 200, data) : json(origin, 401, {});
  }
  if (path === "/me/profile" && request.method === "GET") {
    return json(origin, 200, {
      profile: await readProfile(env.db, account),
      progress: await progressMeta(env.db, account),
    });
  }
  if (path === "/me/progress" && request.method === "GET") {
    const progress = await readProgress(env.db, account);
    if (!progress) return json(origin, 204);
    return new Response(progress.data, {
      status: 200,
      headers: {
        ...corsHeaders(origin),
        "Content-Type": "application/octet-stream",
        "Cache-Control": "no-store",
        "X-Revision": String(progress.revision),
        "X-Format": String(progress.format),
      },
    });
  }
  if (path === "/me/progress" && request.method === "PUT") {
    // In headers (the page now), or the address (pages from before).
    const params = new URL(request.url).searchParams;
    const field = (name: string) =>
      request.headers.get(`X-${name[0].toUpperCase()}${name.slice(1)}`) ??
      params.get(name);
    const base = Number(field("base"));
    const format = Number(field("format"));
    if (
      !Number.isSafeInteger(base) ||
      base < 0 ||
      !Number.isSafeInteger(format) ||
      format < 1
    ) {
      return json(origin, 400, { error: "bad" });
    }
    const data = new Uint8Array(await request.arrayBuffer());
    if (data.length === 0) return json(origin, 400, { error: "bad" });
    if (data.length > MAX_PROGRESS_BYTES) {
      return json(origin, 413, { error: "tooBig" });
    }
    const result = await writeProgress(
      env.db,
      account,
      { base, format, data, backup: field("backup") === "1" },
      now
    );
    if (result.ok) return json(origin, 200, { revision: result.revision });
    return json(origin, 409, {
      error: result.why,
      revision: result.current?.revision ?? 0,
      format: result.current?.format ?? format,
    });
  }
  if (path === "/me/profile" && request.method === "PUT") {
    const body = await readJson(request);
    if (!body) return json(origin, 400, { error: "bad" });
    if (body.missions !== undefined) {
      await addMissions(env.db, account, cleanMissions(body.missions), now);
    }
    const kept = await writeProfile(
      env.db,
      account,
      cleanProfile(body, now),
      now
    );
    return json(origin, 200, { profile: kept });
  }
  if (path === "/room-pass" && request.method === "GET") {
    if (!env.roomPassKey) return json(origin, 503, { error: "unavailable" });
    const made = await makeRoomPass(env.db, account, env.roomPassKey, now);
    return made ? json(origin, 200, made) : json(origin, 401, {});
  }
  if (path === "/verified" && request.method === "GET") {
    return json(origin, 200, await readVerified(env.db, account, now));
  }
  if (path === "/verified" && request.method === "POST") {
    return verified(request, env, origin, account, now);
  }
  if (path === "/auth/link-ticket" && request.method === "POST") {
    return json(origin, 200, {
      ticket: await signValue(
        "link",
        { a: account, e: now + LINK_TICKET_MS },
        env.stateKey
      ),
    });
  }
  const unlink = /^\/me\/identities\/(\w+)$/.exec(path);
  if (unlink && request.method === "DELETE" && isProvider(unlink[1])) {
    const result = await unlinkIdentity(env.db, account, unlink[1]);
    if (result === "last") return json(origin, 409, { error: "last" });
    return json(origin, 204);
  }
  if (path === "/auth/sign-out" && request.method === "POST") {
    await endSession(env.db, token);
    return json(origin, 204);
  }
  return json(origin, 404, { error: "notFound" });
}

/** The API's paths; anything else is simply not found. */
const isApiPath = (path: string) =>
  path === "/auth/session" ||
  path === "/auth/link-ticket" ||
  path === "/auth/sign-out" ||
  path === "/me" ||
  path === "/me/data" ||
  path === "/me/profile" ||
  path === "/me/progress" ||
  path === "/room-pass" ||
  path === "/verified" ||
  /^\/me\/identities\/\w+$/.test(path);

/** `POST /verified`: a daily started or finished, or a room's receipt. */
async function verified(
  request: Request,
  env: AccountsEnv,
  origin: string,
  account: string,
  now: number
): Promise<Response> {
  const bytes = new Uint8Array(await request.arrayBuffer());
  if (bytes.length > MAX_VERIFIED_BODY) {
    return json(origin, 413, { error: "tooBig" });
  }
  let body: Record<string, unknown> | null = null;
  try {
    const value: unknown = JSON.parse(new TextDecoder().decode(bytes));
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      body = value as Record<string, unknown>;
    }
  } catch {
    body = null;
  }
  if (!body) return json(origin, 400, { error: "bad" });

  if (body.action === "start" || body.action === "finish") {
    const answer = await (body.action === "start" ? startDaily : finishDaily)(
      env.db,
      account,
      body,
      now
    );
    return json(origin, answer.status, answer.body);
  }
  if (body.action === "room") {
    if (!env.roomPassKey) return json(origin, 503, { error: "unavailable" });
    const receipt = await readRoomReceipt(body.receipt, env.roomPassKey, now);
    if (!receipt) return json(origin, 400, { error: "receipt" });
    const status = await recordRoomResult(env.db, account, receipt);
    return status === "notYours"
      ? json(origin, 403, { error: "notYours" })
      : json(origin, 200, { status });
  }
  return json(origin, 400, { error: "bad" });
}

async function readJson(
  request: Request
): Promise<Record<string, unknown> | null> {
  try {
    const value: unknown = await request.json();
    return typeof value === "object" && value !== null
      ? (value as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

/** `GET /auth/<provider>/start`: off to Google's or Discord's page. */
async function start(
  request: Request,
  env: AccountsEnv,
  provider: Provider,
  now: number
): Promise<Response> {
  const params = new URL(request.url).searchParams;
  const page = pageToReturnTo(params.get("back"), env.localDev);
  const nonce = params.get("nonce") ?? "";
  if (!page || !NONCE.test(nonce)) {
    return plainPage(
      400,
      "This sign-in link isn't right. Go back and try again."
    );
  }
  if (!(await allowed(env.signInLimit, env.limitKey))) {
    return failBack(page, nonce, "slow");
  }

  // Linking: the account comes from a ticket the signed-in page asked for.
  let link: string | undefined;
  const ticket = params.get("ticket");
  if (ticket) {
    const value = await readSigned("link", ticket, env.stateKey);
    if (!value || typeof value.a !== "string" || !fresh(value.e, now)) {
      return failBack(page, nonce, "expired");
    }
    link = value.a;
  }

  const keys = keysOf(env, provider);
  if (!keys && !env.fakeSignIn) return failBack(page, nonce, "unavailable");
  const state = await signValue(
    "state",
    {
      p: provider,
      n: nonce,
      b: page,
      e: now + SIGN_IN_STATE_MS,
      ...(link ? { l: link } : {}),
    },
    env.stateKey
  );
  const to = env.fakeSignIn
    ? `${new URL(request.url).origin}/auth/fake?${new URLSearchParams({
        provider,
        state,
      })}`
    : authorizeUrl(
        provider,
        keys!.clientId,
        callbackOf(request, provider),
        state
      );
  return new Response(null, {
    status: 302,
    headers: { Location: to, "Cache-Control": "no-store" },
  });
}

const fresh = (expires: unknown, now: number) =>
  typeof expires === "number" && expires >= now;

/** `GET /auth/<provider>/callback`: their answer, and back to the page. */
async function callback(
  request: Request,
  env: AccountsEnv,
  provider: Provider,
  now: number
): Promise<Response> {
  const params = new URL(request.url).searchParams;
  const state = await readSigned(
    "state",
    params.get("state") ?? "",
    env.stateKey
  );
  const page =
    state && typeof state.b === "string"
      ? pageToReturnTo(state.b, env.localDev)
      : null;
  const nonce = state && typeof state.n === "string" ? state.n : "";
  if (!state || !page || state.p !== provider || !NONCE.test(nonce)) {
    return plainPage(
      400,
      "This sign-in has expired or isn't right. Go back to Blue Archive Heardle and try again."
    );
  }
  if (!fresh(state.e, now)) return failBack(page, nonce, "expired");

  const code = params.get("code");
  if (params.get("error") || !code) return failBack(page, nonce, "cancelled");

  let subject: string;
  try {
    subject = await subjectOf(request, env, provider, code);
  } catch (error) {
    if (error instanceof ProviderError) return failBack(page, nonce, "failed");
    throw error;
  }

  if (typeof state.l === "string") {
    const result = await linkIdentity(env.db, state.l, provider, subject, now);
    return result === "linked" || result === "already"
      ? backTo(page, { linked: provider, nonce })
      : failBack(page, nonce, result);
  }

  const account =
    (await findIdentity(env.db, provider, subject)) ??
    (await createAccount(env.db, provider, subject, now));
  return backTo(page, {
    auth: await createSignInCode(env.db, account, now),
    nonce,
  });
}

/** The person's id at the provider, or the stand-in's, locally. */
async function subjectOf(
  request: Request,
  env: AccountsEnv,
  provider: Provider,
  code: string
): Promise<string> {
  if (env.fakeSignIn) {
    const subject = /^fake:([\w-]{1,40})$/.exec(code)?.[1];
    if (!subject) throw new ProviderError("bad stand-in code");
    return `fake-${subject}`;
  }
  const keys = keysOf(env, provider);
  if (!keys) throw new ProviderError("not set up");
  return exchangeCode(
    provider,
    keys,
    code,
    callbackOf(request, provider),
    env.fetcher
  );
}

const escapeHtml = (text: string) =>
  text.replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[
        char
      ]!)
  );

/**
 * The local stand-in for Google's or Discord's page: pick who to be, or
 * cancel, and it answers the callback as they would.
 */
function fakeProviderPage(url: URL): Response {
  const provider = url.searchParams.get("provider");
  const state = url.searchParams.get("state") ?? "";
  if (!isProvider(provider)) return plainPage(400, "No provider.");
  const callback = `/auth/${provider}/callback`;
  const name = PROVIDER_NAMES[provider];
  return new Response(
    `<!doctype html><meta charset="utf-8"><title>${name} (local stand-in)</title>
<body style="font-family:sans-serif;max-width:420px;margin:60px auto">
<h1>Sign in with ${name}</h1>
<p>A local stand-in for ${name}'s page, for testing only. Pick who to be:
the same name is the same ${name} account.</p>
<form method="get" action="${callback}">
<input type="hidden" name="state" value="${escapeHtml(state)}">
<input name="code" value="fake:alice" required>
<button>Sign in</button>
</form>
<p><a href="${callback}?error=access_denied&amp;state=${encodeURIComponent(
      state
    )}">Cancel</a></p>`,
    {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      },
    }
  );
}
