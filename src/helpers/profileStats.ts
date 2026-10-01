import { MAX_TRIES } from "../constants/game";
import { Round } from "../types/stats";
import { Server } from "../types/server";
import { StudentGame, StudentRound } from "../types/student";
import { NamedRound, VoiceRoundMode, VOICE_ROUND_MODES } from "../types/voice";
import {
  PictureKind,
  PictureRoundMode,
  PICTURE_KINDS,
  PICTURE_ROUND_MODES,
} from "../types/picture";
import { isFinished } from "./calStats";
import { dayNumber } from "./daily";
import { loadRoomRecord, RoomRecord } from "./missions";
import { pictureTimeAttackStats } from "./pictureTimeAttack";
import { senseiStats, SenseiStats } from "./senseiStats";
import { getServer } from "./server";
import {
  loadPictureRounds,
  loadRounds,
  loadStudentRounds,
  loadVoiceRounds,
} from "./storage";
import { calStreaks } from "./streaks";
import {
  asRound as studentAsRound,
  isOver as isStudentOver,
  isWon as isStudentWon,
} from "./studentRounds";
import { timeAttackStats, TimeAttackStats } from "./timeAttack";
import {
  asRound as voiceAsRound,
  isOver as isVoiceOver,
  isWon as isVoiceWon,
} from "./voiceRounds";
import { voiceTimeAttackStats } from "./voiceTimeAttack";
import { bestWinStreak } from "./winStreak";

/** One way to play a game, as its profile tab lists it. */
export interface ModeLine {
  label: string;
  played: number;
  won: number;
  /** The longest run of wins in a row, daily or not. */
  bestRun: number;
}

/** One bar of how a game's daily puzzles went: in N tries, or lost. */
export interface SpreadBar {
  label: string;
  count: number;
  lost?: boolean;
}

export type ProfileGameId =
  | "ost"
  | "voice"
  | "halo"
  | "weapon"
  | "gameplay"
  | "lore";

/** A game's record, every way to play it, for the profile. */
export interface ProfileGame {
  id: ProfileGameId;
  name: string;
  /** Rounds finished, Time Attack's apart. */
  played: number;
  won: number;
  /** Tries (guesses, in the student game) a win took, on average. */
  averageTries: number | null;
  daily: { played: number; won: number; current: number; best: number };
  /** How the daily puzzles went, try by try. */
  spread: SpreadBar[];
  modes: ModeLine[];
  /** Runs and the best score; none in the student game. */
  timeAttack: { runs: number; best: number; answered: number } | null;
  /** The student game's clock: the fastest find and the average, in ms. */
  fastest: number | null;
  averageTime: number | null;
}

export interface ProfileStats extends SenseiStats {
  games: ProfileGame[];
  room: RoomRecord;
  /** Days a daily puzzle was finished, in any game. */
  daysPlayed: number;
  /** Daily puzzles won in every game. */
  dailiesWon: number;
}

/** A finished round as the tallies read it. */
interface Played {
  won: boolean;
  tries: number;
}

const average = (values: number[]) =>
  values.length === 0
    ? null
    : values.reduce((sum, value) => sum + value, 0) / values.length;

/** The longest run of wins in a row, in play order. */
function bestRun(rounds: Played[]): number {
  let best = 0;
  let run = 0;
  for (const round of rounds) {
    run = round.won ? run + 1 : 0;
    best = Math.max(best, run);
  }
  return best;
}

function modeLine(label: string, rounds: Played[]): ModeLine {
  return {
    label,
    played: rounds.length,
    won: rounds.filter((round) => round.won).length,
    bestRun: bestRun(rounds),
  };
}

/** Daily puzzles as one-a-day rounds, with their streaks. */
function dailyOf(rounds: Round[], today: number) {
  const finished = rounds.filter(isFinished);
  const streaks = calStreaks(rounds, today);
  return {
    played: finished.length,
    won: finished.filter((round) => round.didGuess).length,
    current: streaks.current,
    best: streaks.max,
  };
}

/** A daily's spread for a game of `tries` tries: a bar for each, then lost. */
function spreadOf(rounds: Round[], tries: number): SpreadBar[] {
  // As calStats buckets the OST's: currentTry is past the winning guess.
  const counts = Array.from({ length: tries + 1 }, () => 0);
  rounds.filter(isFinished).forEach((round) => {
    if (!round.didGuess) counts[0] += 1;
    else counts[Math.min(Math.max(round.currentTry, 1), tries)] += 1;
  });
  return [
    ...counts.slice(1).map((count, i) => ({ label: String(i + 1), count })),
    { label: "✗", count: counts[0], lost: true },
  ];
}

const OST_MODES = [
  ["daily", "Daily"],
  ["endless", "Classic"],
  ["choice", "4-Choice"],
] as const;

function ostGame(today: number): ProfileGame {
  const byMode = OST_MODES.map(([mode, label]) => ({
    label,
    rounds: loadRounds(mode).filter(isFinished),
  }));
  const all = byMode.flatMap(({ rounds }) => rounds);
  const daily = loadRounds("daily");
  const ta = timeAttackStats(loadRounds("timeattack"));
  // Tries mean something only with six of them: not in 4-Choice.
  const sixTries = [...byMode[0].rounds, ...byMode[1].rounds];
  return {
    id: "ost",
    name: "OST",
    played: all.length,
    won: all.filter((round) => round.didGuess).length,
    averageTries: average(
      sixTries.filter((round) => round.didGuess).map((r) => r.currentTry)
    ),
    daily: dailyOf(daily, today),
    spread: spreadOf(daily, MAX_TRIES),
    modes: byMode.map(({ label, rounds }) =>
      modeLine(
        label,
        rounds.map((round) => ({
          won: round.didGuess,
          tries: round.currentTry,
        }))
      )
    ),
    timeAttack: taOf(ta),
    fastest: null,
    averageTime: null,
  };
}

function taOf(stats: TimeAttackStats) {
  return stats.runs === 0
    ? { runs: 0, best: 0, answered: 0 }
    : {
        runs: stats.runs,
        best: Math.max(stats.best.typed, stats.best.choice),
        answered: stats.answered,
      };
}

const NAMED_LABELS: Record<VoiceRoundMode | PictureRoundMode, string> = {
  daily: "Daily",
  endless: "Classic",
  nohint: "No hints",
  silhouette: "Silhouette",
  "silhouette-nohint": "Silhouette, no hints",
  choice: "4-Choice",
  "choice-silhouette": "4-Choice silhouette",
};

/** Voice's or a picture kind's rounds, by way to play. */
function namedGame(
  id: ProfileGameId,
  name: string,
  byMode: Array<{
    mode: VoiceRoundMode | PictureRoundMode;
    rounds: NamedRound[];
  }>,
  ta: TimeAttackStats,
  today: number
): ProfileGame {
  const finished = byMode.map(({ mode, rounds }) => ({
    mode,
    rounds: rounds.filter(isVoiceOver),
  }));
  const all = finished.flatMap(({ rounds }) => rounds);
  const daily = (byMode.find(({ mode }) => mode === "daily")?.rounds ?? []).map(
    voiceAsRound
  );
  const withTries = finished
    .filter(({ mode }) => !mode.startsWith("choice"))
    .flatMap(({ rounds }) => rounds)
    .filter(isVoiceWon);
  return {
    id,
    name,
    played: all.length,
    won: all.filter(isVoiceWon).length,
    averageTries: average(withTries.map((round) => round.guesses.length)),
    daily: dailyOf(daily, today),
    spread: spreadOf(daily, 4),
    modes: finished.map(({ mode, rounds }) =>
      modeLine(
        NAMED_LABELS[mode],
        rounds.map((round) => ({
          won: isVoiceWon(round),
          tries: round.guesses.length,
        }))
      )
    ),
    timeAttack: taOf(ta),
    fastest: null,
    averageTime: null,
  };
}

/** Guesses a find took, in bands: the student game has no limit. */
const GUESS_BANDS: Array<[string, number, number]> = [
  ["1-3", 1, 3],
  ["4-6", 4, 6],
  ["7-9", 7, 9],
  ["10-14", 10, 14],
  ["15+", 15, Infinity],
];

function studentGame(
  game: StudentGame,
  server: Server,
  today: number
): ProfileGame {
  const daily = loadStudentRounds(`${game}-daily`, server);
  const endless = loadStudentRounds(`${game}-endless`, server);
  const over = (rounds: StudentRound[]) => rounds.filter(isStudentOver);
  const all = [...over(daily), ...over(endless)];
  const wins = all.filter(isStudentWon);
  const times = wins.flatMap(({ time }) =>
    typeof time === "number" && time > 0 ? [time] : []
  );
  const dailyOver = over(daily);
  const played = (rounds: StudentRound[]) =>
    rounds.map((round) => ({
      won: isStudentWon(round),
      tries: round.guesses.length,
    }));
  return {
    id: game,
    name: game === "gameplay" ? "Students · Gameplay" : "Students · Lore",
    played: all.length,
    won: wins.length,
    averageTries: average(wins.map((round) => round.guesses.length)),
    daily: dailyOf(daily.map(studentAsRound), today),
    spread: [
      ...GUESS_BANDS.map(([label, low, high]) => ({
        label,
        count: dailyOver.filter(
          (round) =>
            isStudentWon(round) &&
            round.guesses.length >= low &&
            round.guesses.length <= high
        ).length,
      })),
      {
        label: "✗",
        count: dailyOver.filter((round) => !isStudentWon(round)).length,
        lost: true,
      },
    ],
    modes: [
      modeLine("Daily", played(over(daily))),
      modeLine("Endless", played(over(endless))),
    ],
    timeAttack: null,
    fastest: times.length ? Math.min(...times) : null,
    averageTime: average(times),
  };
}

/**
 * The player's whole record for their profile, read from the saves of the
 * server the student games follow: the Sensei card's totals, and each
 * game's rounds, wins, streaks, tries, daily spread and ways to play.
 */
export function profileStats(
  today: number = dayNumber(),
  server: Server = getServer()
): ProfileStats {
  const voice = namedGame(
    "voice",
    "Voice",
    VOICE_ROUND_MODES.map((mode) => ({
      mode,
      rounds: loadVoiceRounds(mode, server),
    })),
    voiceTimeAttackStats(loadVoiceRounds("timeattack", server)),
    today
  );
  const pictures = PICTURE_KINDS.map((kind: PictureKind) =>
    namedGame(
      kind,
      kind === "halo" ? "Halo" : "Weapon",
      PICTURE_ROUND_MODES.map((mode) => ({
        mode,
        rounds: loadPictureRounds(`${kind}-${mode}`, server),
      })),
      pictureTimeAttackStats(loadPictureRounds(`${kind}-timeattack`, server)),
      today
    )
  );
  const games = [
    ostGame(today),
    voice,
    ...pictures,
    studentGame("gameplay", server, today),
    studentGame("lore", server, today),
  ];

  // A daily's best run is its streak of days, which a day missed breaks
  // as a loss does.
  for (const game of games) {
    const daily = game.modes.find(({ label }) => label === "Daily");
    if (daily) daily.bestRun = game.daily.best;
  }

  const days = new Set<number>();
  const dailies = [
    loadRounds("daily"),
    loadVoiceRounds("daily", server).map(voiceAsRound),
    ...PICTURE_KINDS.map((kind) =>
      loadPictureRounds(`${kind}-daily`, server).map(voiceAsRound)
    ),
    loadStudentRounds("gameplay-daily", server).map(studentAsRound),
    loadStudentRounds("lore-daily", server).map(studentAsRound),
  ];
  for (const round of dailies.flat()) {
    if (isFinished(round) && typeof round.day === "number") days.add(round.day);
  }

  return {
    ...senseiStats(today, server),
    bestWinStreak: Math.max(
      bestWinStreak(loadRounds("endless")),
      ...games.flatMap((game) => game.modes.map((mode) => mode.bestRun))
    ),
    games,
    room: loadRoomRecord(),
    daysPlayed: days.size,
    dailiesWon: games.reduce((sum, game) => sum + game.daily.won, 0),
  };
}
