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

/**
 * localStorage key remembering which server the student games follow:
 * "global" or "jp" (see src/helpers/server.ts). JP's rounds are kept under
 * the same keys as Global's with ".jp" after them.
 */
export const SERVER_KEY = "server";

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
 * localStorage key holding the settings a player made their last room with,
 * so their next room starts with them. A setting, not in the save file.
 */
export const ROOM_SETTINGS_KEY = "roomSettings";

/**
 * localStorage key holding the student a player shows as in rooms, picked
 * before they join one. A setting, not in the save file.
 */
export const ROOM_ICON_KEY = "roomIcon";

/**
 * sessionStorage key, before a room's code, holding this tab's token in it:
 * a reload comes back as the same player, with their score. Per tab, so two
 * tabs are two players, and gone when the tab closes.
 */
export const ROOM_TOKEN_PREFIX = "room.";

/**
 * localStorage key holding, for the rooms this browser was in lately, the
 * token of the tab it was in them with, so a tab closed by mistake can be
 * opened again and go back in as the same player. The token is a secret
 * the room knows it by, which a name typed by someone else isn't.
 */
export const ROOM_BACK_KEY = "roomBack";

/**
 * localStorage key holding a player's saved room settings, each under a
 * name they gave it. A setting, not in the save file.
 */
export const ROOM_PRESETS_KEY = "roomPresets";

/**
 * localStorage key: "on" when a pick in a room goes at once, with no need
 * to press Submit. A setting, not in the save file.
 */
export const ROOM_QUICK_KEY = "roomQuick";

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
 * localStorage key holding the Jukebox's own volume, 0-1: music to listen
 * to sits at another level than a clip to name. Absent, it starts at the
 * game's.
 */
export const JUKEBOX_VOLUME_KEY = "jukeboxVolume";

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

/**
 * localStorage key holding the ids of the missions cleared, as JSON. Kept
 * apart from the rounds, so a reset of stats doesn't take one back, and
 * carried in the save file.
 */
export const MISSIONS_KEY = "missions";

/**
 * localStorage key holding the multiplayer games this browser finished and
 * won before save format 2, as two counts: { games, wins }. Kept as it is,
 * no longer added to; the games since are in ROOM_GAMES_KEY. Nothing about
 * a room is kept anywhere else. Both are carried in the save file.
 */
export const ROOM_RECORD_KEY = "roomRecord";

/**
 * localStorage key holding the multiplayer games this browser finished
 * since save format 2, one each ({ id, at, won }), so two devices' games
 * add up when their saves merge rather than one count overwriting another.
 */
export const ROOM_GAMES_KEY = "roomGames";

/**
 * localStorage key holding the accounts session token (docs/accounts.md,
 * section 2). A credential: sent only in the Authorization header to the
 * accounts Worker, never shown, logged, or put in an address or a save
 * file. Not in the save file.
 */
export const ACCOUNT_SESSION_KEY = "account.session";

/**
 * localStorage key holding when the profile (name, "Sensei", favourite
 * student, card title and colours, banner, frame, background) was last
 * changed here, in epoch milliseconds: with an account, the later change,
 * here or there, is the one kept (helpers/profileSync.ts).
 */
export const PROFILE_EDITED_KEY = "profile.editedAt";

/**
 * localStorage key holding the profile summary last sent to the account,
 * so an unchanged one isn't sent again: a write saved.
 */
export const PROFILE_SUMMARY_SENT_KEY = "profile.summarySent";

/**
 * localStorage key holding the missions cleared last sent to the account
 * (helpers/profileSync.ts), for room passes, so they go only when one is
 * new. Forgotten on signing out, so another account is sent its own.
 */
export const PROFILE_MISSIONS_SENT_KEY = "profile.missionsSent";

/**
 * localStorage key holding the account's progress revision this browser's
 * save last matched (helpers/progressSync.ts). Absent: this browser's save
 * isn't joined with an account yet, so the next sync backs it up and joins
 * it, merging if both have progress.
 */
export const PROGRESS_REVISION_KEY = "progress.revision";

/**
 * localStorage key holding a fingerprint of the save last sent to the
 * account, so an unchanged one isn't sent again.
 */
export const PROGRESS_SENT_KEY = "progress.sent";

/**
 * localStorage key holding what the account's save had that this page
 * doesn't know (a newer page's lists or missions), sent back with every
 * save so nothing of it is lost.
 */
export const PROGRESS_EXTRA_KEY = "progress.extra";

/**
 * localStorage key holding this browser's save as it was before it was
 * first joined with an account, as a save file's text, to download.
 */
export const BACKUP_BEFORE_ACCOUNT_KEY = "backup.beforeAccount";

/**
 * sessionStorage key holding the nonce of a sign-in under way, checked when
 * the page comes back, so nobody can sign a player in to their account.
 */
export const ACCOUNT_NONCE_KEY = "account.nonce";

/**
 * localStorage key holding the format this browser's saves are in (see
 * helpers/saveFormat.ts); absent is format 1.
 */
export const SAVE_FORMAT_KEY = "saveFormat";

/** localStorage keys for what missions unlock: the card's title and frame,
 * and the cursor effects' colour. Settings, so not in the save file. */
export const CARD_TITLE_KEY = "cardTitle";
/** Named for the card's "frames", as the colours were first called. */
export const CARD_COLORS_KEY = "cardFrame";
export const CURSOR_COLOR_KEY = "cursorColor";
/** The profile's banner, frame and background, as picked in Customize. */
export const PROFILE_BANNER_KEY = "profileBanner";
export const PROFILE_FRAME_KEY = "profileFrame";
export const PROFILE_BACKGROUND_KEY = "profileBackground";
