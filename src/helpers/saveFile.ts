import { GAME_MODES, GameMode } from "../types/mode";
import { Round } from "../types/stats";
import { loadRounds, toRounds } from "./storage";
import { obscure, reveal } from "./obscure";

/** Marks a file as ours, so a stray text file is turned away by name. */
const SAVE_APP = "baheardle";

/**
 * Raised when the file's shape changes. A file from a newer game is refused
 * rather than half read; older ones stay readable.
 */
const SAVE_VERSION = 1;

/**
 * Bigger than any real save: localStorage itself holds about 5 MB. Checked
 * before reading, so a wrong pick (a video, say) can't stall the page.
 */
export const MAX_SAVE_FILE_BYTES = 8 * 1024 * 1024;

export interface SaveFile {
  /** When the file was made, as an ISO timestamp. */
  exported: string;
  rounds: Record<GameMode, Round[]>;
}

export type SaveFileResult =
  | { ok: true; save: SaveFile }
  | { ok: false; error: string };

/**
 * Every mode's rounds in one file, scrambled like the saves themselves, so the
 * answer to a round in progress isn't readable in a text editor either.
 */
export function buildSaveFile(now: Date = new Date()): string {
  const rounds = Object.fromEntries(
    GAME_MODES.map((mode) => [mode, loadRounds(mode)])
  );

  return obscure(
    JSON.stringify({
      app: SAVE_APP,
      version: SAVE_VERSION,
      exported: now.toISOString(),
      rounds,
    })
  );
}

/** For example baheardle-save-2026-09-28.txt, dated by the player's calendar. */
export function saveFileName(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(
    now.getDate()
  )}`;
  return `baheardle-save-${date}.txt`;
}

const NOT_A_SAVE = "That file isn't a Blue Archive Heardle save.";

/**
 * Reads a save file back, checking it the same way the saves are checked on
 * load. Never throws: anything wrong comes back as a message for the player.
 */
export function readSaveFile(text: string): SaveFileResult {
  const json = reveal(text.trim());
  if (json === null) return { ok: false, error: NOT_A_SAVE };

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return { ok: false, error: NOT_A_SAVE };
  }

  if (typeof parsed !== "object" || parsed === null) {
    return { ok: false, error: NOT_A_SAVE };
  }
  const file = parsed as Record<string, unknown>;

  if (file.app !== SAVE_APP || typeof file.version !== "number") {
    return { ok: false, error: NOT_A_SAVE };
  }
  if (file.version > SAVE_VERSION) {
    return {
      ok: false,
      error:
        "That save is from a newer version of the game. Reload the page and try again.",
    };
  }

  const saved =
    typeof file.rounds === "object" && file.rounds !== null
      ? (file.rounds as Record<string, unknown>)
      : {};
  const rounds = Object.fromEntries(
    GAME_MODES.map((mode) => [mode, toRounds(saved[mode])])
  ) as Record<GameMode, Round[]>;

  if (GAME_MODES.every((mode) => rounds[mode].length === 0)) {
    return { ok: false, error: "That save has no rounds in it." };
  }

  const exported =
    typeof file.exported === "string" &&
    !Number.isNaN(Date.parse(file.exported))
      ? file.exported
      : "";

  return { ok: true, save: { exported, rounds } };
}

/**
 * Hands the text to the browser as a download. Made on the device, so nothing
 * is sent anywhere.
 */
export function downloadText(fileName: string, text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Revoking straight away can cancel the download in some browsers.
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/**
 * The game holds its rounds in memory and writes them back as they change, so
 * after an import the page starts over and reads the new save fresh.
 */
export function reloadPage(): void {
  window.location.reload();
}
