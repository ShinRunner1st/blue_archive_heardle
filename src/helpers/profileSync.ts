import { PROFILE_SUMMARY_SENT_KEY } from "../constants/game";
import { AccountProfile } from "../types/account";
import { fetchProfile, putProfile } from "./accountClient";
import { storeAccountPick, storedPick } from "./cosmetics";
import {
  getFavStudent,
  getPlayerName,
  getSenseiTitle,
  setFavStudent,
  setPlayerName,
  setSenseiTitle,
} from "./playerName";
import {
  markProfileEdited,
  profileEditedAt,
  setProfileEditedAt,
  withoutMarking,
} from "./profileEdit";
import { profileSummary } from "./profileSummary";
import { isLocalBehind, progressSettled } from "./progressSync";

/**
 * The profile in the account (docs/accounts.md, step 2): the name, the
 * "Sensei" after it, the favourite student and the profile's cosmetics,
 * kept in this browser as ever and in the account too. The later change
 * wins, here or from another device (profileEdit.ts); the account keeps
 * them by the same rule, so an older change can't undo a newer one.
 *
 * The summary goes with them: the profile's totals, worked out from this
 * browser's saves each time (profileSummary.ts), only sent, never read
 * back. Nothing here reads or writes progress.
 */

/** What the profile is, besides when it was changed. */
const PROFILE_FIELDS = [
  "name",
  "sensei",
  "student",
  "title",
  "banner",
  "frame",
  "background",
  "cardColors",
] as const;

/** The profile as kept here. A pick not unlocked here is kept as it is. */
export function localProfile(): AccountProfile {
  return {
    name: getPlayerName().trim(),
    sensei: getSenseiTitle(),
    student: getFavStudent(),
    title: storedPick("title"),
    banner: storedPick("banner"),
    frame: storedPick("frame"),
    background: storedPick("background"),
    cardColors: storedPick("cardColors"),
    editedAt: profileEditedAt(),
  };
}

/** Takes the account's profile in, as it is, without marking a change. */
export function applyProfile(profile: AccountProfile): void {
  withoutMarking(() => {
    setPlayerName(profile.name);
    setSenseiTitle(profile.sensei);
    setFavStudent(profile.student);
    storeAccountPick("title", profile.title);
    storeAccountPick("banner", profile.banner);
    storeAccountPick("frame", profile.frame);
    storeAccountPick("background", profile.background);
    storeAccountPick("cardColors", profile.cardColors);
  });
  setProfileEditedAt(profile.editedAt);
}

function summarySent(): string | null {
  try {
    return localStorage.getItem(PROFILE_SUMMARY_SENT_KEY);
  } catch {
    return null;
  }
}

function rememberSummary(text: string): void {
  try {
    localStorage.setItem(PROFILE_SUMMARY_SENT_KEY, text);
  } catch {
    // Sent again next time: one more write, nothing lost.
  }
}

/**
 * One sync: read the account's profile (one request), then, only if
 * something differs, take it in or send this one (one more, one row
 * written). The summary is sent when it has changed since it was last.
 */
async function syncOnce(now: number): Promise<void> {
  // The summary comes from the progress, so the progress goes first.
  await progressSettled().catch(() => {});
  const remote = await fetchProfile();
  if (remote === undefined) return;

  // A browser whose profile was never changed since accounts came gives
  // way to the account's; the first to sign in gives the account its own.
  if (!remote && profileEditedAt() === 0) markProfileEdited(now);
  if (remote && remote.editedAt > profileEditedAt()) applyProfile(remote);

  const local = localProfile();
  // From this browser's save, once it has the account's: while it's a step
  // behind (a merge it takes in as the page next opens), the account's
  // summary stays as it was rather than go back.
  const behind = isLocalBehind();
  const summary = profileSummary();
  const text = behind ? summarySent() : JSON.stringify(summary);
  // The picks go when this browser's differ and aren't older; the summary
  // when it has changed since it last went.
  const differs = PROFILE_FIELDS.some(
    (field) => !remote || local[field] !== remote[field]
  );
  const sendPicks = !remote || (differs && local.editedAt >= remote.editedAt);
  if (!sendPicks && text === summarySent()) return;
  if (behind && !sendPicks) return;

  const kept = await putProfile({
    ...local,
    summary: behind && text ? JSON.parse(text) : summary,
  });
  if (!kept) return;
  if (text) rememberSummary(text);
  // Another device changed it meanwhile, later: that one is kept.
  if (kept.editedAt > profileEditedAt()) applyProfile(kept);
}

let running: Promise<void> | null = null;
let again = false;

/**
 * Syncs the profile, one at a time: asked again while one runs, it runs
 * once more after, with whatever changed meanwhile.
 */
export function syncProfile(now: () => number = Date.now): Promise<void> {
  if (running) {
    again = true;
    return running;
  }
  running = (async () => {
    try {
      do {
        again = false;
        await syncOnce(now());
      } while (again);
    } finally {
      running = null;
    }
  })();
  return running;
}
