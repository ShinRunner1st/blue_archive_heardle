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
 * localStorage keys holding the student game's rounds, one for each way to
 * play and mode.
 */
export const STUDENT_STORAGE_KEYS = {
  "gameplay-daily": "students.gameplay.daily",
  "gameplay-endless": "students.gameplay",
  "lore-daily": "students.lore.daily",
  "lore-endless": "students.lore",
} as const;

/**
 * localStorage keys holding Voice mode's rounds, one for each mode. Time
 * attack's are the lines answered in its runs.
 */
export const VOICE_STORAGE_KEYS = {
  daily: "voice.daily",
  endless: "voice",
  nohint: "voice.nohint",
  choice: "voice.choice",
  timeattack: "voice.timeattack",
} as const;

/** localStorage key remembering Voice mode's way to play Endless. */
export const VOICE_STYLE_KEY = "voiceStyle";

/** localStorage key holding the Voice time attack settings picked last. */
export const VOICE_TIME_ATTACK_SETTINGS_KEY = "voiceTimeAttack";

/**
 * localStorage key holding the picture game's rounds for a kind and mode,
 * "guess.halo.daily" or "guess.weapon" (Classic). Time attack's are the
 * pictures answered in its runs.
 */
export function pictureStorageKey(kind: string, mode: string): string {
  return mode === "endless" ? `guess.${kind}` : `guess.${kind}.${mode}`;
}

/** localStorage key remembering the picture game's kind: halo or weapon. */
export const PICTURE_KIND_KEY = "pictureKind";

/** localStorage key remembering the picture game's way to play Endless. */
export const PICTURE_STYLE_KEY = "pictureStyle";

/** localStorage key holding the picture time attack settings picked last. */
export const PICTURE_TIME_ATTACK_SETTINGS_KEY = "pictureTimeAttack";

/**
 * localStorage key remembering which game was last played: the OST, the
 * students or their voices.
 */
export const GAME_KEY = "game";

/** localStorage key remembering the student game's way to play. */
export const STUDENT_GAME_KEY = "studentGame";

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

/**
 * localStorage key holding the student on the Sensei card, by id. A setting
 * like the player name, so it isn't in the save file.
 */
export const FAV_STUDENT_KEY = "favStudent";

/**
 * localStorage key holding "false" once the player turns off the "Sensei"
 * before their name on pictures. Absent means on.
 */
export const SENSEI_TITLE_KEY = "senseiTitle";

/** localStorage key holding the name drawn on shared pictures. */
export const PLAYER_NAME_KEY = "playerName";

/**
 * localStorage key holding what the Jukebox does when a song ends: "next"
 * plays the next song in the list, "one" plays the same song again. Absent
 * means it stops.
 */
export const JUKEBOX_REPEAT_KEY = "jukeboxRepeat";

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
