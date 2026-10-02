/**
 * A multiplayer room's game, run by the room's Durable Object
 * (rooms-worker/index.ts), which hands it each player's hello, message and
 * leaving, and its alarm. Kept apart from Cloudflare's API so the tests can
 * play whole games through it.
 *
 * What it keeps is split three ways, for the free plan's limits (see the
 * README's Multiplayer rooms), since writes to storage are the scarcest:
 * - the room's live part (Live: settings, phase, clocks, host) and each
 *   player's (PlayerRecord: name, score, this round's answer) ride on the
 *   connections, which costs nothing; the live part is the same on each;
 * - the game (Game: the dealt rounds with their answers, the results, and
 *   a roster of everyone) is written to storage when it starts and at each
 *   reveal, one write a round, so a player who drops out, or everyone at
 *   once when a new version of the Worker restarts the room, comes back
 *   with their place and score. A lobby writes nothing at all.
 *
 * The room sets no alarm for its clocks: each page sends a tick when one of
 * the phase's times passes, and any message moves the room on if it's due.
 * That goes for a lobby left idle too, which closes after IDLE_MS. Its one
 * alarm is for tidying up, set when a game starts and when the last player
 * leaves.
 *
 * The answers never leave here before the reveal: a round is sent as its
 * file's name, a salted hash, or its picture's cell in a shuffled sheet,
 * and its four answers in 4-Choice.
 */
import { newRoomGameId, RoomReceipt } from "../accounts/roomReceipt";
import { audioClips } from "../constants/audioClips";
import badges from "../content/badges.json";
import { PICTURE_KINDS } from "../constants/guessSheets";
import { songs } from "../constants/songs";
import { students } from "../constants/students";
import { voiceLines } from "../constants/voiceLines";
import {
  AccessChange,
  ClientMessage,
  DEFAULT_ROOM_SETTINGS,
  FIRST_LEAD_MS,
  GRACE_MS,
  GUESS_RANGE,
  IDLE_MS,
  LEAD_MS,
  LOAD_MS,
  CHANGE_GAP_MS,
  MAX_PASSWORD,
  MAX_ROOM_NAME,
  MIN_PLAYERS,
  OVER_MS,
  Pick,
  PLAYER_RANGE,
  PlayerView,
  PROTOCOL,
  Range,
  RoomAccess,
  REVEAL_MAX_MS,
  REVEAL_MS,
  ROUND_RANGE,
  RoomError,
  RoomLook,
  RoomPass,
  RoomPhase,
  RoomSettings,
  RoomView,
  RoundMedia,
  RoundResult,
  SETTLE_MS,
  VOTE_MS,
} from "../types/room";
import { isServer } from "../types/server";
import { cleanLook, DEFAULT_LOOK } from "./roomLook";
import { songFile, voiceFile } from "./audioFiles";
import { makeChoices } from "./choices";
import { answerOf, makePictureChoices, pictureAnswers } from "./pictureRounds";
import { places } from "./roomPlaces";
import {
  hasTitleCall,
  lineCount,
  makeVoiceChoices,
  voicePool,
} from "./voiceRounds";

/** A room everyone has left waits this long for someone to come back. */
export const EMPTY_MS = 30_000;
/**
 * While a game or its standings are open, the room looks this often for
 * whether anyone is still there, in case they all went at once, as when
 * a new version of the Worker restarts it and nobody comes back.
 */
export const TIDY_MS = 30 * 60_000;
/**
 * The browsers and accounts the host has taken out, the newest kept: on
 * every connection, whose attachment has little room (2 KB), so a token's
 * first part, and an account's public id marked as one.
 */
const MAX_KICKED = 16;
const kickKey = (token: string) => token.slice(0, 16);
const accountKey = (publicId: string) => `@${publicId}`;

/** A player's keys for kicks and a locked room: their browser, and account. */
const keysOf = (player: PlayerRecord) => [
  kickKey(player.token),
  ...(player.account ? [accountKey(player.account)] : []),
];

/** One round, as dealt when the game starts. */
export interface RoundDeal {
  media: RoundMedia;
  answer: string;
  choices?: string[];
}

/** The room's live part, on every connection. */
export interface Live {
  /** Counts the changes, so the newest copy wins if two ever differ. */
  stamp: number;
  settings: RoomSettings;
  phase: RoomPhase;
  round: number;
  /** When the clip starts, in a round. */
  startsAt: number | null;
  /** When the time to answer is up, or the first load's or reveal's wait. */
  endsAt: number | null;
  /** When a reveal moves on without a slow page. */
  maxAt: number | null;
  /** Everyone has answered, so the time was cut to SETTLE_MS. */
  settling: boolean;
  host: string;
  /**
   * When a player last did something: joined, changed the settings,
   * started, came back to the lobby or said they're still there. A lobby
   * closes IDLE_MS after it.
   */
  activeAt: number;
  /** Who can join: anyone, with the password, or only those in it. */
  access: RoomAccess;
  /** The password, with "password"; never sent to a page. */
  password: string;
  /**
   * While it's locked: the browsers in the room then (kickKey), each on
   * its latest tab's token, and their accounts (accountKey), who may still
   * come back to a lobby, which keeps no roster of who left.
   */
  members: string[];
  /**
   * The browsers and accounts the host took out (kickKey, accountKey),
   * never let back in.
   */
  kicked: string[];
  /**
   * The host's ask to end the game early: who asked, who said yes and no,
   * by id. It goes with the host who asked.
   */
  vote: { by: string; yes: string[]; no: string[]; until: number } | null;
}

/**
 * A signed-in player in a game's standings as it was played to its end:
 * their place (ties shared) and score, for their receipt.
 */
export interface Finisher {
  id: string;
  /** Their account's public id, from their room pass. */
  account: string;
  place: number;
  score: number;
}

/** A game played to its end: when, and who stood in its standings. */
export interface Ended {
  /** When its standings began, on the room's clock. */
  at: number;
  /** Everyone in the standings, here or away. */
  players: number;
  finishers: Finisher[];
}

/** A result for the Worker to sign and send on one connection. */
export interface ReceiptToSend {
  token: string;
  receipt: RoomReceipt;
}

/** A game, from its start to the lobby after it, in storage. */
export interface Game {
  /**
   * The game's random id (128 bits), made as it starts, which its receipts
   * carry so an account counts the game once. Absent in a record from
   * before PROTOCOL 6, whose game then gives no receipts.
   */
  id?: string;
  /**
   * Set as its last round's reveal gives way to the standings; never for a
   * game ended early by a vote, nor one with fewer than MIN_PLAYERS left in
   * its standings or nobody signed in. Kept in the write the standings make
   * anyway, so a restart or a player coming back gets the same result.
   */
  ended?: Ended;
  deal: RoundDeal[];
  results: RoundResult[];
  /**
   * Everyone in the game when it was last written, here or not. A player
   * who isn't connected stays in it, with their score, until the next game.
   */
  roster: PlayerRecord[];
}

/** What storage holds while a game is on: the game, and its live part. */
export interface Saved {
  live: Live;
  game: Game;
}

export interface PlayerRecord {
  /** The page's secret for coming back as this player; never sent on. */
  token: string;
  id: string;
  name: string;
  icon: number | null;
  /** Their card's cosmetics; absent in a record from before PROTOCOL 5. */
  look?: RoomLook;
  /**
   * A signed-in player's account, by its public id, from their pass: only
   * while the room is open, as everything here is. Never sent to a page.
   */
  account?: string;
  /**
   * Their connection now said hello with that account's own pass, which the
   * Worker checked: only then is it sent their receipt. A page back by its
   * token without the pass keeps its account (kicks and locks still know
   * it) but gets no receipt.
   */
  passed?: true;
  /** When they joined, which orders the list and picks the next host. */
  joined: number;
  score: number;
  time: number;
  /** The latest round whose clip they have in, or -1. */
  ready: number;
  /**
   * Their latest answer, changed until the time is up, and when it reached
   * the room, from the song's start: the room's clock, never the page's.
   */
  guess: { round: number; pick: Pick; ms: number } | null;
  /** The round whose time to answer their page said was up. */
  ticked: number;
  /** Gone back to the lobby from the standings, ahead of the room. */
  returned: boolean;
}

type Random = () => number;

function shuffle<T>(list: T[], random: Random): T[] {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

const inRange = (value: unknown, { min, max }: Range) =>
  Number.isInteger(value) &&
  (value as number) >= min &&
  (value as number) <= max;

/**
 * Each OST album's songs, by its number, read from the content file itself:
 * the Worker can't load the album covers that src/constants/volumes.ts
 * brings along.
 */
const ALBUM_SONGS = new Map(
  badges.map(({ number, songs }) => [number, new Set(songs.split(" "))])
);

/**
 * The albums a room deals from, as a page sent them: known ones, each
 * once, in order; null if it isn't a list of them.
 */
function cleanAlbums(value: unknown): number[] | null {
  if (!Array.isArray(value)) return null;
  const albums = [...new Set(value)];
  if (albums.some((album) => !ALBUM_SONGS.has(album as number))) return null;
  return (albums as number[]).sort((a, b) => a - b);
}

/** The songs an OST room deals from: its albums', or every one. */
export function roomSongs(albums: number[]) {
  const picked = albums.map((album) => ALBUM_SONGS.get(album)!);
  return songs.filter(
    ({ themeNo }) =>
      audioClips[themeNo] &&
      (picked.length === 0 || picked.some((album) => album.has(themeNo)))
  );
}

/**
 * Settings sent by a page, or kept in a preset, checked field by field;
 * null if any is off. A field added since a preset was kept takes its
 * default.
 */
export function cleanSettings(value: unknown): RoomSettings | null {
  if (typeof value !== "object" || value === null) return null;
  const s = value as Record<string, unknown>;
  const settings = {
    game: s.game,
    answers: s.answers,
    rounds: s.rounds,
    guessSeconds: s.guessSeconds,
    start: s.start,
    albums: cleanAlbums(s.albums ?? DEFAULT_ROOM_SETTINGS.albums),
    lines: s.lines ?? DEFAULT_ROOM_SETTINGS.lines,
    picture: s.picture,
    silhouette: s.silhouette,
    maxPlayers: s.maxPlayers,
    server: s.server,
  };
  const ok =
    (settings.game === "ost" ||
      settings.game === "voice" ||
      settings.game === "picture") &&
    (settings.answers === "typed" || settings.answers === "choice") &&
    inRange(settings.rounds, ROUND_RANGE) &&
    inRange(settings.guessSeconds, GUESS_RANGE) &&
    (settings.start === "start" || settings.start === "random") &&
    settings.albums !== null &&
    (settings.lines === "all" || settings.lines === "titles") &&
    PICTURE_KINDS.includes(settings.picture as never) &&
    typeof settings.silhouette === "boolean" &&
    inRange(settings.maxPlayers, PLAYER_RANGE) &&
    isServer(settings.server);
  return ok ? (settings as RoomSettings) : null;
}

/** A name as the room shows it: one line, trimmed, not too long. */
export function cleanName(value: unknown): string {
  const text = typeof value === "string" ? value : "";
  const name = text
    .normalize("NFC")
    // Control and invisible characters: zero-width spaces, the marks that
    // turn text right to left, blank letters. "Aru" with one in it looks
    // just like Aru.
    .replace(INVISIBLE, "")
    // Accents stacked high over the other names' cards.
    .replace(/(\p{M}{2})\p{M}+/gu, "$1")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_ROOM_NAME)
    .trim();
  return name || "Sensei";
}

const INVISIBLE =
  /[\p{Cc}\p{Cf}\p{Co}\p{Cs}\p{Zl}\p{Zp}\u115f\u1160\u2800\u3164\uffa0]/gu;

/**
 * Letters from other alphabets drawn just like Latin ones, as lower case:
 * Cyrillic, then Greek. "Аru" with a Cyrillic А is Aru to anyone reading.
 */
const LOOKALIKE_FROM = "авекмнорстухіјѕһԁԛԝαβεζηικμνορτυχı";
const LOOKALIKE_TO = "abekmhopctyxijshdqwabezhikmnoptyxi";
const LOOKALIKES = new Map(
  Array.from(LOOKALIKE_FROM, (char, i) => [char, LOOKALIKE_TO[i]])
);

/**
 * A name as it reads: wide letters and ligatures as plain ones, lower case,
 * lookalikes as the Latin letter, no spaces. Two names that read the same
 * can't both be in a room, so nobody can pass as another player.
 */
export function nameKey(name: string): string {
  return Array.from(
    name.normalize("NFKC").toLowerCase().replace(/\s/g, ""),
    (char) => LOOKALIKES.get(char) ?? char
  ).join("");
}

const studentIds = new Set(students.map(({ id }) => id));

/** A player's picture: a student the game knows, or none. */
export function cleanIcon(value: unknown): number | null {
  return typeof value === "number" && studentIds.has(value) ? value : null;
}

/**
 * Where a song's round starts, in seconds: the top, or anywhere leaving the
 * time to answer to play out.
 */
function songStart(
  themeNo: string,
  settings: RoomSettings,
  random: Random
): number {
  const { duration } = audioClips[themeNo];
  const room = Math.max(0, duration - settings.guessSeconds - 1);
  const at = settings.start === "start" ? 0 : random() * room;
  return Math.floor(at * 10) / 10;
}

/** A password as typed: one line, without invisible characters; or "". */
export function cleanPassword(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .normalize("NFC")
    .replace(INVISIBLE, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_PASSWORD);
}

/**
 * Whether a password typed matches the room's: read out across a table or
 * a call, so case, spaces and lookalike letters don't count.
 */
export function samePassword(typed: string, password: string): boolean {
  return password !== "" && nameKey(typed) === nameKey(password);
}

/** Who can join, as a page sent it; null if it's off. */
function cleanAccess(value: unknown): AccessChange | null {
  if (typeof value !== "object" || value === null) return null;
  const { access, password } = value as Record<string, unknown>;
  if (access !== "open" && access !== "password" && access !== "locked") {
    return null;
  }
  const clean = cleanPassword(password);
  return access === "password" && clean
    ? { access, password: clean }
    : { access };
}

/**
 * Every round of a game, dealt at the start: songs or students, none twice,
 * each with what it plays and, in 4-Choice, its four answers, dealt as the
 * single-player 4-Choice deals them.
 */
export function dealRounds(
  settings: RoomSettings,
  random: Random = Math.random
): RoundDeal[] {
  const four = settings.answers === "choice";
  const { server } = settings;

  if (settings.game === "voice") {
    const titles = settings.lines === "titles";
    const pool = titles
      ? voicePool(server).filter(({ id }) => hasTitleCall(id))
      : voicePool(server);
    return shuffle(pool, random)
      .slice(0, settings.rounds)
      .map((student) => {
        const line = titles ? 0 : Math.floor(random() * lineCount(student.id));
        const version = voiceLines[student.id]?.[1] ?? "";
        return {
          media: { file: voiceFile(student.id, line, version) },
          answer: String(student.id),
          ...(four
            ? {
                choices: makeVoiceChoices(student, random, server).map(String),
              }
            : {}),
        };
      });
  }

  if (settings.game === "picture") {
    const kind = settings.picture;
    return shuffle(pictureAnswers(kind, server), random)
      .slice(0, settings.rounds)
      .map((answer) => ({
        media: {
          cell: settings.silhouette ? answer.shape : answer.picture,
        },
        answer: String(answer.lead),
        ...(four
          ? {
              choices: makePictureChoices(
                kind,
                answer.lead,
                random,
                server
              ).map(String),
            }
          : {}),
      }));
  }

  // A few albums may hold fewer songs than the rounds: the game is shorter.
  return shuffle(roomSongs(settings.albums), random)
    .slice(0, settings.rounds)
    .map((song) => ({
      media: {
        file: songFile(song.themeNo, audioClips[song.themeNo].v),
        start: songStart(song.themeNo, settings, random),
      },
      answer: song.themeNo,
      ...(four ? { choices: makeChoices(song, random) } : {}),
    }));
}

/**
 * Whether an answer names the round's: the same song or student, or, for a
 * picture, any student it belongs to.
 */
export function isRight(
  settings: RoomSettings,
  answer: string,
  pick: Pick
): boolean {
  if (pick === null) return false;
  if (pick === answer) return true;
  if (settings.game !== "picture") return false;
  const id = Number(pick);
  return (
    Number.isInteger(id) &&
    answerOf(settings.picture, id, settings.server)?.lead === Number(answer)
  );
}

/** What a player can't be trusted to send: a pick is short, or null. */
function isPick(value: unknown): value is Pick {
  return value === null || (typeof value === "string" && value.length <= 12);
}

/**
 * The longest message taken: a hello with new settings, a password and a
 * room pass is the longest, under 1.5 KB.
 */
const MAX_MESSAGE = 2048;
/** A room pass as signed (crypto.ts): two base64url parts. */
const PASS = /^[\w-]+\.[\w-]+$/;
const MAX_PASS = 600;

/** Checks a message from a page; anything else is dropped unread. */
export function parseMessage(text: unknown): ClientMessage | null {
  if (typeof text !== "string" || text.length > MAX_MESSAGE) return null;
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return null;
  }
  if (typeof data !== "object" || data === null) return null;
  const m = data as Record<string, unknown>;
  switch (m.t) {
    case "hello":
      return typeof m.v === "number" &&
        typeof m.token === "string" &&
        /^[\w-]{8,40}$/.test(m.token) &&
        typeof m.name === "string"
        ? {
            t: "hello",
            v: m.v,
            token: m.token,
            name: m.name,
            icon: cleanIcon(m.icon),
            ...(m.look === undefined ? {} : { look: cleanLook(m.look) }),
            ...(typeof m.pass === "string" &&
            m.pass.length <= MAX_PASS &&
            PASS.test(m.pass)
              ? { pass: m.pass }
              : {}),
            ...(cleanPassword(m.password)
              ? { password: cleanPassword(m.password) }
              : {}),
            ...(cleanAccess(m.access)
              ? { access: cleanAccess(m.access)! }
              : {}),
            ...(m.create === undefined
              ? {}
              : { create: cleanSettings(m.create) ?? DEFAULT_ROOM_SETTINGS }),
            ...(m.rejoin === true ? { rejoin: true } : {}),
            ...(typeof m.back === "string" && /^[\w-]{8,40}$/.test(m.back)
              ? { back: m.back }
              : {}),
          }
        : null;
    case "settings": {
      const settings = cleanSettings(m.settings);
      const access = cleanAccess(m.access);
      return settings
        ? { t: "settings", settings, ...(access ? { access } : {}) }
        : null;
    }
    case "ready":
      return Number.isInteger(m.round)
        ? { t: "ready", round: m.round as number }
        : null;
    case "guess":
      return Number.isInteger(m.round) && isPick(m.pick)
        ? { t: "guess", round: m.round as number, pick: m.pick }
        : null;
    case "start":
    case "tick":
    case "end":
    case "again":
    case "stay":
      return { t: m.t };
    case "kick":
      return typeof m.id === "string" && /^[0-9a-z]{6}$/.test(m.id)
        ? { t: "kick", id: m.id }
        : null;
    case "vote":
      return typeof m.yes === "boolean" ? { t: "vote", yes: m.yes } : null;
    default:
      return null;
  }
}

/**
 * The most messages one connection may send in FLOOD_MS. A player sends a
 * few a round, and at most one answer every SEND_GAP_MS however often they
 * change it: a page sending more is broken or spending the day's
 * allowance, and is closed.
 */
export const FLOOD_LIMIT = 40;
export const FLOOD_MS = 10_000;

/** One connection's messages since its count began. */
export interface Flood {
  since: number;
  count: number;
}

/**
 * A connection's count with one more message: kept for that connection
 * alone (on its socket), so one page's flood never counts against another,
 * and starting again FLOOD_MS after it began. Over FLOOD_LIMIT, the
 * connection is closed.
 */
export function countMessage(
  flood: Flood | undefined,
  now: number
): Flood & { over: boolean } {
  const next =
    flood && now - flood.since < FLOOD_MS
      ? { since: flood.since, count: flood.count + 1 }
      : { since: now, count: 1 };
  return { ...next, over: next.count > FLOOD_LIMIT };
}

/** A short id for a player, shown to the others in place of their token. */
function playerId(random: Random): string {
  return Math.floor(random() * 36 ** 6)
    .toString(36)
    .padStart(6, "0");
}

/**
 * A hello's answer: the player, and the one whose connection goes if they
 * were already connected (by this tab's token; or by their account from
 * another device or tab, `elsewhere`, which that one is told); or why not.
 */
export type Hello =
  | { player: PlayerRecord; replaced?: PlayerRecord; elsewhere?: boolean }
  | { error: RoomError };

const IN_GAME: RoomPhase[] = ["loading", "playing", "reveal"];

/**
 * One room's game. The object makes one for each event from what the
 * connections and storage hold, calls one method, then does what `save`,
 * `wipe` and `alarmAt` ask and sends everyone their view.
 */
export class Room {
  /** Storage must be written: the game started, or a round was revealed. */
  save = false;
  /** Storage must be emptied: the game is over and gone. */
  wipe = false;
  /** When the tidying alarm should go off, if it should be set. */
  alarmAt: number | null = null;
  /** The room closes, everyone told why: a lobby idle for IDLE_MS. */
  closing: RoomError | null = null;
  /** Tokens whose connections must close: players the host took out. */
  kicks: string[] = [];
  /**
   * Signed-in players' results to sign and send, each on its player's own
   * connection, once the room's state is stored.
   */
  receipts: ReceiptToSend[] = [];

  constructor(
    public readonly code: string,
    /** The live part, from the connections, or null for no room. */
    public live: Live | null,
    /** The game, from storage, or null in a lobby. */
    public game: Game | null,
    /** The players connected now, in no order. */
    public players: PlayerRecord[],
    private readonly random: Random = Math.random
  ) {
    if (this.live && IN_GAME.includes(this.live.phase) && !this.game) {
      // A game whose record is gone: back to the lobby rather than stuck.
      this.live = { ...this.live, phase: "lobby", round: -1 };
      this.clearClocks();
    }
  }

  /**
   * The room from storage alone, once a new version of the Worker has
   * restarted it: the round being played starts again, loading.
   */
  static resume(
    code: string,
    saved: Saved,
    now: number,
    random: Random = Math.random
  ): Room {
    // A vote asked before the restart is gone with the round it was in.
    const room = new Room(
      code,
      { ...saved.live, vote: null },
      saved.game,
      [],
      random
    );
    const { phase, round } = saved.live;
    if (phase === "reveal") {
      if (round + 1 < saved.game.deal.length) room.load(round + 1, now);
      else room.finish(now, true);
    } else if (phase === "loading" || phase === "playing")
      room.load(round, now);
    return room;
  }

  /** The roster's players who aren't connected now. */
  private get away(): PlayerRecord[] {
    const here = new Set(this.players.map((p) => p.token));
    return (this.game?.roster ?? []).filter((p) => !here.has(p.token));
  }

  /** Everyone, here or away, in the order they came. */
  get everyone(): PlayerRecord[] {
    return [...this.players, ...this.away].sort((a, b) => a.joined - b.joined);
  }

  /** What storage should hold, with everyone as they are now. */
  saved(): Saved | null {
    if (!this.live || !this.game) return null;
    return {
      live: this.live,
      game: { ...this.game, roster: this.everyone },
    };
  }

  private change(patch: Partial<Live>) {
    if (this.live) this.live = { ...this.live, ...patch };
  }

  private clearClocks() {
    this.change({ startsAt: null, endsAt: null, maxAt: null, settling: false });
  }

  /** Someone did something: the lobby's idle clock starts again. */
  private touch(now: number) {
    this.change({ activeAt: now });
  }

  private get inGame(): boolean {
    return this.live !== null && IN_GAME.includes(this.live.phase);
  }

  hello(
    message: Extract<ClientMessage, { t: "hello" }>,
    now: number,
    /** Whether this connection may make a room (the Worker counted it). */
    mayMake: boolean,
    /**
     * The hello's room pass, once the Worker has checked its signature and
     * time; null for a guest, or a pass that didn't check out.
     */
    pass: RoomPass | null = null
  ): Hello {
    const result = this.join(message, now, mayMake, pass);
    if ("player" in result) {
      const { player } = result;
      // Whichever way they came in, this connection's own pass decides.
      if (pass !== null && pass.publicId === player.account) {
        player.passed = true;
      } else delete player.passed;
      // Back at the standings of a game they played: their receipt again.
      this.giveReceipt(player);
    }
    return result;
  }

  private join(
    message: Extract<ClientMessage, { t: "hello" }>,
    now: number,
    mayMake: boolean,
    pass: RoomPass | null
  ): Hello {
    if (message.v !== PROTOCOL) return { error: "version" };
    // Taken out by the host: not by this tab, nor another in the browser,
    // nor the account from anywhere.
    const kicked = this.live?.kicked ?? [];
    if (
      kicked.includes(kickKey(message.token)) ||
      (message.back !== undefined && kicked.includes(kickKey(message.back))) ||
      (pass !== null && kicked.includes(accountKey(pass.publicId)))
    ) {
      return { error: "kicked" };
    }

    // The same page again, from a new connection: a reload, or a drop.
    const connected = this.players.find((p) => p.token === message.token);
    if (connected && this.live) {
      return { player: connected, replaced: connected };
    }
    // The same account, connected from another device or tab: it plays on
    // here, and the other is told so and let go.
    const mine = pass && this.players.find((p) => p.account === pass.publicId);
    if (pass && mine && this.live) {
      const replaced = { ...mine };
      mine.token = message.token;
      mine.icon = message.icon;
      mine.look = pass.look;
      this.touch(now);
      return { player: mine, replaced, elsewhere: true };
    }
    const name = cleanName(pass ? pass.name : message.name);
    const look = pass ? pass.look : message.look ?? DEFAULT_LOOK;
    // A player who dropped out, back: by this tab's token, by the one the
    // browser kept from a tab that closed, or, signed in, by their account
    // from any device. Never by name, which anyone could type to take
    // their place and score.
    const away = this.away.find(
      (p) =>
        p.token === message.token ||
        p.token === message.back ||
        (pass !== null && p.account === pass.publicId)
    );
    if (away && this.live) {
      if (this.live.access === "locked") this.rejoinLocked(message, pass);
      away.token = message.token;
      away.icon = message.icon;
      away.look = look;
      if (pass) away.account = pass.publicId;
      this.players = [...this.players, away];
      this.touch(now);
      return { player: away };
    }

    const create = mayMake ? message.create : undefined;
    if (this.live) {
      if (create && !message.rejoin) return { error: "taken" };
      const { access, password } = this.live;
      if (access === "locked" && !this.rejoinLocked(message, pass)) {
        return { error: "locked" };
      }
      if (
        access === "password" &&
        !samePassword(message.password ?? "", password)
      ) {
        return { error: "password" };
      }
      if (this.everyone.length >= this.live.settings.maxPlayers) {
        return { error: "full" };
      }
    } else if (!create) {
      return { error: "missing" };
    }

    const player: PlayerRecord = {
      token: message.token,
      id: playerId(this.random),
      name: this.uniqueName(name),
      icon: message.icon,
      look,
      ...(pass ? { account: pass.publicId } : {}),
      joined: now,
      score: 0,
      time: 0,
      ready: -1,
      guess: null,
      ticked: -1,
      // Arriving at the standings of a game they didn't play: the lobby.
      returned: this.live?.phase === "over",
    };
    this.players = [...this.players, player];

    if (!this.live && create) {
      // A new room can't be locked: nobody could join it.
      const password =
        message.access?.access === "password"
          ? message.access.password ?? ""
          : "";
      this.live = {
        stamp: 0,
        settings: create,
        phase: "lobby",
        round: -1,
        startsAt: null,
        endsAt: null,
        maxAt: null,
        settling: false,
        host: player.id,
        activeAt: now,
        access: password ? "password" : "open",
        password,
        members: [],
        kicked: [],
        vote: null,
      };
    }
    this.touch(now);
    // Arriving mid-round: they play it, loading it now.
    this.advance(now);
    return { player };
  }

  /**
   * Whether a page may come back into the locked room: its browser was in
   * it when it was locked, or its account. From now on, by this tab's
   * token too.
   */
  private rejoinLocked(
    { token, back }: Extract<ClientMessage, { t: "hello" }>,
    pass: RoomPass | null
  ): boolean {
    const { members } = this.live!;
    const at = members.findIndex(
      (key) =>
        key === kickKey(token) || (back !== undefined && key === kickKey(back))
    );
    if (at >= 0) {
      this.change({
        members: members.map((key, i) => (i === at ? kickKey(token) : key)),
      });
      return true;
    }
    if (!pass || !members.includes(accountKey(pass.publicId))) return false;
    this.change({ members: [...members, kickKey(token)] });
    return true;
  }

  /** "Aru", then "Aru 2" for the next Aru, or a name that reads as it. */
  private uniqueName(name: string): string {
    const taken = new Set(this.everyone.map((p) => nameKey(p.name)));
    if (!taken.has(nameKey(name))) return name;
    for (let n = 2; ; n++) {
      const suffix = ` ${n}`;
      const next = name.slice(0, MAX_ROOM_NAME - suffix.length) + suffix;
      if (!taken.has(nameKey(next))) return next;
    }
  }

  /** A player's connection closed. */
  leave(player: PlayerRecord, now: number): void {
    this.players = this.players.filter((p) => p.token !== player.token);
    const live = this.live;
    if (!live) return;

    if (live.host === player.id) {
      const next = [...this.players].sort((a, b) => a.joined - b.joined)[0];
      if (next) this.change({ host: next.id });
    }
    if (this.players.length === 0) {
      // A lobby is gone with its last connection; a game waits a moment
      // for a reload, then its alarm deletes it.
      if (this.game) this.alarmAt = now + EMPTY_MS;
      return;
    }
    // The one everyone was waiting on has gone: the rest have answered.
    if (live.phase === "playing") this.settleIfAllAnswered(now);
    this.advance(now);
  }

  message(player: PlayerRecord, message: ClientMessage, now: number): void {
    const live = this.live;
    if (!live) return;
    const isHost = live.host === player.id;

    switch (message.t) {
      case "settings":
        if (isHost && live.phase === "lobby") {
          // Fewer places than players would leave someone out.
          const maxPlayers = Math.max(
            message.settings.maxPlayers,
            this.players.length
          );
          this.change({ settings: { ...message.settings, maxPlayers } });
          if (message.access) this.setAccess(message.access);
          this.touch(now);
        }
        return;
      case "start":
        if (
          isHost &&
          live.phase === "lobby" &&
          this.players.length >= MIN_PLAYERS
        ) {
          this.start(now);
        }
        return;
      case "ready":
        if (this.inGame && message.round <= live.round + 1) {
          player.ready = Math.max(player.ready, message.round);
          this.advance(now);
        }
        return;
      case "guess": {
        // Only this round's, while it plays: not before its song starts,
        // nor once the time is up (bar GRACE_MS for one sent as it ran
        // out), nor after the reveal. The room's clock decides all three.
        const { startsAt, endsAt } = live;
        if (
          live.phase !== "playing" ||
          message.round !== live.round ||
          startsAt === null ||
          endsAt === null ||
          now < startsAt ||
          now > endsAt + GRACE_MS
        ) {
          return;
        }
        const before = player.guess?.round === live.round ? player.guess : null;
        // The same answer again keeps its time (a page sends it again after
        // a drop); a change sooner than CHANGE_GAP_MS after the last is
        // dropped, as only a page changed to flood the room sends one.
        if (
          before &&
          (before.pick === message.pick ||
            now - (startsAt + before.ms) < CHANGE_GAP_MS)
        ) {
          return;
        }
        player.guess = {
          round: live.round,
          pick: message.pick,
          ms: now - startsAt,
        };
        this.settleIfAllAnswered(now);
        this.advance(now);
        return;
      }
      case "tick":
        if (
          live.phase === "playing" &&
          live.endsAt !== null &&
          now >= live.endsAt
        ) {
          player.ticked = live.round;
        }
        this.advance(now);
        return;
      case "end":
        if (isHost && this.inGame && !live.vote) {
          this.change({
            vote: {
              by: player.id,
              yes: [player.id],
              no: [],
              until: now + VOTE_MS,
            },
          });
          this.advance(now);
        }
        return;
      case "vote": {
        const vote = live.vote;
        if (
          !this.inGame ||
          !vote ||
          vote.yes.includes(player.id) ||
          vote.no.includes(player.id)
        ) {
          return;
        }
        this.change({
          vote: message.yes
            ? { ...vote, yes: [...vote.yes, player.id] }
            : { ...vote, no: [...vote.no, player.id] },
        });
        this.advance(now);
        return;
      }
      case "again":
        // Each goes when they like; the room once all have.
        if (live.phase === "over") {
          player.returned = true;
          this.advance(now);
        }
        return;
      case "stay":
        this.touch(now);
        return;
      case "kick":
        if (isHost && message.id !== player.id) this.kick(message.id, now);
        return;
      default:
        return;
    }
  }

  /**
   * Who can join, as the host saved it. Locking keeps the browsers in the
   * room now; a password stays as it was unless a new one came.
   */
  private setAccess({ access, password }: AccessChange) {
    const live = this.live!;
    if (access === "password" && !password && !live.password) return;
    this.change({
      access,
      password: access === "password" ? password ?? live.password : "",
      members:
        access !== "locked"
          ? []
          : live.access === "locked"
          ? live.members
          : this.everyone.flatMap(keysOf),
    });
  }

  /**
   * The host takes a player out, here or away: their place, score and
   * answers go, and their browser can't come back, by this tab or another.
   */
  private kick(id: string, now: number) {
    const target = this.everyone.find((p) => p.id === id);
    if (!target || !this.live) return;
    this.players = this.players.filter((p) => p.token !== target.token);
    this.kicks.push(target.token);
    // Their browser, and their account if signed in, from any device.
    const keys = keysOf(target);
    this.change({
      kicked: [...this.live.kicked, ...keys].slice(-MAX_KICKED),
      members: this.live.members.filter((key) => !keys.includes(key)),
    });
    if (this.game) {
      this.game = {
        ...this.game,
        roster: this.game.roster.filter((p) => p.token !== target.token),
        results: this.game.results.map((result) => ({
          ...result,
          right: result.right.filter((named) => named !== id),
        })),
      };
      // Or a restart would bring them back from the roster.
      this.save = true;
    }
    if (this.live.phase === "playing") this.settleIfAllAnswered(now);
    this.touch(now);
    this.advance(now);
  }

  /**
   * The tidying alarm: a game nobody has come back to is deleted; one
   * still played looks again later.
   */
  alarm(now: number): "close" | undefined {
    if (this.players.length === 0) return "close";
    if (this.game) this.alarmAt = now + TIDY_MS;
    return undefined;
  }

  private start(now: number) {
    const live = this.live!;
    for (const player of this.players) {
      player.score = 0;
      player.time = 0;
      player.ready = -1;
      player.guess = null;
      player.ticked = -1;
      player.returned = false;
    }
    this.game = {
      // From WebCrypto, not the room's random, which tests seed.
      id: newRoomGameId(),
      deal: dealRounds(live.settings, this.random),
      results: [],
      // Only those here play: anyone away from the last game is let go.
      roster: [...this.players],
    };
    this.alarmAt = now + TIDY_MS;
    this.load(0, now);
  }

  /** The first round's clip downloads; the rest load during the round before. */
  private load(round: number, now: number) {
    this.change({
      phase: "loading",
      round,
      startsAt: null,
      endsAt: now + LOAD_MS,
      maxAt: null,
      settling: false,
    });
    this.save = true;
  }

  /**
   * The round plays for everyone: the first after a count-in, the rest
   * after a moment for every page's message to arrive.
   */
  private play(round: number, now: number) {
    const startsAt = now + (round === 0 ? FIRST_LEAD_MS : LEAD_MS);
    this.change({
      phase: "playing",
      round,
      startsAt,
      endsAt: startsAt + this.live!.settings.guessSeconds * 1000,
      maxAt: null,
      settling: false,
    });
  }

  /**
   * Once everyone here has answered, the time left is cut to a few
   * seconds, for a change of mind; it never grows back.
   */
  private settleIfAllAnswered(now: number) {
    const live = this.live!;
    if (live.settling || live.endsAt === null) return;
    if (this.players.every((p) => p.guess?.round === live.round)) {
      this.change({
        settling: true,
        endsAt: Math.min(
          live.endsAt,
          Math.max(now, live.startsAt ?? now) + SETTLE_MS
        ),
      });
    }
  }

  private reveal(now: number) {
    const live = this.live!;
    const game = this.game!;
    const { round } = live;
    const answer = game.deal[round].answer;
    const right: string[] = [];
    for (const player of this.players) {
      const guess = player.guess?.round === round ? player.guess : null;
      if (guess && isRight(live.settings, answer, guess.pick)) {
        player.score += 1;
        player.time += guess.ms;
        right.push(player.id);
      }
    }
    this.game = {
      ...game,
      results: [...game.results, { answer, right }],
      roster: this.everyone,
    };
    const last = round + 1 >= game.deal.length;
    this.change({
      phase: "reveal",
      startsAt: null,
      endsAt: now + REVEAL_MS,
      maxAt: last ? null : now + REVEAL_MAX_MS,
      settling: false,
    });
    this.save = true;
  }

  private next(now: number) {
    const live = this.live!;
    if (live.round + 1 < this.game!.deal.length) {
      this.play(live.round + 1, now);
    } else {
      this.finish(now, true);
    }
  }

  /**
   * The standings, for OVER_MS, then everyone is back in the lobby. Only a
   * game `played` to its last reveal gives receipts, not one a vote ended.
   */
  private finish(now: number, played = false) {
    this.change({ phase: "over", vote: null });
    this.clearClocks();
    this.change({ endsAt: now + OVER_MS });
    this.save = true;
    if (played) this.markEnded(now);
  }

  /**
   * Keeps the game's end with it, in the write its standings make anyway:
   * when, how many stand in them, and each signed-in player's place and
   * score as the standings show them. Then each of them here gets their
   * receipt.
   */
  private markEnded(now: number) {
    const game = this.game!;
    const everyone = this.everyone;
    if (!game.id || everyone.length < MIN_PLAYERS) return;
    const place = places(everyone);
    const finishers = everyone.flatMap((p) =>
      p.account
        ? [
            {
              id: p.id,
              account: p.account,
              place: place.get(p.id)!,
              score: p.score,
            },
          ]
        : []
    );
    if (finishers.length === 0) return;
    this.game = {
      ...game,
      ended: { at: now, players: everyone.length, finishers },
    };
    for (const player of this.players) this.giveReceipt(player);
  }

  /**
   * A player's receipt for the game they played to its end, while its
   * standings show: only for the account they had in it, and only on a
   * connection that came with that account's pass. None for a guest, nor
   * for anyone who arrived at the standings after the end.
   */
  private giveReceipt(player: PlayerRecord) {
    const live = this.live;
    const game = this.game;
    const ended = game?.ended;
    if (!live || live.phase !== "over" || !game?.id || !ended) return;
    if (!player.account || !player.passed) return;
    const mine = ended.finishers.find(
      (f) => f.id === player.id && f.account === player.account
    );
    if (!mine) return;
    const { settings } = live;
    this.receipts.push({
      token: player.token,
      receipt: {
        gameId: game.id,
        publicId: mine.account,
        game: settings.game === "picture" ? settings.picture : settings.game,
        answers: settings.answers,
        rounds: game.deal.length,
        players: ended.players,
        place: mine.place,
        score: mine.score,
        endedAt: ended.at,
      },
    });
  }

  private toLobby(now: number) {
    for (const player of this.players) {
      player.ready = -1;
      player.guess = null;
      player.ticked = -1;
      player.returned = false;
    }
    this.game = null;
    this.change({ phase: "lobby", round: -1 });
    this.clearClocks();
    this.touch(now);
    this.wipe = true;
  }

  /**
   * Moves on whenever it's due: a phase's time is up, or nobody is left to
   * wait for. Called after every event, since there are no timers.
   */
  private advance(now: number) {
    this.countVote(now);
    for (let moved = true; moved; ) {
      moved = false;
      const live = this.live;
      if (!live || this.players.length === 0) return;
      if (live.phase === "lobby") {
        if (now >= live.activeAt + IDLE_MS) this.closing = "idle";
        return;
      }
      if (!this.game) return;
      const { round, endsAt, maxAt } = live;
      const due = endsAt !== null && now >= endsAt;

      if (live.phase === "over") {
        // Everyone still here has gone back, or the time is up.
        if (due || this.players.every((p) => p.returned)) {
          this.toLobby(now);
          moved = true;
        }
      } else if (live.phase === "loading") {
        if (due || this.players.every((p) => p.ready >= round)) {
          this.play(round, now);
          moved = true;
        }
      } else if (live.phase === "playing") {
        // Every page's last answer arrives with its tick; a page that
        // never ticks is waited for only GRACE_MS.
        const late = endsAt !== null && now >= endsAt + GRACE_MS;
        if (late || (due && this.players.every((p) => p.ticked >= round))) {
          this.reveal(now);
          moved = true;
        }
      } else if (live.phase === "reveal") {
        const allIn = this.players.every((p) => p.ready >= round + 1);
        if (
          (due && (maxAt === null || allIn)) ||
          (maxAt !== null && now >= maxAt)
        ) {
          this.next(now);
          moved = true;
        }
      }
    }
  }

  /**
   * The players here needed to end the game early: more than half. Two
   * players both have to agree; the host alone ends a game nobody else is
   * still in.
   */
  private get votesNeeded(): number {
    return Math.floor(this.players.length / 2) + 1;
  }

  /**
   * Ends the game once enough have said yes; drops the ask once it can't
   * pass any more, or its time is up. Votes of players who left don't count.
   */
  private countVote(now: number) {
    const vote = this.live?.vote;
    if (!vote) return;
    if (!this.inGame) {
      this.change({ vote: null });
      return;
    }
    const here = new Set(this.players.map((p) => p.id));
    if (!here.has(vote.by)) {
      this.change({ vote: null });
      return;
    }
    const yes = vote.yes.filter((id) => here.has(id)).length;
    const no = vote.no.filter((id) => here.has(id)).length;
    const needed = this.votesNeeded;
    if (yes >= needed) this.finish(now);
    else if (now >= vote.until || this.players.length - no < needed) {
      this.change({ vote: null });
    }
  }

  /** What one player sees; the answer only once it's revealed. */
  viewFor(player: PlayerRecord, now: number): RoomView {
    const live = this.live!;
    const { phase, round } = live;
    const deal = this.game?.deal ?? [];
    const results = this.game?.results ?? [];
    const revealing = phase === "reveal";
    const answering = phase === "playing" || revealing;
    const here = new Set(this.players.map((p) => p.token));
    const answer = deal[round]?.answer;
    const since = (at: number | null) => (at === null ? null : at - now);
    const isHere = (id: string) => this.players.some((p) => p.id === id);

    const players: PlayerView[] = this.everyone.map((p) => {
      const guess = p.guess?.round === round ? p.guess : null;
      return {
        id: p.id,
        name: p.name,
        icon: p.icon,
        look: p.look ?? DEFAULT_LOOK,
        score: p.score,
        time: p.time,
        here: here.has(p.token),
        ready: this.inGame ? p.ready : -1,
        answered: answering && guess !== null,
        ...(phase === "playing" && guess ? { sent: guess.ms } : {}),
        returned: phase === "over" && p.returned,
        ...(revealing && answer !== undefined
          ? {
              last: {
                pick: guess?.pick ?? null,
                right:
                  guess !== null && isRight(live.settings, answer, guess.pick),
                ms: guess?.ms ?? null,
              },
            }
          : {}),
      };
    });

    const current = this.inGame ? deal[round] : undefined;
    const next = answering ? deal[round + 1] : undefined;
    return {
      code: this.code,
      you: player.id,
      host: live.host,
      settings: live.settings,
      players,
      phase,
      round,
      total: deal.length || live.settings.rounds,
      startsIn: since(live.startsAt),
      endsIn:
        phase === "lobby" ? live.activeAt + IDLE_MS - now : since(live.endsAt),
      maxIn: since(live.maxAt),
      settling: live.settling,
      access: live.access,
      ...(live.vote && this.inGame && now < live.vote.until
        ? {
            vote: {
              yes: live.vote.yes.filter(isHere).length,
              no: live.vote.no.filter(isHere).length,
              needed: this.votesNeeded,
              endsIn: live.vote.until - now,
              mine: live.vote.yes.includes(player.id)
                ? true
                : live.vote.no.includes(player.id)
                ? false
                : null,
            },
          }
        : {}),
      ...(current
        ? {
            current: {
              ...current.media,
              // Not while the first clip loads, or a quick page would have
              // a few seconds with the four before anyone hears a note.
              ...(current.choices && answering
                ? { choices: current.choices }
                : {}),
            },
          }
        : {}),
      ...(next ? { next: next.media } : {}),
      results,
    };
  }
}
