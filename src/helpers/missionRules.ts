import { playTimes } from "../constants";
import {
  Mission,
  MissionFact,
  MissionRule,
  MISSIONS,
  RuleGame,
  RuleMode,
} from "../constants/missions";
import { GAME_MODES, GameMode } from "../types/mode";
import { PICTURE_SLOTS, PictureMode } from "../types/picture";
import { Round } from "../types/stats";
import { Server, SERVERS } from "../types/server";
import { STUDENT_SLOTS } from "../types/student";
import { VOICE_MODES, VoiceMode } from "../types/voice";
import { isFinished } from "./calStats";
import type { RoomRecord } from "./missions";
import type { SaveFile } from "./saveFile";
import {
  isOver as isStudentOver,
  isWon as isStudentWon,
} from "./studentRounds";
import { isOver as isNamedOver, isWon as isNamedWon } from "./voiceRounds";

/**
 * The rounds the missions count, as a save holds them: this browser's, or
 * an imported file's in the admin tool's preview.
 */
export type MissionSave = Pick<
  SaveFile,
  | "rounds"
  | "students"
  | "voices"
  | "pictures"
  | "jp"
  | "roomRecord"
  | "roomGames"
>;

/** What a rule can ask of a round, beyond its game and way to play. */
type Detail = "tries" | "clip" | "seconds" | "answer" | "day" | "run";

/**
 * One finished round as the rules see it, whatever its game: an absent
 * field is one its game doesn't have (the OST has no server or clock).
 */
export interface PlayedRound {
  game: RuleGame;
  mode?: RuleMode;
  server?: Server;
  /** Its list in the saves: a streak runs within one. */
  list: string;
  /** Halos and weapons: named from the silhouette. */
  shape?: boolean;
  won: boolean;
  tries?: number;
  clip?: number;
  seconds?: number;
  /** What was named, so two games naming one student name the same. */
  answer?: string;
  day?: number;
  run?: number;
}

/** A game's way to play, and what its rounds can tell a rule. */
export interface RuleWay {
  game: RuleGame;
  mode?: RuleMode;
  server: boolean;
  /** Can be played from silhouettes. */
  shape: boolean;
  has: Detail[];
}

const way = (
  game: RuleGame,
  mode: RuleMode,
  has: Detail[],
  { server = true, shape = false } = {}
): RuleWay => ({ game, mode, server, shape, has: ["answer", ...has] });

/** Every way to play there is, by game. */
export const RULE_WAYS: RuleWay[] = [
  way("ost", "daily", ["tries", "clip", "day"], { server: false }),
  way("ost", "classic", ["tries", "clip"], { server: false }),
  way("ost", "choice", ["tries", "clip"], { server: false }),
  way("ost", "timeattack", ["tries", "clip", "run"], { server: false }),
  way("voice", "daily", ["tries", "day"]),
  way("voice", "classic", ["tries"]),
  way("voice", "nohint", ["tries"]),
  way("voice", "choice", ["tries"]),
  way("voice", "timeattack", ["tries", "run"]),
  ...(["halo", "weapon"] as const).flatMap((game) => [
    way(game, "daily", ["tries", "day"]),
    way(game, "classic", ["tries"], { shape: true }),
    way(game, "nohint", ["tries"], { shape: true }),
    way(game, "choice", ["tries"], { shape: true }),
    way(game, "timeattack", ["tries", "run"], { shape: true }),
  ]),
  ...(["gameplay", "lore"] as const).flatMap((game) => [
    way(game, "daily", ["tries", "seconds", "day"]),
    way(game, "classic", ["tries", "seconds"]),
  ]),
  { game: "multiplayer", server: false, shape: false, has: [] },
];

/**
 * The game's own counts that a rule counts the same (the test holds them
 * to it), so the admin tool can start a rule from one.
 */
export const FACT_RULES: Partial<Record<MissionFact, MissionRule>> = {
  ostFirstTry: {
    count: "rounds",
    games: ["ost"],
    modes: ["daily", "classic"],
    tries: 1,
  },
  voiceNoHintWins: { count: "rounds", games: ["voice"], modes: ["nohint"] },
  voiceTimeAttack: { count: "run", games: ["voice"] },
  choiceStreak: { count: "streak", games: ["ost"], modes: ["choice"] },
  haloShapes: { count: "rounds", games: ["halo"], silhouette: true },
  weaponShapes: { count: "rounds", games: ["weapon"], silhouette: true },
  quickFinds: { count: "rounds", games: ["gameplay", "lore"], tries: 3 },
  minuteFinds: { count: "rounds", games: ["gameplay", "lore"], seconds: 60 },
  studentsFound: { count: "different", games: ["gameplay", "lore"] },
  voicesNamed: { count: "different", games: ["voice"] },
  picturesNamed: { count: "different", games: ["halo", "weapon"] },
  jpRounds: { count: "rounds", server: "jp", result: "played" },
  roomsPlayed: { count: "rounds", games: ["multiplayer"], result: "played" },
  roomsWon: { count: "rounds", games: ["multiplayer"] },
};

/** What a rule needs its rounds to have, from its filters and its count. */
function detailsOf(rule: MissionRule): Detail[] {
  const needs: Detail[] = [];
  if (rule.tries !== undefined) needs.push("tries");
  if (rule.clip !== undefined) needs.push("clip");
  if (rule.seconds !== undefined) needs.push("seconds");
  if (rule.count === "different") needs.push("answer");
  if (rule.count === "days" || rule.count === "dayStreak") needs.push("day");
  if (rule.count === "run") needs.push("run");
  return needs;
}

/**
 * The ways to play a rule counts: none means it can never count anything,
 * which the content check refuses.
 */
export function waysOf(rule: MissionRule): RuleWay[] {
  const needs = detailsOf(rule);
  return RULE_WAYS.filter(
    (way) =>
      (!rule.games?.length || rule.games.includes(way.game)) &&
      (!rule.modes?.length ||
        (way.mode !== undefined && rule.modes.includes(way.mode))) &&
      (rule.server === undefined || way.server) &&
      (rule.silhouette === undefined ||
        ((way.game === "halo" || way.game === "weapon") &&
          (!rule.silhouette || way.shape))) &&
      needs.every((detail) => way.has.includes(detail))
  );
}

const OST_MODES: Record<GameMode, RuleMode> = {
  daily: "daily",
  endless: "classic",
  choice: "choice",
  timeattack: "timeattack",
};

const VOICE_RULE_MODES: Record<VoiceMode, RuleMode> = {
  daily: "daily",
  endless: "classic",
  nohint: "nohint",
  choice: "choice",
  timeattack: "timeattack",
};

/** The picture game's ways to play: a mode and whether it's silhouettes. */
const PICTURE_RULE_MODES: Record<PictureMode, [RuleMode, boolean]> = {
  daily: ["daily", false],
  endless: ["classic", false],
  nohint: ["nohint", false],
  silhouette: ["classic", true],
  "silhouette-nohint": ["nohint", true],
  choice: ["choice", false],
  "choice-silhouette": ["choice", true],
  timeattack: ["timeattack", false],
};

/** Only what's there, so an absent detail stays absent. */
const given = <T extends object>(fields: T): Partial<T> =>
  Object.fromEntries(
    Object.entries(fields).filter(([, value]) => value !== undefined)
  ) as Partial<T>;

function ostRounds(mode: GameMode, rounds: Round[]): PlayedRound[] {
  const rule = OST_MODES[mode];
  const sixTries = mode === "daily" || mode === "endless";
  return rounds.filter(isFinished).map((round) => ({
    game: "ost",
    mode: rule,
    list: `ost-${mode}`,
    won: round.didGuess,
    // A song won on its second try was heard for that try's clip.
    tries: sixTries ? round.currentTry : 1,
    ...given({
      clip: sixTries
        ? playTimes[Math.min(Math.max(round.currentTry, 1), 6) - 1] / 1000
        : round.clip,
      day: round.day,
      run: round.run,
    }),
    answer: `song:${round.solution.themeNo}`,
  }));
}

function serverRounds(
  server: Server,
  {
    students,
    voices,
    pictures,
  }: Pick<SaveFile, "students" | "voices" | "pictures">
): PlayedRound[] {
  const played: PlayedRound[] = [];
  for (const mode of VOICE_MODES) {
    for (const round of voices[mode].filter(isNamedOver)) {
      played.push({
        game: "voice",
        mode: VOICE_RULE_MODES[mode],
        server,
        list: `${server}:voice-${mode}`,
        won: isNamedWon(round),
        tries: round.guesses.length,
        answer: `student:${round.answer}`,
        ...given({ day: round.day, run: round.run }),
      });
    }
  }
  for (const slot of PICTURE_SLOTS) {
    const [kind, ...rest] = slot.split("-") as ["halo" | "weapon", ...string[]];
    const [mode, shape] = PICTURE_RULE_MODES[rest.join("-") as PictureMode];
    for (const round of pictures[slot].filter(isNamedOver)) {
      played.push({
        game: kind,
        mode,
        server,
        list: `${server}:${slot}`,
        shape: shape || round.shape === true,
        won: isNamedWon(round),
        tries: round.guesses.length,
        answer: `${kind}:${round.answer}`,
        ...given({ day: round.day, run: round.run }),
      });
    }
  }
  for (const slot of STUDENT_SLOTS) {
    const [game, mode] = slot.split("-") as ["gameplay" | "lore", string];
    for (const round of students[slot].filter(isStudentOver)) {
      played.push({
        game,
        mode: mode === "daily" ? "daily" : "classic",
        server,
        list: `${server}:${slot}`,
        won: isStudentWon(round),
        tries: round.guesses.length,
        answer: `student:${round.answer}`,
        ...given({
          seconds: round.time === undefined ? undefined : round.time / 1000,
          day: round.day,
        }),
      });
    }
  }
  return played;
}

/** Every finished round in a save, every game, both servers. */
export function playedRounds(save: MissionSave): PlayedRound[] {
  return [
    ...GAME_MODES.flatMap((mode) => ostRounds(mode, save.rounds[mode])),
    ...SERVERS.flatMap((server) =>
      serverRounds(server, server === "jp" ? save.jp : save)
    ),
    ...save.roomGames.map(
      ({ won }): PlayedRound => ({ game: "multiplayer", list: "rooms", won })
    ),
  ];
}

/** A round among those the rule looks at, counted or not. */
function inScope(
  rule: MissionRule,
  ways: RuleWay[],
  round: PlayedRound
): boolean {
  return (
    ways.some(({ game, mode }) => game === round.game && mode === round.mode) &&
    (rule.server === undefined || round.server === rule.server) &&
    (rule.silhouette === undefined || round.shape === rule.silhouette) &&
    detailsOf(rule).every((detail) => round[detail] !== undefined)
  );
}

/** A round the rule counts. */
function counts(rule: MissionRule, round: PlayedRound): boolean {
  return (
    (rule.result === "played" || round.won) &&
    (rule.tries === undefined || round.tries! <= rule.tries) &&
    (rule.clip === undefined || round.clip! <= rule.clip) &&
    (rule.seconds === undefined || round.seconds! < rule.seconds)
  );
}

function longestDayRun(days: Set<number>): number {
  let best = 0;
  for (const day of days) {
    if (days.has(day - 1)) continue;
    let length = 1;
    while (days.has(day + length)) length += 1;
    best = Math.max(best, length);
  }
  return best;
}

/**
 * A rule's count among `rounds`. The multiplayer games from before save
 * format 2 are only two counts, so they add to a plain count of games and
 * nothing else.
 */
export function ruleCount(
  rule: MissionRule,
  rounds: PlayedRound[],
  legacy: RoomRecord = { games: 0, wins: 0 }
): number {
  const ways = waysOf(rule);
  const scope = rounds.filter((round) => inScope(rule, ways, round));
  const hits = scope.filter((round) => counts(rule, round));

  switch (rule.count) {
    case "rounds": {
      const rooms = ways.some(({ game }) => game === "multiplayer");
      const before = rule.result === "played" ? legacy.games : legacy.wins;
      return hits.length + (rooms ? before : 0);
    }
    case "different":
      return new Set(hits.map(({ answer }) => answer)).size;
    case "days":
      return new Set(hits.map(({ day }) => day)).size;
    case "dayStreak":
      return longestDayRun(new Set(hits.map(({ day }) => day!)));
    case "run": {
      const runs = new Map<string, number>();
      for (const { list, run } of hits) {
        const key = `${list}:${run}`;
        runs.set(key, (runs.get(key) ?? 0) + 1);
      }
      return Math.max(0, ...runs.values());
    }
    case "streak": {
      const now = new Map<string, number>();
      let best = 0;
      for (const round of scope) {
        const length = counts(rule, round) ? (now.get(round.list) ?? 0) + 1 : 0;
        now.set(round.list, length);
        best = Math.max(best, length);
      }
      return best;
    }
  }
}

/**
 * Each mission with a rule, by id, and its count from `save`; the save's
 * rounds are read only when a mission there to clear has one.
 */
export function ruleValues(
  save: MissionSave,
  missions: Mission[] = MISSIONS
): Record<string, number> {
  const ruled = missions.filter(({ rule, retired }) => rule && !retired);
  if (ruled.length === 0) return {};
  const rounds = playedRounds(save);
  return Object.fromEntries(
    ruled.map(({ id, rule }) => [id, ruleCount(rule!, rounds, save.roomRecord)])
  );
}
