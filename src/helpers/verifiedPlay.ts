import React from "react";

import { VERIFIED_KEY } from "../constants/game";
import { VerifiedOutcome } from "../types/verified";
import { accountsEnabled, hasSession } from "./accountFlag";
import type { DailyMoves, VerifiedDaily } from "./verifiedDaily";

/**
 * Verified dailies and room receipts, the page's side (docs/verified-stats.md,
 * sections 5, 6 and 8): what the server issued for the account signed in,
 * and the finishes and receipts kept until it takes them. The part that
 * comes with the page: a guest's page only ever checks it has no session.
 * The requests are verifiedSync.ts's, fetched when there's one to make.
 *
 * Kept under its own key, apart from the saves: the game plays and saves
 * every daily as it does for a guest, and nothing here is read by the save
 * file, progress sync, a merge or the profile's summary, nor reads them. A
 * round only counts as verified when the server judged it from an attempt
 * it issued before the round was played.
 */

/** Why a daily is played unverified; the result screen says so. */
export type NotVerified =
  /** The page's day isn't the account's (a device's date, or its zone). */
  | "day"
  /** The account has a later day already (a zone moved west). */
  | "behind"
  /** The start couldn't reach the account: never issued, so personal. */
  | "offline"
  /** Finished after its deadline: closed, counted as abandoned. */
  | "late"
  /** The server doesn't know the attempt, or refused the round. */
  | "refused";

export interface VerifiedEntry {
  daily: VerifiedDaily;
  day: number;
  /**
   * - `starting`: asked the server to issue it, as the daily first played;
   * - `playing`: issued, its attempt held;
   * - `finishing`: the round is over, its finish kept until the server
   *   takes it;
   * - `verified`: judged by the server;
   * - `elsewhere`: played verified on another device already;
   * - `personal`: played unverified, for `why`.
   */
  state:
    | "starting"
    | "playing"
    | "finishing"
    | "verified"
    | "elsewhere"
    | "personal";
  /** When the start was asked for: one not answered soon is given up. */
  askedAt: number;
  attempt?: string;
  /** The round's moves, kept from its end until the server takes them. */
  moves?: DailyMoves;
  /** A finish went once without an answer: the next is a retry. */
  sent?: boolean;
  outcome?: VerifiedOutcome;
  tries?: number | null;
  /** The server timed it, finished straight away (section 6). */
  timeVerified?: boolean;
  why?: NotVerified;
}

export interface VerifiedStore {
  entries: VerifiedEntry[];
  /** Room receipts not yet taken, as the room signed them. */
  receipts: string[];
}

/** Dailies kept after their day: a late finish's, and a few to show. */
const KEEP_DAYS = 7;
/** Receipts kept at most: a long evening's games, sent when they can be. */
const MOST_RECEIPTS = 20;

const EMPTY: VerifiedStore = { entries: [], receipts: [] };

function load(): VerifiedStore {
  try {
    const value: unknown = JSON.parse(
      localStorage.getItem(VERIFIED_KEY) ?? "null"
    );
    if (typeof value !== "object" || value === null) return EMPTY;
    const { entries, receipts } = value as Partial<VerifiedStore>;
    return {
      entries: Array.isArray(entries)
        ? entries.filter(
            (entry) =>
              typeof entry === "object" &&
              entry !== null &&
              typeof entry.daily === "string" &&
              Number.isSafeInteger(entry.day) &&
              typeof entry.state === "string"
          )
        : [],
      receipts: Array.isArray(receipts)
        ? receipts.filter((receipt) => typeof receipt === "string")
        : [],
    };
  } catch {
    return EMPTY;
  }
}

let store: VerifiedStore | null = null;
const listeners = new Set<() => void>();

/** What's kept now, read once a page and kept in step with other tabs. */
export function readVerifiedStore(): VerifiedStore {
  if (!store) {
    store = load();
    globalThis.addEventListener?.("storage", (event) => {
      if (event.key !== VERIFIED_KEY && event.key !== null) return;
      store = load();
      listeners.forEach((listener) => listener());
    });
  }
  return store;
}

/** Changes what's kept, and tells whatever shows it. */
export function updateVerifiedStore(
  change: (current: VerifiedStore) => VerifiedStore
): void {
  const next = change(readVerifiedStore());
  const newest = Math.max(0, ...next.entries.map(({ day }) => day));
  store = {
    entries: next.entries.filter(({ day }) => day >= newest - KEEP_DAYS),
    receipts: next.receipts.slice(-MOST_RECEIPTS),
  };
  try {
    if (store.entries.length || store.receipts.length) {
      localStorage.setItem(VERIFIED_KEY, JSON.stringify(store));
    } else localStorage.removeItem(VERIFIED_KEY);
  } catch {
    // Kept in this page's memory only.
  }
  listeners.forEach((listener) => listener());
}

/** Changes one daily's entry, if there is one. */
export function updateEntry(
  daily: VerifiedDaily,
  day: number,
  change: (entry: VerifiedEntry) => VerifiedEntry
): void {
  updateVerifiedStore((current) => ({
    ...current,
    entries: current.entries.map((entry) =>
      entry.daily === daily && entry.day === day ? change(entry) : entry
    ),
  }));
}

export const entryOf = (daily: VerifiedDaily, day: number) =>
  readVerifiedStore().entries.find(
    (entry) => entry.daily === daily && entry.day === day
  );

/** Whether verified play is on for this page: signed in, accounts on. */
const verifiedOn = () => accountsEnabled() && hasSession();

/** Sends whatever is kept, with the code that does it, fetched now. */
function sync(): void {
  // One after another: a start's answer comes before its finish is sent.
  running = running
    .then(() => import("./verifiedSync"))
    .then(({ syncVerified }) => syncVerified())
    .catch(() => {});
}

let running: Promise<void> = Promise.resolve();

/** Once everything asked to be sent so far has been tried. */
export const verifiedSettled = (): Promise<void> => running;

/**
 * A daily first plays (the OST's first clip, Voice's first line, the
 * picture shown, Students' first guess sent): signed in, the server is
 * asked to issue its attempt. Never for a daily already touched here
 * (`untouched` false: played as a guest, offline or before signing in),
 * which stays personal, nor twice: one asked for once, whatever came of
 * it, is never asked for again, so a start that failed can't become a
 * verified result later.
 */
export function verifiedStart(
  daily: VerifiedDaily,
  day: number | undefined,
  untouched: boolean
): void {
  if (!verifiedOn() || day === undefined || !untouched) return;
  if (entryOf(daily, day)) return;
  updateVerifiedStore((current) => ({
    ...current,
    entries: [
      ...current.entries,
      { daily, day, state: "starting", askedAt: Date.now() },
    ],
  }));
  sync();
}

/**
 * A daily's round ended on screen: its moves, from the save's round, are
 * kept and sent to be judged, if the server issued it (or is still being
 * asked). Nothing for a daily played unverified, or finished already.
 */
export function verifiedRoundOver(
  daily: VerifiedDaily,
  day: number | undefined,
  moves: () => DailyMoves
): void {
  if (day === undefined) return;
  const entry = entryOf(daily, day);
  if (!entry || entry.moves) return;
  if (entry.state !== "starting" && entry.state !== "playing") return;
  updateEntry(daily, day, (current) => ({
    ...current,
    moves: moves(),
    ...(current.state === "playing" ? { state: "finishing" as const } : {}),
  }));
  sync();
}

/** A receipt a room sent this player, kept until the account takes it. */
export function keepReceipt(receipt: string): void {
  if (!verifiedOn() || readVerifiedStore().receipts.includes(receipt)) {
    return;
  }
  updateVerifiedStore((current) => ({
    ...current,
    receipts: [...current.receipts, receipt],
  }));
  sync();
}

/** Whether anything kept waits to be sent. */
const hasWaiting = () => {
  const { entries, receipts } = readVerifiedStore();
  return (
    receipts.length > 0 ||
    entries.some(
      (entry) => entry.state === "starting" || entry.state === "finishing"
    )
  );
};

/**
 * Signed in: what was kept is sent as the page opens and when it comes
 * back online. No request at all with nothing kept, as is usual.
 */
export function startVerifiedSync(): void {
  if (!verifiedOn()) return;
  const flush = () => {
    if (verifiedOn() && hasWaiting()) sync();
  };
  flush();
  window.addEventListener("online", flush);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") flush();
  });
}

/**
 * The session changed (signed in, out, or gone stale): what was kept
 * belonged to the account before, so it goes.
 */
export function forgetVerified(): void {
  updateVerifiedStore(() => EMPTY);
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** A daily's entry, as it changes; undefined for none. */
export function useVerifiedEntry(
  daily: VerifiedDaily | null,
  day: number | undefined
): VerifiedEntry | undefined {
  return React.useSyncExternalStore(subscribe, () =>
    daily === null || day === undefined ? undefined : entryOf(daily, day)
  );
}

/** Test seam: a new page, as far as this module's memory goes. */
export function resetVerifiedState(): void {
  store = null;
  listeners.clear();
}
