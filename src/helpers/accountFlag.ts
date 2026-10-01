import { ACCOUNT_SESSION_KEY } from "../constants/game";
import { AuthError, isAuthError, isProvider, Provider } from "../types/account";

/**
 * Whether accounts are on, and what a sign-in brought back: the only part of
 * accounts in the page's first load. The rest (accountClient.ts) comes with
 * the profile. Accounts are off on baheardle.com until their release
 * (docs/accounts.md): only the dev server and the site's preview have an
 * accounts Worker to sign in with.
 */
export function accountsUrl(): string {
  return (
    import.meta.env.VITE_ACCOUNTS_URL ||
    (import.meta.env.DEV ? "http://localhost:8788" : "")
  );
}

export const accountsEnabled = () => accountsUrl() !== "";

/** Whether this browser is signed in: a session token is kept. */
export function hasSession(): boolean {
  try {
    return localStorage.getItem(ACCOUNT_SESSION_KEY) !== null;
  } catch {
    return false;
  }
}

/**
 * Syncs the profile with the account, if signed in: as the page opens,
 * and after the profile is changed. Its code comes only then, so a page
 * that isn't signed in (every one on baheardle.com, until accounts are
 * released) never fetches it. Failing quietly: the profile is kept here
 * whatever, and the next sync catches up.
 */
export function requestProfileSync(): void {
  if (!accountsEnabled() || !hasSession()) return;
  import("./profileSync")
    .then(({ syncProfile }) => syncProfile())
    .catch(() => {});
}

/** What the accounts Worker sent the page back with, in its `#` part. */
export type SignInReturn =
  | { nonce: string; code: string }
  | { nonce: string; linked: Provider }
  | { nonce: string; error: AuthError };

let pending: SignInReturn | null = null;

/**
 * Takes a sign-in's result out of the address as the page loads, before
 * anything draws: the one-time code mustn't stay in the address bar, the
 * history or a link copied from it. Kept in memory until the profile, which
 * opens by itself, swaps it (see accountClient.ts). Whether there was one.
 */
export function takeSignInReturn(): boolean {
  if (!accountsEnabled() || !window.location.hash) return false;
  const fields = new URLSearchParams(window.location.hash.slice(1));
  const nonce = fields.get("nonce");
  const code = fields.get("auth");
  const linked = fields.get("linked");
  const error = fields.get("authError");
  if (!nonce || !(code || linked || error)) return false;

  const { pathname, search } = window.location;
  window.history.replaceState(window.history.state, "", pathname + search);
  if (code) pending = { nonce, code };
  else if (isProvider(linked)) pending = { nonce, linked };
  else pending = { nonce, error: isAuthError(error) ? error : "failed" };
  return true;
}

/** Whether a sign-in came back with this page, still to be finished. */
export const hasSignInReturn = () => pending !== null;

/** The sign-in result taken from the address, once. */
export function pendingSignInReturn(): SignInReturn | null {
  const result = pending;
  pending = null;
  return result;
}
