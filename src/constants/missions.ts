import missionData from "../content/missions.json";
import type { Server } from "../types/server";

/**
 * A tab of the Missions pop-up, by its id in missions.json's groups: data,
 * so the admin tool can add one.
 */
export type MissionGroup = string;

/** The tabs of the Missions pop-up, in order. */
export const MISSION_GROUPS = missionData.groups as Array<{
  id: MissionGroup;
  name: string;
}>;

/**
 * What a mission can count, worked out from the saves by missionFacts (see
 * helpers/missions.ts), and what each means: a mission in missions.json
 * names one and a goal. These stay as they are; a new kind of count is a
 * rule (MissionRule below), which needs no code.
 */
export const MISSION_FACTS = {
  dailiesWon: "Daily puzzles won, every game, both servers",
  daySweep: "Most of the six daily puzzles won on one day, on one server",
  bestDailyStreak: "Longest run of days a daily puzzle was won, in one game",
  birthdayDaily: "1 once a daily puzzle is won on a student's birthday",
  ostFirstTry: "OST rounds (Daily, Classic) won on the 1-second clip",
  songsGuessed: 'Different songs guessed (Daily, Classic); "all" is every song',
  badgesEarned: 'OST badges earned; "all" is every album',
  ostTimeAttack: "Most songs in one OST Time Attack run",
  choiceStreak: "Longest run of OST 4-Choice wins",
  voiceFirstTry: "Voice rounds (Daily, Classic, No hints) won before any hint",
  voiceNoHintWins: "Voice rounds won with hints off",
  voicesNamed: "Different students named by voice",
  voiceTimeAttack: "Most voices in one Voice Time Attack run",
  haloShapes: "Halos named from their silhouette",
  weaponShapes: "Weapons named from their silhouette",
  picturesNamed: "Different halos and weapons named",
  quickFinds: "Students found in 3 guesses or fewer",
  minuteFinds: "Students found in under a minute on the clock",
  bothDailies: "Days both the Gameplay and Lore daily were won",
  studentsFound: "Different students found in the student game",
  roomsPlayed: "Multiplayer games this browser saw to the standings",
  roomsWon: "Multiplayer games this browser finished first",
  jpRounds: "Rounds played on the JP server",
  bestStreak: "Longest win streak in any mode, daily streaks included",
} as const;

export type MissionFact = keyof typeof MISSION_FACTS;

/**
 * The games a rule can count: the picture game's halos and weapons, and the
 * student game's two ways to play, each apart, as players see them.
 */
export const RULE_GAMES = {
  ost: "OST",
  voice: "Voice",
  halo: "Halo",
  weapon: "Weapon",
  gameplay: "Students: Gameplay",
  lore: "Students: Lore",
  multiplayer: "Multiplayer",
} as const;

export type RuleGame = keyof typeof RULE_GAMES;

/** The ways to play, by the names every game shares. */
export const RULE_MODES = {
  daily: "Daily",
  classic: "Classic",
  nohint: "No hints",
  choice: "4-Choice",
  timeattack: "Time Attack",
} as const;

export type RuleMode = keyof typeof RULE_MODES;

/** What a rule does with the rounds it matches. */
export const RULE_COUNTS = {
  rounds: "How many",
  different: "How many different answers (songs, students, halos, weapons)",
  days: "How many different days (daily puzzles)",
  streak: "Most in a row, in one way to play",
  dayStreak: "Most days in a row (daily puzzles)",
  run: "Most in one Time Attack run",
} as const;

export type RuleCount = keyof typeof RULE_COUNTS;

/**
 * A count made from the rounds in the saves, so a new kind of mission needs
 * no code: which rounds (the games, ways to play, server, picture or
 * silhouette), which of them count (won or only played, within so many
 * tries, from a short clip, on a fast clock), and what's done with them.
 * Every field but the count may be left out, meaning any. A field only some
 * games have keeps the count to those: a clip to the OST, a clock to the
 * student game, a server to the games that have one.
 */
export interface MissionRule {
  count: RuleCount;
  games?: RuleGame[];
  modes?: RuleMode[];
  server?: Server;
  /** Halos and weapons only: their silhouettes (true) or the pictures. */
  silhouette?: boolean;
  /** Won, the default, or played to the end, won or not. */
  result?: "won" | "played";
  /** Within this many tries: 1 is the first. */
  tries?: number;
  /** The OST's: heard no more than this many seconds of the song. */
  clip?: number;
  /** The student game's: in under this many seconds on its clock. */
  seconds?: number;
}

export interface Mission {
  /** Kept in the saves once cleared: never rename one. */
  id: string;
  group: MissionGroup;
  title: string;
  /** What to do, as the game's own missions word it. */
  text: string;
  /** What it counts: one of the game's counts, or a rule; never both. */
  fact?: MissionFact;
  rule?: MissionRule;
  /**
   * The count that clears it; "all" is every one there is, for a fact with a
   * total (every song, every badge).
   */
  goal: number | "all";
  /**
   * No longer one to clear (docs/accounts.md, section 4): a mission whose
   * ask changed gets a new id, and the old one is retired, never removed.
   * Whoever cleared it sees it under Retired and keeps what it unlocked.
   */
  retired?: boolean;
}

/**
 * The missions, from src/content/missions.json, each cleared once and for
 * good: a reset of stats doesn't take one back. Add one there with any fact
 * or rule above, which need no code. Ids are kept in the
 * saves, so one is never renamed; removing one simply stops it showing.
 */
export const MISSIONS = missionData.missions as Mission[];

/** The missions there are to clear: every one but the retired. */
export const ACTIVE_MISSIONS = MISSIONS.filter(({ retired }) => !retired);
