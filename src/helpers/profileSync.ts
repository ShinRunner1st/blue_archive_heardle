import {
  PROFILE_MISSIONS_SENT_KEY,
  PROFILE_SUMMARY_SENT_KEY,
} from "../constants/game";
import { AccountProfile } from "../types/account";
import { fetchProfile, putProfile } from "./accountClient";
import { storeAccountPick, storedPick } from "./cosmetics";
import { loadClearedMissions } from "./missions";
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
import {
  isLocalBehind,
  isProgressJoined,
  progressSettled,
} from "./progressSync";

/**
 * The profile in the account (docs/accounts.md, step 2): the name, the
 * "Sensei" after it, the favourite student and the profile's cosmetics,
 * kept in this browser as ever and in the account too. The later change
 * wins, here or from another device (profileEdit.ts); the account keeps
 * them by the same rule, so an older change can't undo a newer one.
 *
 * The summary goes with them: the profile's totals, worked out from this
 * browser's saves each time (profileSummary.ts), only sent, never read
 * back. So do the missions cleared, when one is new (step 4), for room
 * passes: the account only ever adds them. Nothing here reads or writes
 * progress.
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
  "nameEffect",
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
    nameEffect: storedPick("nameEffect"),
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
    storeAccountPick("nameEffect", profile.nameEffect);
    storeAccountPick("cardColors", profile.cardColors);
  });
  setProfileEditedAt(profile.editedAt);
}

function readKey(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeKey(key: string, value: string | null): void {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // Sent again next time: one more write, nothing lost.
  }
}

const summarySent = () => readKey(PROFILE_SUMMARY_SENT_KEY);
const rememberSummary = (text: string) =>
  writeKey(PROFILE_SUMMARY_SENT_KEY, text);

/** The missions cleared here, as one line, the same in any order. */
const missionsText = () => [...loadClearedMissions()].sort().join(" ");

/** Signed out: the next account is sent every mission this browser has. */
export const forgetMissionsSent = () =>
  writeKey(PROFILE_MISSIONS_SENT_KEY, null);

/**
 * What the last sync left the account with: the profile as changed then
 * and the missions sent. A room pass wants them current (roomPass.ts).
 */
let synced: string | null = null;
const syncState = () => `${profileEditedAt()}|${missionsText()}`;

/**
 * One sync: read the account's profile (one request), then, only if
 * something differs, take it in or send this one (one more, one row
 * written). The summary is sent when it has changed since it was last.
 */
async function syncOnce(now: number): Promise<void> {
  // The summary comes from the progress, so the progress goes first. A
  // browser it couldn't join yet may still hold a guest's progress (an
  // account starts fresh): nothing goes until it has, missions or summary.
  await progressSettled().catch(() => {});
  if (!isProgressJoined()) return;
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
  // The missions go when one is new since they last went: a few rows
  // written once each, never again. While this browser is a step behind
  // with no summary sent before, they wait: the summary going with them
  // would be this browser's, a step back.
  const missions = missionsText();
  const sendMissions =
    missions !== readKey(PROFILE_MISSIONS_SENT_KEY) && !(behind && !text);
  const state = syncState();
  // Whether the account will have this browser's missions after this.
  const missionsKept = (sent: boolean) =>
    sent || missions === readKey(PROFILE_MISSIONS_SENT_KEY);
  if (!sendMissions && !sendPicks && (text === summarySent() || behind)) {
    synced = missionsKept(false) ? state : null;
    return;
  }

  const kept = await putProfile({
    ...local,
    summary: behind && text ? JSON.parse(text) : summary,
    ...(sendMissions ? { missions: loadClearedMissions() } : {}),
  });
  if (!kept) return;
  if (text) rememberSummary(text);
  if (sendMissions) writeKey(PROFILE_MISSIONS_SENT_KEY, missions);
  // Another device changed it meanwhile, later: that one is kept.
  if (kept.editedAt > profileEditedAt()) applyProfile(kept);
  synced = missionsKept(sendMissions) && state === syncState() ? state : null;
}

let running: Promise<void> | null = null;
let again = false;

/**
 * Once the account has this browser's profile and missions as they are
 * now: at once if the last sync left it so, else after one more. For a
 * room pass, made from the account's copy.
 */
export async function profileUpToDate(): Promise<void> {
  if (running) await running.catch(() => {});
  if (synced !== syncState()) await syncProfile().catch(() => {});
}

/** Test seam: a new page, as far as this module's memory goes. */
export function resetProfileSyncState(): void {
  synced = null;
}

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
