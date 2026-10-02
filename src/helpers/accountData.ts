import { fetchAccountData } from "./accountClient";
import { dateStamp } from "./daily";
import { downloadBlob } from "./download";

/**
 * "Download my data" (docs/accounts.md, section 8): everything the account
 * keeps, as one JSON file the player can read. The Worker sends the
 * progress gzipped, as stored; it's opened here, so the file holds the
 * save itself, readable, in the save file's format 2.
 */

/** A gzipped copy, as base64, back to what the page sent. */
async function openSave(gzipBase64: string): Promise<unknown> {
  const bytes = Uint8Array.from(atob(gzipBase64), (char) => char.charCodeAt(0));
  const stream = new Blob([bytes])
    .stream()
    .pipeThrough(new DecompressionStream("gzip"));
  return JSON.parse(await new Response(stream).text()) as unknown;
}

const opened = async (
  kept: { gzipBase64: string; [field: string]: unknown } | null
) => {
  if (!kept) return null;
  const { gzipBase64, ...rest } = kept;
  return { ...rest, save: await openSave(gzipBase64) };
};

/** The file's name: baheardle-account-2026-10-02.json. */
export const accountFileName = (now: Date = new Date()) =>
  `baheardle-account-${dateStamp(now)}.json`;

/**
 * Builds the file and hands it to the browser to save. False if signed
 * out; throws if the accounts can't be reached.
 */
export async function downloadAccountData(): Promise<boolean> {
  const data = await fetchAccountData();
  if (!data) return false;
  const file = {
    about:
      "Everything Blue Archive Heardle keeps for your account (baheardle.com/privacy). Your progress is the save itself, as your account keeps it. Verified is the record the server kept itself: your daily time zone, each verified daily with its moves and result, and your room results, never part of your progress.",
    downloaded: new Date().toISOString(),
    ...data,
    progress: await opened(data.progress),
    progressBackup: await opened(data.progressBackup),
  };
  downloadBlob(
    accountFileName(),
    new Blob([JSON.stringify(file, null, 2)], { type: "application/json" })
  );
  return true;
}
