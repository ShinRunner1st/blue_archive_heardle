import { PROFILE_EDITED_KEY } from "../constants/game";

/**
 * When the profile was last changed in this browser, so that with an
 * account the later change, here or on another device, is kept (see
 * profileSync.ts). Every setter of the profile (the name, "Sensei", the
 * favourite student, the profile's cosmetics) marks it; taking the
 * account's profile in doesn't, as that isn't a change made here.
 */
let quiet = false;

export function profileEditedAt(): number {
  try {
    const value = Number(localStorage.getItem(PROFILE_EDITED_KEY));
    return Number.isSafeInteger(value) && value > 0 ? value : 0;
  } catch {
    return 0;
  }
}

export function setProfileEditedAt(at: number): void {
  try {
    localStorage.setItem(PROFILE_EDITED_KEY, String(at));
  } catch {
    // Not kept: the account's copy wins next time, which is safe.
  }
}

/** A change to the profile made here, now. */
export function markProfileEdited(now: number = Date.now()): void {
  if (!quiet) setProfileEditedAt(now);
}

/** Runs the setters without marking: taking the account's profile in. */
export function withoutMarking(change: () => void): void {
  quiet = true;
  try {
    change();
  } finally {
    quiet = false;
  }
}
