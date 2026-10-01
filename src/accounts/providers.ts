import { Provider } from "../types/account";
import { jwtPayload } from "./crypto";

/**
 * Signing in with Google or Discord, by the standard redirect (OAuth 2.0's
 * code flow): the browser goes to their page and comes back with a code,
 * which the Worker swaps, with its client secret, for the person's id there.
 * We ask for that id only: Google's `openid` scope, Discord's `identify`.
 * Their tokens are used once, right here, and thrown away; nothing of
 * theirs is kept but the id.
 */

export interface ProviderKeys {
  clientId: string;
  clientSecret: string;
}

/** A provider's sign-in page, for the browser to go to. */
export function authorizeUrl(
  provider: Provider,
  clientId: string,
  redirectUri: string,
  state: string
): string {
  const url =
    provider === "google"
      ? new URL("https://accounts.google.com/o/oauth2/v2/auth")
      : new URL("https://discord.com/oauth2/authorize");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", provider === "google" ? "openid" : "identify");
  url.searchParams.set("state", state);
  // Google: let the player pick which account, rather than reusing one.
  if (provider === "google") url.searchParams.set("prompt", "select_account");
  return url.toString();
}

/** What the swap can go wrong with, for the page: "failed". */
export class ProviderError extends Error {}

type Fetch = typeof fetch;

/**
 * Swaps a sign-in's code for the person's id at the provider: Google's
 * `sub`, Discord's user id.
 */
export async function exchangeCode(
  provider: Provider,
  keys: ProviderKeys,
  code: string,
  redirectUri: string,
  fetcher: Fetch = fetch
): Promise<string> {
  const form = new URLSearchParams({
    client_id: keys.clientId,
    client_secret: keys.clientSecret,
    code,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });
  const response = await fetcher(
    provider === "google"
      ? "https://oauth2.googleapis.com/token"
      : "https://discord.com/api/oauth2/token",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form,
    }
  );
  if (!response.ok) throw new ProviderError("code refused");
  const tokens = (await response.json()) as Record<string, unknown>;
  return provider === "google"
    ? googleSubject(tokens, keys.clientId)
    : discordSubject(tokens, fetcher);
}

/**
 * Google's id for the person, from the ID token in its answer. It came
 * straight from Google's token endpoint over HTTPS, so, as OpenID Connect
 * allows, the connection vouches for it and its signature isn't checked;
 * that it is Google's, for us, and current, is.
 */
function googleSubject(
  tokens: Record<string, unknown>,
  clientId: string
): string {
  const payload =
    typeof tokens.id_token === "string" ? jwtPayload(tokens.id_token) : null;
  if (
    !payload ||
    (payload.iss !== "https://accounts.google.com" &&
      payload.iss !== "accounts.google.com") ||
    payload.aud !== clientId ||
    typeof payload.exp !== "number" ||
    payload.exp * 1000 < Date.now() ||
    typeof payload.sub !== "string" ||
    !payload.sub
  ) {
    throw new ProviderError("bad ID token");
  }
  return payload.sub;
}

/** Discord's id for the person: one call with the token, then it's dropped. */
async function discordSubject(
  tokens: Record<string, unknown>,
  fetcher: Fetch
): Promise<string> {
  if (typeof tokens.access_token !== "string") {
    throw new ProviderError("no access token");
  }
  const response = await fetcher("https://discord.com/api/users/@me", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  if (!response.ok) throw new ProviderError("user refused");
  const user = (await response.json()) as Record<string, unknown>;
  if (typeof user.id !== "string" || !/^\d+$/.test(user.id)) {
    throw new ProviderError("bad user");
  }
  return user.id;
}
