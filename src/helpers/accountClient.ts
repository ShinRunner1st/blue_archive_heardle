import { ACCOUNT_NONCE_KEY, ACCOUNT_SESSION_KEY } from "../constants/game";
import {
  AccountProfile,
  AccountView,
  AuthError,
  ProfileSummary,
  Provider,
} from "../types/account";
import { accountsUrl, pendingSignInReturn } from "./accountFlag";

/**
 * The page's side of accounts (docs/accounts.md, section 2), loaded with
 * the profile. The session token is a credential: it is read here and sent
 * only in the Authorization header to the accounts Worker; nothing shows
 * it, logs it, or puts it in an address, a save file or a room.
 */

function readToken(): string | null {
  try {
    return localStorage.getItem(ACCOUNT_SESSION_KEY);
  } catch {
    return null;
  }
}

function writeToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(ACCOUNT_SESSION_KEY, token);
    else localStorage.removeItem(ACCOUNT_SESSION_KEY);
  } catch {
    // Not kept: this page is signed in until it closes.
  }
}

export const isSignedIn = () => readToken() !== null;

/** The accounts Worker couldn't be reached, or answered with a failure. */
export class AccountsUnavailable extends Error {}

async function api(
  method: string,
  path: string,
  body?: unknown
): Promise<Response> {
  const token = readToken();
  try {
    return await fetch(`${accountsUrl()}${path}`, {
      method,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      // Never sends cookies (there are none), and never a Referer.
      credentials: "omit",
      referrerPolicy: "no-referrer",
    });
  } catch {
    throw new AccountsUnavailable();
  }
}

function newNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    ""
  );
}

/**
 * Off to sign in with Google or Discord, by way of the accounts Worker; to
 * link one to the account signed in, with a ticket asked for first. The
 * page comes back to where it is, its result in the address's `#` part.
 */
export async function startSignIn(
  provider: Provider,
  link = false
): Promise<void> {
  let ticket: string | undefined;
  if (link) {
    const response = await api("POST", "/auth/link-ticket");
    if (!response.ok) throw new AccountsUnavailable();
    ticket = ((await response.json()) as { ticket: string }).ticket;
  }
  const nonce = newNonce();
  try {
    sessionStorage.setItem(ACCOUNT_NONCE_KEY, nonce);
  } catch {
    // Without it the return can't be checked, so it will be refused.
  }
  const { origin, pathname, search } = window.location;
  const query = new URLSearchParams({
    nonce,
    back: origin + pathname + search,
    ...(ticket ? { ticket } : {}),
  });
  window.location.assign(
    `${accountsUrl()}/auth/${provider}/start?${query.toString()}`
  );
}

/** What a sign-in that just came back did, for the profile to say. */
export type SignInNotice =
  | { kind: "signedIn" }
  | { kind: "linked"; provider: Provider }
  | { kind: "error"; error: AuthError };

let finishing: Promise<SignInNotice | null> | null = null;

/**
 * Finishes a sign-in the page came back from (see takeSignInReturn): its
 * nonce must be the one this tab sent, so nobody can sign a player in to
 * an account of theirs; then the one-time code is swapped for a session.
 * Once a page load: everything that asks gets the same answer, so a panel
 * drawn twice can't read the account before the token is kept.
 */
export function finishSignIn(): Promise<SignInNotice | null> {
  finishing ??= swapSignIn();
  return finishing;
}

async function swapSignIn(): Promise<SignInNotice | null> {
  const returned = pendingSignInReturn();
  if (!returned) return null;
  let sent: string | null = null;
  try {
    sent = sessionStorage.getItem(ACCOUNT_NONCE_KEY);
    sessionStorage.removeItem(ACCOUNT_NONCE_KEY);
  } catch {
    // No nonce to check against: refused below.
  }
  if (!sent || sent !== returned.nonce) {
    return { kind: "error", error: "failed" };
  }
  if ("error" in returned) return { kind: "error", error: returned.error };
  if ("linked" in returned) {
    return { kind: "linked", provider: returned.linked };
  }
  const response = await api("POST", "/auth/session", {
    code: returned.code,
  });
  if (!response.ok) {
    return {
      kind: "error",
      error: response.status === 429 ? "slow" : "expired",
    };
  }
  writeToken(((await response.json()) as { token: string }).token);
  return { kind: "signedIn" };
}

/** The account signed in, or null for none (a token gone stale is dropped). */
export async function fetchAccount(): Promise<AccountView | null> {
  if (!readToken()) return null;
  const response = await api("GET", "/me");
  if (response.status === 401) {
    writeToken(null);
    return null;
  }
  if (!response.ok) throw new AccountsUnavailable();
  return (await response.json()) as AccountView;
}

/**
 * The account's profile, null before it has one; undefined if not signed
 * in (a stale token is dropped).
 */
export async function fetchProfile(): Promise<
  AccountProfile | null | undefined
> {
  if (!readToken()) return undefined;
  const response = await api("GET", "/me/profile");
  if (response.status === 401) {
    writeToken(null);
    return undefined;
  }
  if (!response.ok) throw new AccountsUnavailable();
  return ((await response.json()) as { profile: AccountProfile | null })
    .profile;
}

/** Sends the profile and its summary; the account's copy as kept after. */
export async function putProfile(
  profile: AccountProfile & { summary: ProfileSummary }
): Promise<AccountProfile | undefined> {
  const response = await api("PUT", "/me/profile", profile);
  if (response.status === 401) {
    writeToken(null);
    return undefined;
  }
  if (!response.ok) throw new AccountsUnavailable();
  return ((await response.json()) as { profile: AccountProfile }).profile;
}

/** Unlinks a provider; false if it's the account's last way in. */
export async function unlinkProvider(provider: Provider): Promise<boolean> {
  const response = await api("DELETE", `/me/identities/${provider}`);
  if (response.status === 409) return false;
  if (!response.ok) throw new AccountsUnavailable();
  return true;
}

/** Signs this browser out: its token is ended at the Worker and dropped. */
export async function signOut(): Promise<void> {
  try {
    await api("POST", "/auth/sign-out");
  } finally {
    writeToken(null);
  }
}
