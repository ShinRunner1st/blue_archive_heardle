/**
 * A player's progress for the Missions preview, from the file the Account
 * tab's Download my data makes (helpers/accountData.ts): its `progress`
 * holds the save as the account keeps it, read with the same checks.
 */
import { readSaveData, type SaveFileResult } from "../helpers/saveFile";

/** Far bigger than any account's download; checked before reading. */
export const MAX_DATA_BYTES = 16 * 1024 * 1024;

const NOT_DATA =
  "That isn't a Download my data file: it's the .json the Account tab saves, signed in.";

export function saveFromAccountData(text: string): SaveFileResult {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: NOT_DATA };
  }
  const progress =
    typeof data === "object" && data !== null && "progress" in data
      ? (data as { progress: unknown }).progress
      : undefined;
  if (progress === undefined) return { ok: false, error: NOT_DATA };
  if (progress === null) {
    return { ok: false, error: "That account has no progress yet." };
  }
  const save = (progress as { save?: unknown }).save;
  return readSaveData(save, { allowEmpty: true });
}
