/**
 * Accounts (docs/accounts.md): sign-in with Google or Discord, accounts
 * and their sessions, in the D1 database. The requests themselves are
 * src/accounts/api.ts, tested there; this file only connects them to
 * Cloudflare: D1, the secrets and the rate limits.
 *
 * Nothing is logged (observability is off in wrangler.jsonc, and there's no
 * console call): a request's headers can hold a session token.
 */
import { AccountsEnv, handle } from "../src/accounts/api";
import { measured, Tally } from "../src/accounts/measure";
import { tidyAccounts } from "../src/accounts/privacy";
import { makeRoomReceipt, newRoomGameId } from "../src/accounts/roomReceipt";
import {
  isDay,
  isVerifiedDaily,
  verifiedAnswer,
} from "../src/helpers/verifiedDaily";

interface Env {
  DB: D1Database;
  /** Signs a sign-in's state and link tickets. A secret. */
  STATE_KEY?: string;
  /** Signs room passes; the rooms Worker has the same one. A secret. */
  ROOM_PASS_KEY?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  DISCORD_CLIENT_ID?: string;
  DISCORD_CLIENT_SECRET?: string;
  /**
   * "yes" only from `npm run accounts`, which runs this locally: Google's
   * and Discord's pages are stood in for, so it all works without them.
   * Honoured on localhost only, so a deployed Worker never has it.
   */
  FAKE_SIGN_IN?: string;
  /**
   * "yes" only from `npm run accounts` and `accounts:measure`: a local dev
   * server's pages (`http://localhost:<port>`) may call it and be signed
   * in to. On localhost only, like FAKE_SIGN_IN, so a deployed Worker
   * takes the site's own pages and nothing else.
   */
  LOCAL_DEV?: string;
  /**
   * "yes" only from `npm run accounts:measure`: each answer says what it
   * cost D1 (rows read and written) in headers, for the measurements in
   * docs/accounts.md, section 6. On localhost only, like FAKE_SIGN_IN.
   * With it, and only with it, a request may set the clock
   * (`X-Measure-Now`), `/__measure/answer` gives a daily's answer to win
   * with and `/__measure/receipt` signs a room's receipt, to
   * measure verified stats (docs/verified-stats.md, section 12).
   */
  MEASURE?: string;
  /** Sign-ins, and the rest, per address a minute. */
  SIGN_IN_LIMIT?: RateLimit;
  API_LIMIT?: RateLimit;
}

const keys = (id?: string, secret?: string) =>
  id && secret ? { clientId: id, clientSecret: secret } : undefined;

/**
 * The key an address is counted under: a hash of it, so the address itself
 * isn't handed on even to the counter, which forgets it within the minute.
 */
async function counterKey(request: Request): Promise<string> {
  const address = request.headers.get("CF-Connecting-IP") ?? "local";
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`ba-heardle-accounts/${address}`)
  );
  return Array.from(new Uint8Array(digest).slice(0, 12), (b) =>
    b.toString(16).padStart(2, "0")
  ).join("");
}

/** A measured answer: what the request cost D1, in headers. */
function tallied(response: Response, tally: Tally): Response {
  const copy = new Response(response.body, response);
  copy.headers.set("X-D1-Read", String(tally.read));
  copy.headers.set("X-D1-Written", String(tally.written));
  copy.headers.set("X-D1-Queries", String(tally.queries));
  copy.headers.set("X-D1-Each", JSON.stringify(tally.each ?? []));
  return copy;
}

const limiter = (limit?: RateLimit) =>
  limit
    ? async (key: string) => (await limit.limit({ key })).success
    : undefined;

export default {
  /**
   * Once a day (the cron in wrangler.jsonc): the accounts unused for two
   * years are deleted, as the privacy policy says, and the sessions and
   * sign-in codes that ran out. Nothing is logged.
   */
  async scheduled(_controller: ScheduledController, env: Env): Promise<void> {
    await tidyAccounts(env.DB, Date.now());
  },

  async fetch(request: Request, env: Env): Promise<Response> {
    if (!env.STATE_KEY) {
      return new Response("Accounts aren't set up here.", { status: 503 });
    }
    const local = ["localhost", "127.0.0.1"].includes(
      new URL(request.url).hostname
    );
    const tally: Tally = { read: 0, written: 0, queries: 0, each: [] };
    const measuring = env.MEASURE === "yes" && local;
    const db = measuring ? measured(env.DB, tally) : env.DB;
    // Measuring only: the clock can be set, to measure a late finish or a
    // closed attempt days later, and a room's receipt made, as the rooms
    // will (docs/verified-stats.md).
    const setClock = Number(request.headers.get("X-Measure-Now"));
    const now =
      measuring && Number.isSafeInteger(setClock) && setClock > 0
        ? () => setClock
        : undefined;
    if (measuring && new URL(request.url).pathname === "/__measure/tidy") {
      await tidyAccounts(db, Date.now());
      return tallied(new Response(null, { status: 204 }), tally);
    }
    if (measuring && new URL(request.url).pathname === "/__measure/answer") {
      // A daily's answer, for the measuring script to play a win with.
      const params = new URL(request.url).searchParams;
      const game = params.get("game");
      const day = Number(params.get("day"));
      if (!isVerifiedDaily(game) || !isDay(day)) {
        return new Response(null, { status: 400 });
      }
      return Response.json(verifiedAnswer(game, day));
    }
    if (measuring && new URL(request.url).pathname === "/__measure/receipt") {
      const params = new URL(request.url).searchParams;
      const receipt = await makeRoomReceipt(
        {
          gameId: params.get("game") ?? newRoomGameId(),
          publicId: params.get("public") ?? "",
          game: "ost",
          answers: "typed",
          rounds: 10,
          players: 4,
          place: Number(params.get("place") ?? 1),
          score: 7,
          endedAt: now ? now() : Date.now(),
        },
        env.ROOM_PASS_KEY ?? ""
      );
      return new Response(receipt);
    }
    const accounts: AccountsEnv = {
      db,
      stateKey: env.STATE_KEY,
      roomPassKey: env.ROOM_PASS_KEY || undefined,
      google: keys(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET),
      discord: keys(env.DISCORD_CLIENT_ID, env.DISCORD_CLIENT_SECRET),
      fakeSignIn: env.FAKE_SIGN_IN === "yes" && local,
      localDev: env.LOCAL_DEV === "yes" && local,
      signInLimit: limiter(env.SIGN_IN_LIMIT),
      apiLimit: limiter(env.API_LIMIT),
      limitKey: await counterKey(request),
      now,
    };
    try {
      const response = await handle(request, accounts);
      return measuring ? tallied(response, tally) : response;
    } catch {
      // Nothing about the request is logged; the page is told it failed.
      return new Response(JSON.stringify({ error: "failed" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
};
