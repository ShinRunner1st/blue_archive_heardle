import { ACCOUNT_NONCE_KEY, ACCOUNT_SESSION_KEY } from "../constants/game";
import {
  AccountProfile,
  AccountView,
  AuthError,
  ProfileSummary,
  Provider,
} from "../types/account";
import type { AccountExport } from "../accounts/privacy";
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
  // Read a moment ago as the page opened (the progress's sync): used once.
  if (recent && Date.now() - recent.at < RECENT_MS) {
    const { state } = recent;
    recent = null;
    return state.profile;
  }
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
  profile: AccountProfile & { summary: ProfileSummary; missions?: string[] }
): Promise<AccountProfile | undefined> {
  recent = null;
  const response = await api("PUT", "/me/profile", profile);
  if (response.status === 401) {
    writeToken(null);
    return undefined;
  }
  if (!response.ok) throw new AccountsUnavailable();
  return ((await response.json()) as { profile: AccountProfile }).profile;
}

/** What the account has: its profile, and which progress (not the save). */
export interface AccountState {
  profile: AccountProfile | null;
  progress: { format: number; revision: number } | null;
}

/**
 * The state read last, kept a few seconds so the profile's sync, straight
 * after the progress's as the page opens, needs no request of its own.
 */
const RECENT_MS = 30_000;
let recent: { state: AccountState; at: number } | null = null;

/** The account's profile and progress revision; undefined if signed out. */
export async function fetchAccountState(): Promise<AccountState | undefined> {
  if (!readToken()) return undefined;
  const response = await api("GET", "/me/profile");
  if (response.status === 401) {
    writeToken(null);
    return undefined;
  }
  if (!response.ok) throw new AccountsUnavailable();
  const state = (await response.json()) as AccountState;
  recent = { state, at: Date.now() };
  return state;
}

/** The account's save, gzipped, with its revision; null if it has none. */
export async function downloadProgress(): Promise<
  { revision: number; format: number; data: Uint8Array } | null | undefined
> {
  if (!readToken()) return undefined;
  const response = await api("GET", "/me/progress");
  if (response.status === 401) {
    writeToken(null);
    return undefined;
  }
  if (response.status === 204) return null;
  if (!response.ok) throw new AccountsUnavailable();
  return {
    revision: Number(response.headers.get("X-Revision")),
    format: Number(response.headers.get("X-Format")),
    data: new Uint8Array(await response.arrayBuffer()),
  };
}

export type UploadResult =
  | { ok: true; revision: number }
  | { ok: false; why: "conflict" | "format"; revision: number; format: number }
  | { ok: false; why: "signedOut" | "tooBig" };

/**
 * Sends the save, built on the account's revision `base`. With `backup`,
 * the account keeps a copy of what it writes over (a merge). Small enough,
 * it goes with `keepalive`, so a tab closing doesn't stop it. The revision
 * and format ride in headers, so the address is the same every time and
 * the browser's CORS preflight for it is reused (2 hours), not asked
 * again for each upload.
 */
export async function uploadProgress(
  data: Uint8Array<ArrayBuffer>,
  base: number,
  format: number,
  backup: boolean
): Promise<UploadResult> {
  const token = readToken();
  if (!token) return { ok: false, why: "signedOut" };
  let response: Response;
  try {
    response = await fetch(`${accountsUrl()}/me/progress`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/octet-stream",
        "X-Base": String(base),
        "X-Format": String(format),
        ...(backup ? { "X-Backup": "1" } : {}),
      },
      body: data,
      credentials: "omit",
      referrerPolicy: "no-referrer",
      keepalive: data.length < 60_000,
    });
  } catch {
    throw new AccountsUnavailable();
  }
  if (response.status === 401) {
    writeToken(null);
    return { ok: false, why: "signedOut" };
  }
  if (response.status === 413) return { ok: false, why: "tooBig" };
  if (response.status === 409) {
    const body = (await response.json()) as {
      error: "conflict" | "format";
      revision: number;
      format: number;
    };
    return {
      ok: false,
      why: body.error === "format" ? "format" : "conflict",
      revision: body.revision,
      format: body.format,
    };
  }
  if (!response.ok) throw new AccountsUnavailable();
  return {
    ok: true,
    revision: ((await response.json()) as { revision: number }).revision,
  };
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

/**
 * A room pass for the account signed in (step 4), and when it runs out;
 * null if signed out, or the Worker can't make one (no key set there).
 * The pass is held in the page's memory only, and goes to a room in its
 * hello: never into storage, an address or the page.
 */
export async function fetchRoomPass(): Promise<{
  pass: string;
  expires: number;
} | null> {
  if (!readToken()) return null;
  const response = await api("GET", "/room-pass");
  if (response.status === 401) {
    writeToken(null);
    return null;
  }
  if (response.status === 503) return null;
  if (!response.ok) throw new AccountsUnavailable();
  return (await response.json()) as { pass: string; expires: number };
}

/**
 * Deletes the account and everything kept for it (step 5); throws if the
 * accounts can't be reached, and nothing is deleted. Its token goes with
 * it.
 */
export async function deleteAccount(): Promise<void> {
  const response = await api("DELETE", "/me");
  if (!response.ok && response.status !== 401) throw new AccountsUnavailable();
  writeToken(null);
  recent = null;
}

/**
 * Everything kept for the account, for "Download my data", its progress
 * still gzipped (accountData.ts opens it); null if signed out.
 */
export async function fetchAccountData(): Promise<AccountExport | null> {
  if (!readToken()) return null;
  const response = await api("GET", "/me/data");
  if (response.status === 401) {
    writeToken(null);
    return null;
  }
  if (!response.ok) throw new AccountsUnavailable();
  return (await response.json()) as AccountExport;
}

/** Test seam: a new page, as far as this module's memory goes. */
export function resetAccountClientState(): void {
  finishing = null;
  recent = null;
}
