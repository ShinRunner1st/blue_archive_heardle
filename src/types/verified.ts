/**
 * Verified stats (docs/verified-stats.md): what `/verified` takes and
 * answers. The accounts Worker keeps them; the page will send its dailies
 * and receipts and show the answers (step 4).
 */

/**
 * A started daily can be finished until the end of the account's next day
 * (section 6): its day and one more.
 */
export const LATE_DAYS = 1;

/** How long a room's receipt is taken after its game ended (section 8). */
export const ROOM_RECEIPT_MS = 7 * 24 * 60 * 60_000;

/** The most a request to `/verified` may carry: Students' longest round fits. */
export const MAX_VERIFIED_BODY = 16_384;

export type VerifiedOutcome = "won" | "lost" | "abandoned";

/** `POST /verified` `{ action: "start" }`. */
export type StartAnswer =
  /** Started now, or already started on another of the player's devices. */
  | { status: "started" | "open"; attempt: string; day: number }
  /** Played already: its result. */
  | { status: "done"; outcome: VerifiedOutcome; tries: number | null };

/** `POST /verified` `{ action: "finish" }`. */
export interface FinishAnswer {
  /** Judged now, or judged already (the same answer again). */
  status: "finished" | "done";
  outcome: VerifiedOutcome;
  tries: number | null;
  /** Start to finish on the server's clock, ms. */
  time: number | null;
  /** Whether the time counts (section 6): the finish came straight away. */
  timeVerified: boolean;
}

/** `POST /verified` `{ action: "room" }`. */
export interface RoomAnswer {
  /** Counted now, or counted before (the receipt came again). */
  status: "counted" | "already";
}

/** One verified daily's record, for the profile's Verified section. */
export interface VerifiedDailyStats {
  played: number;
  won: number;
  lost: number;
  abandoned: number;
  /** Wins by tries (Students: by guesses). */
  spread: Record<string, number>;
  /** Days won in a row up to today; today not yet played doesn't break it. */
  streak: number;
  bestStreak: number;
  /** The fastest verified time won, ms. */
  bestTime: number | null;
  /** The first puzzle number counted. */
  firstDay: number;
}

export interface VerifiedRoomStats {
  played: number;
  /** First places, ties shared. */
  first: number;
  /** Games by place. */
  places: Record<string, number>;
  /** The first counted, as a puzzle number (in UTC). */
  firstDay: number;
}

/** `GET /verified`. */
export interface VerifiedView {
  /** The account's daily time zone, once it has one. */
  zone: string | null;
  /** Today's puzzle number in that zone. */
  today: number | null;
  /** The first puzzle number anything was counted on. */
  since: number | null;
  /** By verified daily (ost, voice.global, ...): only those played. */
  dailies: Record<string, VerifiedDailyStats>;
  rooms: VerifiedRoomStats | null;
}
