/** The tabs of the Missions pop-up, in order. */
export type MissionGroup =
  | "daily"
  | "ost"
  | "voice"
  | "picture"
  | "students"
  | "multiplayer"
  | "kivotos";

export const MISSION_GROUPS: Array<{ id: MissionGroup; name: string }> = [
  { id: "daily", name: "Daily" },
  { id: "ost", name: "OST" },
  { id: "voice", name: "Voice" },
  { id: "picture", name: "Picture" },
  { id: "students", name: "Students" },
  { id: "multiplayer", name: "Multiplayer" },
  { id: "kivotos", name: "Kivotos" },
];

/**
 * What a mission counts, worked out from the saves by missionFacts (see
 * helpers/missions.ts); each mission is cleared once its fact reaches its
 * goal.
 */
export type MissionFact =
  | "dailiesWon"
  | "daySweep"
  | "bestDailyStreak"
  | "birthdayDaily"
  | "ostFirstTry"
  | "songsGuessed"
  | "badgesEarned"
  | "ostTimeAttack"
  | "choiceStreak"
  | "voiceFirstTry"
  | "voiceNoHintWins"
  | "voicesNamed"
  | "voiceTimeAttack"
  | "haloShapes"
  | "weaponShapes"
  | "picturesNamed"
  | "quickFinds"
  | "minuteFinds"
  | "bothDailies"
  | "studentsFound"
  | "roomsPlayed"
  | "roomsWon"
  | "jpRounds"
  | "bestStreak";

export interface Mission {
  /** Kept in the saves once cleared: never rename one. */
  id: string;
  group: MissionGroup;
  title: string;
  /** What to do, as the game's own missions word it. */
  text: string;
  fact: MissionFact;
  /** The fact's value that clears it; "all" is every song. */
  goal: number | "all";
}

/**
 * The missions, each cleared once and for good: a reset of stats doesn't
 * take one back. Some unlock a cosmetic (see cosmetics.ts). Ids are kept in
 * the saves, so a mission is never renamed or removed, only added.
 */
export const MISSIONS: Mission[] = [
  {
    id: "first-daily",
    group: "daily",
    title: "First day at Schale",
    text: "Clear a daily puzzle in any game.",
    fact: "dailiesWon",
    goal: 1,
  },
  {
    id: "daily-sweep",
    group: "daily",
    title: "Full schedule",
    text: "Clear all six daily puzzles on one day: OST, Voice, Halo, Weapon, Gameplay and Lore.",
    fact: "daySweep",
    goal: 6,
  },
  {
    id: "daily-7",
    group: "daily",
    title: "A week on duty",
    text: "Clear a daily puzzle 7 days in a row, in one game.",
    fact: "bestDailyStreak",
    goal: 7,
  },
  {
    id: "daily-30",
    group: "daily",
    title: "A month on duty",
    text: "Clear a daily puzzle 30 days in a row, in one game.",
    fact: "bestDailyStreak",
    goal: 30,
  },
  {
    id: "birthday",
    group: "daily",
    title: "Happy birthday!",
    text: "Clear a daily puzzle on a student's birthday.",
    fact: "birthdayDaily",
    goal: 1,
  },
  {
    id: "ost-first-try",
    group: "ost",
    title: "Perfect pitch",
    text: "Name a song from its 1-second clip, in Daily or Classic.",
    fact: "ostFirstTry",
    goal: 1,
  },
  {
    id: "ost-100",
    group: "ost",
    title: "Record collector",
    text: "Guess 100 different songs, in Daily or Classic.",
    fact: "songsGuessed",
    goal: 100,
  },
  {
    id: "ost-all",
    group: "ost",
    title: "Complete discography",
    text: "Guess every song, in Daily or Classic.",
    fact: "songsGuessed",
    goal: "all",
  },
  {
    id: "ost-badges",
    group: "ost",
    title: "Full shelf",
    text: "Earn all eight OST badges.",
    fact: "badgesEarned",
    goal: 8,
  },
  {
    id: "ost-timeattack",
    group: "ost",
    title: "Speed listener",
    text: "Name 20 songs in one OST Time Attack run.",
    fact: "ostTimeAttack",
    goal: 20,
  },
  {
    id: "ost-choice",
    group: "ost",
    title: "Sharp ears",
    text: "Win 10 OST 4-Choice rounds in a row.",
    fact: "choiceStreak",
    goal: 10,
  },
  {
    id: "voice-first-try",
    group: "voice",
    title: "I know that voice",
    text: "Name a student by voice before any hint, in Daily or Classic.",
    fact: "voiceFirstTry",
    goal: 1,
  },
  {
    id: "voice-nohint",
    group: "voice",
    title: "No hints needed",
    text: "Win 10 Voice rounds with hints off.",
    fact: "voiceNoHintWins",
    goal: 10,
  },
  {
    id: "voice-50",
    group: "voice",
    title: "Voice archive",
    text: "Name 50 different students by voice.",
    fact: "voicesNamed",
    goal: 50,
  },
  {
    id: "voice-timeattack",
    group: "voice",
    title: "Roll call",
    text: "Name 15 voices in one Voice Time Attack run.",
    fact: "voiceTimeAttack",
    goal: 15,
  },
  {
    id: "halo-shape",
    group: "picture",
    title: "Shape of a halo",
    text: "Name a student from their halo's silhouette.",
    fact: "haloShapes",
    goal: 1,
  },
  {
    id: "weapon-shape",
    group: "picture",
    title: "Know your arms",
    text: "Name a student from their weapon's silhouette.",
    fact: "weaponShapes",
    goal: 1,
  },
  {
    id: "picture-50",
    group: "picture",
    title: "Halo scholar",
    text: "Name 50 different halos or weapons.",
    fact: "picturesNamed",
    goal: 50,
  },
  {
    id: "students-quick",
    group: "students",
    title: "Sharp deduction",
    text: "Find a student in 3 guesses or fewer.",
    fact: "quickFinds",
    goal: 1,
  },
  {
    id: "students-minute",
    group: "students",
    title: "Quick study",
    text: "Find a student in under a minute on the clock.",
    fact: "minuteFinds",
    goal: 1,
  },
  {
    id: "students-both",
    group: "students",
    title: "Both sides",
    text: "Clear the Gameplay and Lore daily puzzles on the same day.",
    fact: "bothDailies",
    goal: 1,
  },
  {
    id: "students-100",
    group: "students",
    title: "Homeroom",
    text: "Find 100 different students.",
    fact: "studentsFound",
    goal: 100,
  },
  {
    id: "room-first",
    group: "multiplayer",
    title: "Party time",
    text: "Finish a multiplayer game.",
    fact: "roomsPlayed",
    goal: 1,
  },
  {
    id: "room-win",
    group: "multiplayer",
    title: "Top of the room",
    text: "Finish first in a multiplayer game.",
    fact: "roomsWon",
    goal: 1,
  },
  {
    id: "room-10",
    group: "multiplayer",
    title: "Regular",
    text: "Finish 10 multiplayer games.",
    fact: "roomsPlayed",
    goal: 10,
  },
  {
    id: "jp",
    group: "kivotos",
    title: "Ahead of time",
    text: "Play a round of Students, Voice or Picture on the JP server.",
    fact: "jpRounds",
    goal: 1,
  },
  {
    id: "streak-100",
    group: "kivotos",
    title: "Above Kivotos",
    text: "Win 100 in a row, in any mode, and reach the sky.",
    fact: "bestStreak",
    goal: 100,
  },
];
