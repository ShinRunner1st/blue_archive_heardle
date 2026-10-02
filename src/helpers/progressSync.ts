import {
  BACKUP_BEFORE_ACCOUNT_KEY,
  PROGRESS_EXTRA_KEY,
  PROGRESS_REVISION_KEY,
  PROGRESS_SENT_KEY,
} from "../constants/game";
import { MISSIONS } from "../constants/missions";
import { GAME_MODES } from "../types/mode";
import { PICTURE_SLOTS } from "../types/picture";
import { STUDENT_SLOTS } from "../types/student";
import { VOICE_MODES } from "../types/voice";
import {
  AccountState,
  AccountsUnavailable,
  downloadProgress,
  fetchAccountState,
  uploadProgress,
} from "./accountClient";
import { saveClearedMissions, saveRoomGames, saveRoomRecord } from "./missions";
import {
  currentSave,
  readSaveData,
  reloadPage,
  SaveFile,
  saveData,
  ServerSave,
} from "./saveFile";
import { SAVE_FORMAT } from "./saveFormat";
import { playedRounds } from "./missionRules";
import { mergeSaves } from "./saveMerge";
import { replaceAllRounds } from "./storage";

/**
 * The progress in the account (docs/accounts.md, step 3). The browser's
 * save stays where it always was, so the game reads it as ever and plays
 * on offline; the account keeps a copy, and the two are joined, never
 * one simply written over the other unless the account hasn't changed
 * since this browser last matched it:
 *
 * - **First time** in a browser: an account starts fresh (docs/plan.md,
 *   Guest limits). The browser's progress as a guest is deleted, never
 *   sent, and the account's, if any, comes down. The sign-in asked first.
 *   (Accounts joined before that change merged a browser's save in.)
 * - **After**: a save changed here goes up, built on the revision this
 *   browser last matched. If another device wrote meanwhile, the account
 *   says so (409): its save comes down, is merged with this one, and the
 *   merge goes up, the account keeping a copy of what it had.
 * - **Only before the page draws** is the browser's save changed (the
 *   games hold their rounds in memory, and would write over it). After,
 *   a merge goes to the account only, and the browser takes it in as the
 *   page next opens; it stays a step behind until then (localBehind).
 * - **Unknown parts** of the account's save (a newer page's lists, or
 *   missions this page doesn't know) are kept aside and sent back with
 *   every save. A newer format isn't written over at all.
 *
 * The profile's summary is worked out from the browser's save only once
 * it has the account's (see profileSync.ts): it is never read back.
 */

export type ProgressSync =
  | "synced"
  | "signedOut"
  | "offline"
  | "newerFormat"
  | "clearFailed"
  | "tooBig";

/** How many times a write is tried again after another device's. */
const RETRIES = 4;

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
    // Not kept: the next sync works it out again, at worst a merge more.
  }
}

/** The revision this browser's save last matched; null if never joined. */
function joinedRevision(): number | null {
  const value = readKey(PROGRESS_REVISION_KEY);
  if (value === null) return null;
  const revision = Number(value);
  return Number.isSafeInteger(revision) && revision >= 0 ? revision : null;
}

/** FNV-1a over the save's JSON: enough to tell a changed save. */
function fingerprint(text: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `${text.length}:${hash.toString(16)}`;
}

/** A save's contents, without when it was made: equal saves, equal text. */
const contentOf = (save: SaveFile) =>
  JSON.stringify(saveData(save, new Date(0)));

const isEmpty = (save: SaveFile) =>
  JSON.stringify(saveData(emptySave(), new Date(0))) === contentOf(save);

function emptySave(): SaveFile {
  const server = (): ServerSave =>
    ({
      students: Object.fromEntries(STUDENT_SLOTS.map((slot) => [slot, []])),
      voices: Object.fromEntries(VOICE_MODES.map((mode) => [mode, []])),
      pictures: Object.fromEntries(PICTURE_SLOTS.map((slot) => [slot, []])),
    } as unknown as ServerSave);
  return {
    exported: "",
    rounds: Object.fromEntries(
      GAME_MODES.map((mode) => [mode, []])
    ) as unknown as SaveFile["rounds"],
    ...server(),
    jp: server(),
    missions: [],
    roomRecord: { games: 0, wins: 0 },
    roomGames: [],
  };
}

/* ---------- What this page doesn't know, kept to be sent back ---------- */

type Json = Record<string, unknown>;

const asObject = (value: unknown): Json =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Json)
    : {};

const TOP = new Set([
  "app",
  "version",
  "exported",
  "rounds",
  "students",
  "voices",
  "pictures",
  "jp",
  "missions",
  "roomRecord",
  "roomGames",
]);
const LISTS: Record<string, Set<string>> = {
  rounds: new Set(GAME_MODES),
  students: new Set(STUDENT_SLOTS),
  voices: new Set(VOICE_MODES),
  pictures: new Set(PICTURE_SLOTS),
};
const KNOWN_MISSIONS = new Set(MISSIONS.map(({ id }) => id));

const unknownOf = (object: Json, known: Set<string>): Json =>
  Object.fromEntries(Object.entries(object).filter(([key]) => !known.has(key)));

/**
 * The parts of an account's save this page doesn't know: fields and lists
 * it has no place for, at the top, in each game's lists and in JP's, and
 * missions it doesn't list (a newer page's).
 */
export function extrasOf(raw: Json): Json {
  const listsOf = (from: Json) =>
    Object.fromEntries(
      Object.entries(LISTS).map(([field, known]) => [
        field,
        unknownOf(asObject(from[field]), known),
      ])
    );
  const jp = asObject(raw.jp);
  return {
    top: unknownOf(raw, TOP),
    lists: listsOf(raw),
    jp: {
      top: unknownOf(jp, new Set(["students", "voices", "pictures"])),
      lists: listsOf(jp),
    },
    missions: (Array.isArray(raw.missions) ? raw.missions : []).filter(
      (id): id is string => typeof id === "string" && !KNOWN_MISSIONS.has(id)
    ),
  };
}

/** A save's data with what this page didn't know put back in. */
export function withExtras(data: Json, extras: Json): Json {
  const lists = (into: Json, from: unknown) => {
    const extra = asObject(from);
    for (const field of Object.keys(LISTS)) {
      if (field in into || Object.keys(asObject(extra[field])).length) {
        into[field] = { ...asObject(into[field]), ...asObject(extra[field]) };
      }
    }
  };
  const out: Json = { ...asObject(extras.top), ...data };
  lists(out, asObject(extras.lists));
  const jpExtra = asObject(extras.jp);
  const jp: Json = { ...asObject(jpExtra.top), ...asObject(out.jp) };
  lists(jp, asObject(jpExtra.lists));
  out.jp = jp;
  const missions = Array.isArray(extras.missions) ? extras.missions : [];
  out.missions = [...new Set([...(out.missions as string[]), ...missions])];
  return out;
}

function storedExtras(): Json {
  try {
    return asObject(JSON.parse(readKey(PROGRESS_EXTRA_KEY) ?? "{}"));
  } catch {
    return {};
  }
}

/* ---------- Moving saves ---------- */

async function gzip(text: string): Promise<Uint8Array<ArrayBuffer>> {
  const stream = new Blob([text])
    .stream()
    .pipeThrough(new CompressionStream("gzip"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function gunzip(data: Uint8Array): Promise<string> {
  const stream = new Blob([data as Uint8Array<ArrayBuffer>])
    .stream()
    .pipeThrough(new DecompressionStream("gzip"));
  return new Response(stream).text();
}

interface Remote {
  revision: number;
  save: SaveFile;
  extras: Json;
}

/** The account's save, read and checked like a save file. */
async function download(): Promise<Remote | null | ProgressSync> {
  const got = await downloadProgress();
  if (got === undefined) return "signedOut";
  if (got === null) return null;
  if (got.format > SAVE_FORMAT) return "newerFormat";
  let raw: unknown;
  try {
    raw = JSON.parse(await gunzip(got.data));
  } catch {
    // Unreadable: treated as offline, so nothing here is changed by it.
    return "offline";
  }
  const read = readSaveData(raw, { allowEmpty: true });
  if (!read.ok) return "newerFormat";
  return {
    revision: got.revision,
    save: read.save,
    extras: extrasOf(asObject(raw)),
  };
}

async function upload(
  save: SaveFile,
  extras: Json,
  base: number,
  backup: boolean
) {
  const body = await gzip(JSON.stringify(withExtras(saveData(save), extras)));
  return uploadProgress(body, base, SAVE_FORMAT, backup);
}

/** Writes a save into this browser's storage; false if it wouldn't take it. */
function applyLocally(save: SaveFile): boolean {
  if (
    !replaceAllRounds(
      save.rounds,
      save.students,
      save.voices,
      save.pictures,
      save.jp
    )
  ) {
    return false;
  }
  saveClearedMissions(save.missions);
  saveRoomRecord(save.roomRecord);
  saveRoomGames(save.roomGames);
  return true;
}

/** Whether this browser's save has been joined with the account yet. */
export const isProgressJoined = () => joinedRevision() !== null;

/**
 * Whether this browser has progress a player would miss: a round played to
 * its end, a mission or a multiplayer game. A round dealt as a page opened
 * and never played isn't.
 */
export function hasLocalProgress(): boolean {
  const save = currentSave();
  return (
    save.missions.length > 0 ||
    save.roomRecord.games > 0 ||
    playedRounds(save).length > 0
  );
}

/**
 * Signed in where this browser was never joined: the progress it has is a
 * guest's, deleted rather than joined with the account. False if storage
 * wouldn't take it, so nothing goes on as if it had.
 */
function startFresh(): boolean {
  writeKey(BACKUP_BEFORE_ACCOUNT_KEY, null);
  return applyLocally(emptySave());
}

/** This browser now matches the account at `revision`. */
function matched(revision: number, save: SaveFile, extras: Json): void {
  writeKey(PROGRESS_REVISION_KEY, String(revision));
  writeKey(PROGRESS_SENT_KEY, fingerprint(contentOf(save)));
  writeKey(PROGRESS_EXTRA_KEY, JSON.stringify(extras));
  sessionRevision = null;
  localBehind = false;
}

/**
 * The account's revision after this page's own writes, while the browser's
 * save is behind it (a merge it couldn't take in, the page having drawn).
 */
let sessionRevision: number | null = null;
let localBehind = false;

/** Whether the browser's save is missing some of the account's, for now. */
export const isLocalBehind = () => localBehind;

/** The account has more than this browser; a merge went up for it. */
function aheadOfHere(revision: number): void {
  sessionRevision = revision;
  localBehind = true;
}

/** An upload refused: another device's write (again), or why not. */
const failed = (
  why: "conflict" | "format" | "signedOut" | "tooBig"
): ProgressSync | "again" =>
  why === "conflict" ? "again" : why === "format" ? "newerFormat" : why;

interface Options {
  /** Whether the browser's save may still be changed: before the page draws. */
  canApply: () => boolean;
  /** The account's state, already read as the page opened. */
  state?: AccountState;
}

async function syncOnce(
  { canApply, state }: Options,
  attempt: number
): Promise<ProgressSync | "again"> {
  // A guest's progress never meets the account: gone before anything is
  // read or sent. A page already drawn holds its rounds in memory and
  // would write them back, so it opens again, empty.
  if (joinedRevision() === null && !isEmpty(currentSave())) {
    if (!startFresh()) return "clearFailed";
    if (!canApply()) {
      reloadPage();
      return "synced";
    }
  }

  // Joined already, nothing waiting to be merged, and no state read as the
  // page opened: nothing to send costs nothing (a tab switch), and a change
  // goes straight up on the revision this browser matched. If another
  // device wrote meanwhile, the account refuses it (409) and the next try
  // reads the state and merges, as ever.
  const joinedHere = joinedRevision();
  if (attempt === 0 && !state && joinedHere !== null && !localBehind) {
    const local = currentSave();
    if (fingerprint(contentOf(local)) === readKey(PROGRESS_SENT_KEY)) {
      return "synced";
    }
    const extras = storedExtras();
    const sent = await upload(local, extras, joinedHere, false);
    if (!sent.ok) return failed(sent.why);
    matched(sent.revision, local, extras);
    return "synced";
  }

  const known = attempt === 0 && state ? state : await fetchAccountState();
  if (!known) return "signedOut";
  const meta = known.progress;
  if (meta && meta.format > SAVE_FORMAT) return "newerFormat";

  const local = currentSave();
  const joined = joinedRevision();
  const extras = storedExtras();

  const base = sessionRevision ?? joined;
  const accountMoved = !meta || meta.revision !== base;

  // Nothing new in the account: send this browser's save if it changed.
  if (joined !== null && !accountMoved && !localBehind) {
    if (fingerprint(contentOf(local)) === readKey(PROGRESS_SENT_KEY)) {
      return "synced";
    }
    const sent = await upload(local, extras, joined, false);
    if (!sent.ok) return failed(sent.why);
    matched(sent.revision, local, extras);
    return "synced";
  }

  // The account has none: this browser's save, if any, goes up.
  if (!meta) {
    if (isEmpty(local)) {
      matched(0, local, extras);
      return "synced";
    }
    const sent = await upload(local, extras, 0, false);
    if (!sent.ok) return failed(sent.why);
    matched(sent.revision, local, extras);
    return "synced";
  }

  const remote = await download();
  if (remote === null) return "again";
  if (typeof remote === "string") return remote;

  // The account's, joined with this browser's: theirs first in every tie.
  // Never joined here, this browser's is empty: the account's comes down.
  const merged = isEmpty(local) ? remote.save : mergeSaves(remote.save, local);
  const nothingNew = contentOf(merged) === contentOf(remote.save);
  let revision = remote.revision;
  if (!nothingNew) {
    const sent = await upload(merged, remote.extras, remote.revision, true);
    if (!sent.ok) return failed(sent.why);
    revision = sent.revision;
  }

  if (canApply() && applyLocally(merged)) {
    matched(revision, merged, remote.extras);
  } else {
    // Taken in as the page next opens; until then, writes go on from here.
    writeKey(PROGRESS_EXTRA_KEY, JSON.stringify(remote.extras));
    aheadOfHere(revision);
  }
  return "synced";
}

let running: Promise<ProgressSync> | null = null;
let settled: Promise<ProgressSync> | null = null;
let last: ProgressSync | null = null;

/** How the last sync went, for the Account tab to say; null before one. */
export const lastProgressSync = () => last;

/**
 * Syncs the progress, one at a time, trying again after another device's
 * write; anything but "synced" leaves both saves as they were.
 */
export function syncProgress(options: Options): Promise<ProgressSync> {
  if (running) return running.then(() => syncProgress(options));
  running = (async () => {
    try {
      for (let attempt = 0; attempt <= RETRIES; attempt++) {
        const result = await syncOnce(options, attempt);
        if (result !== "again") return (last = result);
      }
      return (last = "offline");
    } catch (error) {
      if (error instanceof AccountsUnavailable) return (last = "offline");
      throw error;
    } finally {
      running = null;
    }
  })();
  settled ??= running;
  return running;
}

/** The first sync of the page, done (or failed); none started, at once. */
export const progressSettled = (): Promise<unknown> =>
  settled ?? Promise.resolve();

/**
 * Before signing out: whether this browser's newest progress is in the
 * account, so its copy here may be cleared without losing any.
 */
export async function saveBeforeSignOut(): Promise<boolean> {
  return (await syncProgress({ canApply: () => false })) === "synced";
}

/**
 * Signed out on a shared computer: this browser's progress is cleared, the
 * copy from before it was joined too. Only after saveBeforeSignOut, so the
 * account has it all. The page reloads after, as the games hold theirs.
 */
export function clearLocalProgress(): void {
  applyLocally(emptySave());
  writeKey(BACKUP_BEFORE_ACCOUNT_KEY, null);
}

/** Signed out: this browser's save is no longer joined with the account. */
export function forgetAccountProgress(): void {
  writeKey(PROGRESS_REVISION_KEY, null);
  writeKey(PROGRESS_SENT_KEY, null);
  writeKey(PROGRESS_EXTRA_KEY, null);
  sessionRevision = null;
  localBehind = false;
}

/** Test seam: a new page, as far as this module's memory goes. */
export function resetProgressSyncState(): void {
  sessionRevision = null;
  localBehind = false;
  running = null;
  settled = null;
  last = null;
}
