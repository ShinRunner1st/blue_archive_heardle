import { VerifiedOutcome } from "../types/verified";
import { postVerified } from "./accountClient";
import { judgeDaily } from "./verifiedDaily";
import {
  entryOf,
  readVerifiedStore,
  updateEntry,
  updateVerifiedStore,
  VerifiedEntry,
} from "./verifiedPlay";

/**
 * Sends what verifiedPlay.ts keeps to the accounts Worker's `/verified`
 * (docs/verified-stats.md, sections 5, 6 and 8): a daily's start as it
 * first plays, its finish once its round is over, and room receipts. Only
 * fetched by a signed-in page with something to send.
 *
 * What fails is kept and sent again, but within the rules: a start is only
 * ever asked for as its daily begins, so one that never reached the
 * account leaves the daily personal; a finish goes again until the server
 * takes or refuses it, marked as a retry, so its time isn't counted.
 */

/** A start is tried this often, a moment apart, as its daily begins. */
const START_TRIES = 3;
const START_GAP_MS = 2000;
/**
 * A start not answered within this long of the daily's first play is given
 * up: asked for later, its attempt would begin after the round was played.
 */
export const START_WINDOW_MS = 15_000;

/** Entries and receipts being sent now, so a second sync leaves them be. */
const busy = new Set<string>();

const wait = (ms: number) =>
  new Promise((resolve) => globalThis.setTimeout(resolve, ms));

const keyOf = ({ daily, day }: VerifiedEntry) => `${daily}/${day}`;

/** The page's time zone, for the account's day (section 4). */
function zone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

/** Sends everything kept: each daily's start or finish, then the receipts. */
export async function syncVerified(): Promise<void> {
  for (const entry of readVerifiedStore().entries) {
    const key = keyOf(entry);
    if (busy.has(key)) continue;
    if (entry.state !== "starting" && entry.state !== "finishing") continue;
    busy.add(key);
    try {
      if (entry.state === "starting") await start(entry);
      else await finish(entry);
    } finally {
      busy.delete(key);
    }
  }
  if (!busy.has("receipts")) {
    busy.add("receipts");
    try {
      await sendReceipts();
    } finally {
      busy.delete("receipts");
    }
  }
}

function personal(entry: VerifiedEntry, why: VerifiedEntry["why"]): void {
  updateEntry(entry.daily, entry.day, (current) => ({
    ...current,
    state: "personal",
    why,
    moves: undefined,
  }));
}

/** Asks the server to issue the daily's attempt, a few times at most. */
async function start(entry: VerifiedEntry): Promise<void> {
  const { daily, day } = entry;
  for (let tries = 1; ; tries++) {
    if (Date.now() - entry.askedAt > START_WINDOW_MS) {
      personal(entry, "offline");
      return;
    }
    let answer;
    try {
      answer = await postVerified({
        action: "start",
        game: daily,
        day,
        zone: zone(),
      });
    } catch {
      if (tries >= START_TRIES) {
        personal(entry, "offline");
        return;
      }
      await wait(START_GAP_MS);
      continue;
    }
    // Signed out meanwhile: what was kept went with the session.
    if (!answer) return;
    const { status, body } = answer;
    if (
      status === 200 &&
      (body.status === "started" || body.status === "open") &&
      typeof body.attempt === "string"
    ) {
      const attempt = body.attempt;
      // Its round may have ended while the start was on its way.
      updateEntry(daily, day, (current) => ({
        ...current,
        attempt,
        state: current.moves ? "finishing" : "playing",
      }));
      const now = entryOf(daily, day);
      if (now?.state === "finishing") await finish(now);
      return;
    }
    if (status === 200 && body.status === "done") {
      // Played verified on another device: this one plays it personally.
      updateEntry(daily, day, (current) => ({
        ...current,
        state: "elsewhere",
        outcome: body.outcome as VerifiedOutcome,
        tries: typeof body.tries === "number" ? body.tries : null,
        moves: undefined,
      }));
      return;
    }
    personal(
      entry,
      status === 409 && body.error === "behind"
        ? "behind"
        : status === 409 && body.error === "day"
        ? "day"
        : "refused"
    );
    return;
  }
}

/** Sends a finished round's moves to be judged, until the server answers. */
async function finish(entry: VerifiedEntry): Promise<void> {
  const current = entryOf(entry.daily, entry.day);
  if (current?.state !== "finishing" || !current.attempt || !current.moves) {
    return;
  }
  const { daily, day, attempt, moves } = current;
  // Judged here first by the same rules: a round the server would refuse
  // isn't sent.
  const judged = judgeDaily(daily, day, moves);
  if (!judged.valid || judged.outcome === "playing") {
    personal(current, "refused");
    return;
  }
  const retry = current.sent === true;
  updateEntry(daily, day, (kept) => ({ ...kept, sent: true }));
  let answer;
  try {
    answer = await postVerified({
      action: "finish",
      attempt,
      guesses: [...moves.guesses],
      ...(moves.gaveUp === true ? { gaveUp: true } : {}),
      ...(retry ? { retry: true } : {}),
    });
  } catch {
    // Kept, and sent again when the page can (section 6).
    return;
  }
  if (!answer) return;
  const { status, body } = answer;
  if (status === 200) {
    updateEntry(daily, day, (kept) => ({
      ...kept,
      state: "verified",
      outcome: body.outcome as VerifiedOutcome,
      tries: typeof body.tries === "number" ? body.tries : null,
      timeVerified: body.timeVerified === true,
      moves: undefined,
    }));
    return;
  }
  personal(
    current,
    status === 409 && (body.error === "late" || body.error === "closed")
      ? "late"
      : "refused"
  );
}

/** When a receipt stops being taken, from its signed body; 0 if unreadable. */
export function receiptExpires(receipt: string): number {
  try {
    const body = receipt.split(".")[0].replace(/-/g, "+").replace(/_/g, "/");
    const value: unknown = JSON.parse(atob(body));
    const expires = (value as { e?: unknown }).e;
    return typeof expires === "number" ? expires : 0;
  } catch {
    return 0;
  }
}

/**
 * Takes each receipt kept to the account: gone once it's counted, came
 * before ("already", from any device), or was refused (another account's,
 * or no longer good); kept while the account can't be reached.
 */
async function sendReceipts(): Promise<void> {
  for (const receipt of [...readVerifiedStore().receipts]) {
    const drop = () =>
      updateVerifiedStore((current) => ({
        ...current,
        receipts: current.receipts.filter((kept) => kept !== receipt),
      }));
    if (receiptExpires(receipt) < Date.now()) {
      drop();
      continue;
    }
    let answer;
    try {
      answer = await postVerified({ action: "room", receipt });
    } catch {
      return;
    }
    if (!answer) return;
    drop();
  }
}
