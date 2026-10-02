import { PictureKind } from "../constants/guessSheets";
import { Server } from "./server";

/**
 * Multiplayer rooms: what the page and the room (rooms-worker/) say to each
 * other over the WebSocket, a room's settings, and the timings both keep.
 * Both sides import this file, so they can't disagree; PROTOCOL is bumped
 * whenever a message changes, and a page on an older version is told to
 * reload.
 */
export const PROTOCOL = 6;

/** The games a room can play: songs, students by voice, or by picture. */
export type RoomGame = "ost" | "voice" | "picture";

/** Typed answers from the search box, or one pick from four. */
export type RoomAnswers = "typed" | "choice";

/**
 * Where in a song its round starts: the song's first note, or anywhere with
 * room to play the round out.
 */
export type RoomStart = "start" | "random";

/**
 * Which voice lines a Voice room deals: every line, or title calls only,
 * "Blue Archive!" from everyone, so only the voice tells them apart.
 */
export type RoomLines = "all" | "titles";

/**
 * Who can join the room: anyone with its code, only with the password the
 * host set, or nobody new (everyone in it can still come back). Not one of
 * the settings, which presets keep and everyone sees: a password is the
 * host's to give out, and a lock only means something once people are in.
 */
export type RoomAccess = "open" | "password" | "locked";

/** A room's password, as long as a preset's name. */
export const MAX_PASSWORD = 16;

export interface RoomSettings {
  game: RoomGame;
  answers: RoomAnswers;
  /** How many songs, voices or pictures in a game. */
  rounds: number;
  /**
   * How long everyone has to answer, in seconds. A song plays for all of
   * it, as in Anime Music Quiz; a voice line plays whole, and replays.
   */
  guessSeconds: number;
  /** The OST's: where each song starts. */
  start: RoomStart;
  /**
   * The OST's: the albums to deal songs from, by number (badges.json), in
   * order; none deals from every song.
   */
  albums: number[];
  /** Voice's: every line, or title calls only. */
  lines: RoomLines;
  /** The picture game's: halos or weapons, and as silhouettes or not. */
  picture: PictureKind;
  silhouette: boolean;
  maxPlayers: number;
  /** Whose students Voice and Picture deal from, for this room only. */
  server: Server;
}

/** A number setting's range; the page shows each as a slider. */
export interface Range {
  min: number;
  max: number;
}

export const ROUND_RANGE: Range = { min: 5, max: 30 };
export const GUESS_RANGE: Range = { min: 5, max: 40 };
/** The most players a room holds, and so the most messages a round brings. */
export const MAX_PLAYERS = 8;
/** A game needs someone to play against. */
export const MIN_PLAYERS = 2;
export const PLAYER_RANGE: Range = { min: MIN_PLAYERS, max: MAX_PLAYERS };

/** A player's name in a room, as long as the one in Settings may be. */
export const MAX_ROOM_NAME = 20;

/**
 * A player changes their answer as often as they like, as in Anime Music
 * Quiz, each change sent as it's made:
 * - SEND_GAP_MS: the least time between two a page sends; one made sooner
 *   waits, and the latest pick goes when it's up, so clicking through the
 *   four sends two or three a second, well inside the 40 messages in 10 s
 *   that close a connection;
 * - CHANGE_GAP_MS: the least the room takes them apart, a little less, so
 *   two a network bunched together aren't lost; one sooner is dropped.
 */
export const SEND_GAP_MS = 400;
export const CHANGE_GAP_MS = 300;

export const DEFAULT_ROOM_SETTINGS: RoomSettings = {
  game: "ost",
  answers: "typed",
  rounds: 10,
  guessSeconds: 20,
  start: "random",
  albums: [],
  lines: "all",
  picture: "halo",
  silhouette: false,
  maxPlayers: MAX_PLAYERS,
  server: "global",
};

/**
 * The round's timings, the room's and the page's alike (see the README's
 * Multiplayer rooms for the whole flow):
 * - LOAD_MS: how long the first round waits for everyone's clip;
 * - FIRST_LEAD_MS: the count-in before the first round, 3, 2, 1, the
 *   only one: later rounds follow their reveal straight on;
 * - LEAD_MS: the moment between rounds, so every page starts together;
 * - SETTLE_MS: once everyone has answered, the time left to change it;
 * - GRACE_MS: how late an answer sent as the time ran out is still taken;
 * - REVEAL_MS: the least an answer shows, the song playing again;
 * - REVEAL_MAX_MS: the most it waits for a slow page's next clip;
 * - OVER_MS: how long the standings show before everyone is back in the
 *   lobby;
 * - IDLE_MS: how long a lobby waits with nothing happening before it
 *   closes, and IDLE_WARN_MS, when the page warns it's about to;
 * - VOTE_MS: how long the others have to agree to end a game early.
 */
export const LOAD_MS = 10_000;
export const FIRST_LEAD_MS = 3_000;
export const LEAD_MS = 1_000;
export const SETTLE_MS = 3_000;
export const GRACE_MS = 1_500;
export const REVEAL_MS = 6_000;
export const REVEAL_MAX_MS = 12_000;
export const OVER_MS = 30_000;
export const IDLE_MS = 10 * 60_000;
export const IDLE_WARN_MS = 60_000;
export const VOTE_MS = 20_000;

/**
 * A room's code: four letters, without I and O, which look like 1 and 0.
 * 331,776 of them, for the few rooms open at a time.
 */
export const CODE_LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ";
export const CODE_LENGTH = 4;

export function isRoomCode(value: string): boolean {
  return new RegExp(`^[${CODE_LETTERS}]{${CODE_LENGTH}}$`).test(value);
}

/**
 * Where a room is, between rounds or in one:
 * - lobby: players join, and the host picks the settings and starts;
 * - loading: the first round's clip downloads, and pages say when it's in;
 * - playing: the count-in, then the clip for everyone at once; answers
 *   can change until the time is up;
 * - reveal: the answer and how everyone did, the song playing again while
 *   the next one downloads;
 * - over: the final standings, for OVER_MS or until everyone has gone
 *   back to the lobby sooner, each when they like.
 */
export type RoomPhase = "lobby" | "loading" | "playing" | "reveal" | "over";

/**
 * One answer: a song's theme number, or a student's id as text. Null is a
 * round passed.
 */
export type Pick = string | null;

/**
 * What a round plays, as the page needs it and never the answer: a file on
 * the audio Worker whose name is a salted hash, or a picture's cell in its
 * sheet, whose order is shuffled.
 */
export interface RoundMedia {
  /** A whole song, or a voice line. */
  file?: string;
  /** Where the song starts, in seconds. */
  start?: number;
  /** The halo's or weapon's cell, in the picture or silhouette sheet. */
  cell?: number;
}

/**
 * The cosmetics a player's card wears in a room, by id (cosmetics.json):
 * a signed-in player's from their room pass, so only what their account
 * has unlocked; a guest's as their page sent them, each checked to exist.
 */
export interface RoomLook {
  title: string;
  banner: string;
  frame: string;
  background: string;
}

/**
 * How long a room pass lasts (docs/accounts.md, section 7): a day's
 * playing; the page asks for a new one after.
 */
export const ROOM_PASS_MS = 12 * 60 * 60_000;

/**
 * A signed-in player in a room, as their room pass says: signed by the
 * accounts Worker with the key it shares with the rooms (ROOM_PASS_KEY),
 * and checked by the room with no call to the accounts. Who they are to
 * other players, never who they are to Google or Discord.
 */
export interface RoomPass {
  /** The account's public id: what kicks keep out and brings them back. */
  publicId: string;
  /** The profile's name, or "" for none. */
  name: string;
  /** The favourite student, or null for the name's letter. */
  student: number | null;
  /** The cosmetics picked, each only if the account has unlocked it. */
  look: RoomLook;
  /** When it stops being taken, in epoch milliseconds. */
  expires: number;
  /**
   * Its player hid their profile from rooms (docs/room-profiles.md):
   * their card isn't tappable and the room signs no ticket for it.
   */
  hidden?: true;
}

export interface PlayerView {
  /** Given by the room, so a player's own token never reaches the others. */
  id: string;
  name: string;
  /** A student's id, their picture in the room, or null for their letter. */
  icon: number | null;
  /** Their card's cosmetics. */
  look: RoomLook;
  /** Rounds answered right. */
  score: number;
  /** Milliseconds taken over the right answers, to break a tie. */
  time: number;
  /** Connected now; a player who drops out keeps their place and score. */
  here: boolean;
  /** The latest round whose clip they have in, or -1. */
  ready: number;
  /** Has answered this round. What, only once it's revealed. */
  answered: boolean;
  /**
   * While a round plays: when their latest answer reached the room, from
   * the song's start, in milliseconds, live as they change it. Never what
   * it is, which the others would copy.
   */
  sent?: number;
  /**
   * On the standings: has gone back to the lobby already. The room goes
   * back once everyone has, or the standings' time is up.
   */
  returned: boolean;
  /** In a reveal: their answer, whether it was right, and how fast. */
  last?: { pick: Pick; right: boolean; ms: number | null };
}

/** A round once revealed, for the standings at the end. */
export interface RoundResult {
  answer: string;
  /** The players who named it. */
  right: string[];
}

/** What every player sees of the room, sent in full on each change. */
export interface RoomView {
  code: string;
  /** Which player this copy is for. */
  you: string;
  host: string;
  settings: RoomSettings;
  players: PlayerView[];
  phase: RoomPhase;
  /** The round being played, from 0; -1 in the lobby. */
  round: number;
  /** Rounds in this game. */
  total: number;
  /**
   * The phase's times, in milliseconds from when the message was sent, or
   * null: when the clip starts (playing); when the time to answer is up,
   * the least a reveal lasts, the first round's wait, the standings' end
   * or, in the lobby, when it closes for want of anything happening
   * (endsIn); and when a reveal moves on without a slow page (maxIn).
   */
  startsIn: number | null;
  endsIn: number | null;
  maxIn: number | null;
  /** Everyone has answered, so the time to answer was cut to SETTLE_MS. */
  settling: boolean;
  /** Who can join; never the password itself. */
  access: RoomAccess;
  /**
   * The host has asked to end the game early, and the players here vote:
   * it ends once `needed` have said yes (the host's is one), and the ask
   * lapses after VOTE_MS.
   */
  vote?: {
    yes: number;
    no: number;
    needed: number;
    endsIn: number;
    /** This player's vote, or null if they haven't. */
    mine: boolean | null;
  };
  /** The round's clip or picture, and its four answers in 4-Choice. */
  current?: RoundMedia & { choices?: string[] };
  /** The next round's, to download while this one plays. */
  next?: RoundMedia;
  /** The rounds revealed so far, this one included in a reveal. */
  results: RoundResult[];
}

/** Why the room turned a player away, or closed. */
export type RoomError =
  /** No room has that code: it closed, or was never made. */
  | "missing"
  | "full"
  /** Making a room whose code is in use; the page tries another. */
  | "taken"
  /** The page is older than the room: a reload brings the new one. */
  | "version"
  /** Too many rooms made, or connections, from one place in a minute. */
  | "slow"
  /** The free plan's allowance for the day has run out. */
  | "resting"
  /** The lobby closed after IDLE_MS with nothing happening. */
  | "idle"
  /**
   * The host took this player out of the room: this browser, and their
   * account if they were signed in.
   */
  | "kicked"
  /**
   * The same account came into the room from another device or tab, and
   * plays on there.
   */
  | "elsewhere"
  /** The host has locked the room to anyone new. */
  | "locked"
  /** The room has a password: none was sent, or the wrong one. */
  | "password"
  | "bad";

/** A change to who can join, with the password when there's a new one. */
export interface AccessChange {
  access: RoomAccess;
  /** Only with "password"; left out, the room keeps the one it has. */
  password?: string;
}

export type ClientMessage =
  | {
      t: "hello";
      v: number;
      /** Kept by the tab for this room, to come back as the same player. */
      token: string;
      /**
       * The token of the last tab this browser was in the room with, kept
       * after it closed: its player, if they're away, is this one again.
       * A secret, so nobody else can take their place, as a name could.
       */
      back?: string;
      name: string;
      icon: number | null;
      /** The cosmetics the player picked; a pass's take their place. */
      look?: RoomLook;
      /**
       * A signed-in player's room pass, as the accounts Worker signed it.
       * Its name and cosmetics are the ones shown, and the room knows the
       * account by it: a kick keeps the account out, and the player comes
       * back as themselves from another device. Never sent on.
       */
      pass?: string;
      /** The room's password, for joining one that has one. */
      password?: string;
      /** Makes the room, with these settings, rather than joining one. */
      create?: RoomSettings;
      /** Who can join the room made: open, or with a password. */
      access?: AccessChange;
      /**
       * Coming back after a drop or a reload: joins the room if it's there,
       * and makes it again with `create` if it closed meanwhile.
       */
      rejoin?: boolean;
    }
  /**
   * The host's new settings, sent once when they save them, and who can
   * join, when that changed.
   */
  | { t: "settings"; settings: RoomSettings; access?: AccessChange }
  | { t: "start" }
  /** The round's clip is in: this one's, or the next one's, early. */
  | { t: "ready"; round: number }
  /**
   * An answer, or a change of it, sent as it's made (SEND_GAP_MS apart at
   * least). The last the room took before the time was up counts, timed by
   * when it reached the room: the page never says when.
   */
  | { t: "guess"; round: number; pick: Pick }
  /** The page's clock passed one of the phase's times: move on if due. */
  | { t: "tick" }
  /** The host asks to end a game early; the others vote on it. */
  | { t: "end" }
  /** A player's vote on ending the game early. */
  | { t: "vote"; yes: boolean }
  /** A player goes back to the lobby from the standings. */
  | { t: "again" }
  /** Someone is still there: the lobby's idle clock starts again. */
  | { t: "stay" }
  /** The host takes a player out of the room, by their id. */
  | { t: "kick"; id: string };

/**
 * Whether the page holds a player in a room, so a slip can't take them
 * out: in one ("room"), or in a game's rounds ("game"), when the Jukebox
 * waits too, as it would stop the round's song. Null in none.
 */
export type RoomHold = "room" | "game" | null;

/** Something the page didn't do while holding a player, and why. */
export interface RoomNudge {
  why: "leave" | "jukebox";
  /** Counts them, so the same one twice shows again. */
  n: number;
}

export type ServerMessage =
  | { t: "room"; view: RoomView }
  | { t: "error"; code: RoomError }
  /**
   * A signed-in player's result, as the game they played to its end shows
   * it in the standings, signed by the room for their account
   * (src/accounts/roomReceipt.ts); sent on their own connection only, and
   * again if they come back to the standings. Their page takes it to the
   * accounts Worker (docs/verified-stats.md, section 8). Guests get none.
   */
  | { t: "receipt"; receipt: string };
