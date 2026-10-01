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

interface Env {
  DB: D1Database;
  /** Signs a sign-in's state and link tickets. A secret. */
  STATE_KEY?: string;
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

const limiter = (limit?: RateLimit) =>
  limit
    ? async (key: string) => (await limit.limit({ key })).success
    : undefined;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (!env.STATE_KEY) {
      return new Response("Accounts aren't set up here.", { status: 503 });
    }
    const local = ["localhost", "127.0.0.1"].includes(
      new URL(request.url).hostname
    );
    const accounts: AccountsEnv = {
      db: env.DB,
      stateKey: env.STATE_KEY,
      google: keys(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET),
      discord: keys(env.DISCORD_CLIENT_ID, env.DISCORD_CLIENT_SECRET),
      fakeSignIn: env.FAKE_SIGN_IN === "yes" && local,
      signInLimit: limiter(env.SIGN_IN_LIMIT),
      apiLimit: limiter(env.API_LIMIT),
      limitKey: await counterKey(request),
    };
    try {
      return await handle(request, accounts);
    } catch {
      // Nothing about the request is logged; the page is told it failed.
      return new Response(JSON.stringify({ error: "failed" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
};
