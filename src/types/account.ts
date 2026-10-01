/**
 * Accounts (docs/accounts.md): what the accounts Worker and the page agree
 * on. Shared, so the two can't drift apart.
 */

/** Where an account can sign in from. */
export const PROVIDERS = ["google", "discord"] as const;
export type Provider = (typeof PROVIDERS)[number];

export const PROVIDER_NAMES: Record<Provider, string> = {
  google: "Google",
  discord: "Discord",
};

export const isProvider = (value: unknown): value is Provider =>
  PROVIDERS.includes(value as Provider);

/** One way into an account. Only which provider, never the person's id. */
export interface IdentityView {
  provider: Provider;
  /** When it was linked, in epoch milliseconds. */
  linkedAt: number;
}

/** The signed-in player's account, as `GET /me` gives it. */
export interface AccountView {
  /** What other players will see; never the account's own id. */
  publicId: string;
  createdAt: number;
  identities: IdentityView[];
}

/**
 * Why a sign-in or link came back without one, in the page's address after
 * `#authError=`:
 * - cancelled: the player said no on Google's or Discord's page;
 * - taken: that Google or Discord is already another account's;
 * - has: this account already has one from that provider;
 * - expired: the sign-in took longer than its 10 minutes;
 * - unavailable: sign-in with that provider isn't set up;
 * - slow: too many tries from here; wait a minute;
 * - failed: anything else.
 */
export const AUTH_ERRORS = [
  "cancelled",
  "taken",
  "has",
  "expired",
  "unavailable",
  "slow",
  "failed",
] as const;
export type AuthError = (typeof AUTH_ERRORS)[number];

export const isAuthError = (value: unknown): value is AuthError =>
  AUTH_ERRORS.includes(value as AuthError);

/** How long the one-time sign-in code in the address lasts. */
export const SIGN_IN_CODE_MS = 60_000;
/** How long a sign-in on Google's or Discord's page may take. */
export const SIGN_IN_STATE_MS = 10 * 60_000;
/** How long a link ticket lasts: asked for just before the redirect. */
export const LINK_TICKET_MS = 60_000;
/** A session ends after this long unused. */
export const SESSION_MS = 90 * 24 * 60 * 60_000;
