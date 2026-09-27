/** Number of guesses a player gets before the round is lost. */
export const MAX_TRIES = 6;

/**
 * Volume for a player who has never moved the slider, 0-1. Matches the
 * YouTube player's old volume of 20.
 */
export const DEFAULT_VOLUME = 0.2;

/** localStorage key holding the array of endless-mode rounds. */
export const STORAGE_KEY = "stats";

/** localStorage key holding the array of daily-mode rounds. */
export const DAILY_STORAGE_KEY = "stats.daily";

/** localStorage key holding the array of four-choice rounds. */
export const CHOICE_STORAGE_KEY = "stats.choice";

/** localStorage key holding the songs answered in time attack runs. */
export const TIME_ATTACK_STORAGE_KEY = "stats.timeattack";

/**
 * localStorage key holding the time attack settings picked last, so the
 * start screen offers them again.
 */
export const TIME_ATTACK_SETTINGS_KEY = "timeAttack";

/**
 * How much of the clip a four-choice round plays, in seconds, until the
 * player picks another length. One try only, so a little more than the first
 * try of six, and the four answers are picked to sound close.
 */
export const CHOICE_CLIP_SECONDS = 3;

/**
 * The clip lengths 4-Choice and time attack can be played with, in seconds.
 * Up to 7: longer gives the song away, and a random start needs room inside
 * the 16-second clip.
 */
export const CLIP_OPTIONS = [1, 2, 3, 5, 7];

/** localStorage key holding the name drawn on shared pictures. */
export const PLAYER_NAME_KEY = "playerName";

/**
 * localStorage key holding "true" once the player has the Jukebox play the
 * next song when one ends. Absent means off.
 */
export const JUKEBOX_AUTO_NEXT_KEY = "jukeboxAutoNext";

/** localStorage key holding the clip length picked for 4-Choice. */
export const CHOICE_CLIP_KEY = "choiceClip";

/** localStorage key remembering which mode was last played. */
export const MODE_KEY = "mode";

/** localStorage key holding the player's chosen volume, 0-1. */
export const VOLUME_KEY = "volume";

/**
 * localStorage key holding the colour scheme the player picked. Absent until
 * they pick one, so until then the game follows their device.
 */
export const COLOR_SCHEME_KEY = "colorScheme";

/**
 * localStorage key holding "false" once the player turns Blue Archive's
 * cursor off. Absent means on.
 */
export const CUSTOM_CURSOR_KEY = "customCursor";

/**
 * localStorage key holding which character stands beside the game: "auto"
 * (Arona in light mode, Plana in dark), "mari" or "off". Absent means auto.
 */
export const CHARACTER_KEY = "character";

/** localStorage key recording that the welcome pop-up has been dismissed. */
export const FIRST_RUN_KEY = "firstRun";

/** Where players can tip the game's maker. One link, shown quietly. */
export const KOFI_URL = "https://ko-fi.com/shinrunner1st";

/** localStorage key holding the id of the last "What's new" the player saw. */
export const WHATS_NEW_KEY = "whatsNew";

/**
 * Day 1 of daily mode, as a local calendar date. Moving this renumbers every
 * puzzle and reshuffles which song lands on which day, so it is fixed. (It was
 * moved once, to restart at #1 when the game moved to baheardle.com.)
 */
export const DAILY_EPOCH = "2026-09-27";

/** Public URL used in the shareable result. */
export const SITE_URL = "https://baheardle.com/";

/**
 * Shown in the welcome pop-up. Injected by Vite at build time (see
 * vite.config.ts) so it reflects the deploy rather than a hand-edited string.
 */
export const LAST_UPDATED =
  typeof __BUILD_DATE__ === "string" ? __BUILD_DATE__ : "";
