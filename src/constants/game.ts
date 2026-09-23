/** Number of guesses a player gets before the round is lost. */
export const MAX_TRIES = 6;

/** Playback volume, 0-1. Matches the YouTube player's old volume of 20. */
export const AUDIO_VOLUME = 0.2;

/** localStorage key holding the array of endless-mode rounds. */
export const STORAGE_KEY = "stats";

/** localStorage key holding the array of daily-mode rounds. */
export const DAILY_STORAGE_KEY = "stats.daily";

/** localStorage key remembering which mode was last played. */
export const MODE_KEY = "mode";

/** localStorage key recording that the welcome pop-up has been dismissed. */
export const FIRST_RUN_KEY = "firstRun";

/**
 * Day 1 of daily mode, as a local calendar date. Moving this renumbers every
 * puzzle and reshuffles which song lands on which day, so it is fixed.
 */
export const DAILY_EPOCH = "2026-09-21";

/** Public URL used in the shareable result. */
export const SITE_URL = "https://bluearchive-heardle.xyz/";

/**
 * Shown in the welcome pop-up. Injected by Vite at build time (see
 * vite.config.ts) so it reflects the deploy rather than a hand-edited string.
 */
export const LAST_UPDATED =
  typeof __BUILD_DATE__ === "string" ? __BUILD_DATE__ : "";
