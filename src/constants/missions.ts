import missionData from "../content/missions.json";

/** The tabs of the Missions pop-up, in order. */
export type MissionGroup =
  | "daily"
  | "ost"
  | "voice"
  | "picture"
  | "students"
  | "multiplayer"
  | "kivotos";

export const MISSION_GROUPS = missionData.groups as Array<{
  id: MissionGroup;
  name: string;
}>;

/**
 * What a mission can count, worked out from the saves by missionFacts (see
 * helpers/missions.ts), and what each means: a mission in missions.json
 * names one and a goal. A new kind of count is code, added here and there.
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

export interface Mission {
  /** Kept in the saves once cleared: never rename one. */
  id: string;
  group: MissionGroup;
  title: string;
  /** What to do, as the game's own missions word it. */
  text: string;
  fact: MissionFact;
  /**
   * The fact's value that clears it; "all" is every one there is, for a
   * fact with a total (every song, every badge).
   */
  goal: number | "all";
}

/**
 * The missions, from src/content/missions.json, each cleared once and for
 * good: a reset of stats doesn't take one back. Add one there with any fact
 * above; a new kind of fact is code, in missionFacts. Ids are kept in the
 * saves, so one is never renamed; removing one simply stops it showing.
 */
export const MISSIONS = missionData.missions as Mission[];
