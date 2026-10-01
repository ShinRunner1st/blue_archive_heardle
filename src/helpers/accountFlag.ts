import { ACCOUNT_SESSION_KEY } from "../constants/game";
import { subscribeSaved } from "./storage";
import { AuthError, isAuthError, isProvider, Provider } from "../types/account";

/**
 * Whether accounts are on, and what a sign-in brought back: the only part of
 * accounts in the page's first load. The rest (accountClient.ts) comes with
 * the profile. Accounts are on wherever the build has an accounts address
 * (docs/accounts.md): baheardle.com's, the preview's, and the dev server's
 * local Worker.
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

/** How long after the last save the progress goes up: a few rounds' worth. */
const UPLOAD_AFTER_MS = 5 * 60_000;
let uploadTimer: number | undefined;

function uploadProgress(): void {
  window.clearTimeout(uploadTimer);
  if (!hasSession()) return;
  import("./progressSync")
    .then(({ syncProgress }) =>
      // The page has drawn: the account gets this browser's save, merged
      // if it must be, and this browser takes the account's in next time.
      syncProgress({ canApply: () => false })
    )
    .catch(() => {});
}

/**
 * Signed in, as the page goes on: the progress goes up a few minutes after
 * rounds are saved, and as the tab is hidden or closed. Nothing for a page
 * that isn't signed in, as most players aren't.
 */
export function startAccountSync(): void {
  if (!accountsEnabled() || !hasSession()) return;
  subscribeSaved(() => {
    window.clearTimeout(uploadTimer);
    uploadTimer = window.setTimeout(uploadProgress, UPLOAD_AFTER_MS);
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") uploadProgress();
  });
}

/**
 * Syncs the profile with the account, if signed in: as the page opens,
 * and after the profile is changed. Its code comes only then, so a page
 * that isn't signed in never fetches it. Failing quietly: the profile is kept here
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
/** A sign-in came back with this page: the profile opens to say how it went. */
let returned = false;

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
  returned = true;
  if (code) pending = { nonce, code };
  else if (isProvider(linked)) pending = { nonce, linked };
  else pending = { nonce, error: isAuthError(error) ? error : "failed" };
  return true;
}

/**
 * Whether a sign-in came back with this page: finished before it drew (see
 * accountStartup.ts), the profile still opens on the Account tab to say so.
 */
export const hasSignInReturn = () => returned;

/** The sign-in result taken from the address, once. */
export function pendingSignInReturn(): SignInReturn | null {
  const result = pending;
  pending = null;
  return result;
}
