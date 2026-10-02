import React from "react";

import { useServer } from "./useServer";

import { dayNumber } from "../helpers/daily";
import { dailyOutcomes } from "../helpers/dailyCalendar";
import {
  clearStudentRounds,
  loadStudentRounds,
  saveStudentRounds,
} from "../helpers/storage";
import { giveUpStudent, guessStudent } from "../helpers/roundRules";
import { calStreaks } from "../helpers/streaks";
import {
  asRound,
  averageTime,
  dailyAnswer,
  fastestTime,
  isOver,
  isWon,
  knownRounds,
  pickAnswer,
  studentTally,
} from "../helpers/studentRounds";
import {
  bestWinStreak,
  calDayStreak,
  calWinStreak,
} from "../helpers/winStreak";
import {
  slotOf,
  StudentGame,
  StudentMode,
  StudentRound,
  StudentSlot,
} from "../types/student";
import { stamped } from "../helpers/roundId";

type Histories = Record<StudentSlot, StudentRound[]>;

/** Which way to play a slot is, from its name. */
const gameOf = (slot: StudentSlot) => slot.split("-")[0] as StudentGame;

/**
 * The round with its clock stopped: the time since it started. A round
 * that somehow ends before starting (a guess from outside the search) is
 * left untimed rather than timed at zero.
 */
function stopClock(round: StudentRound, now: number): StudentRound {
  return typeof round.startedAt === "number"
    ? { ...round, time: Math.max(now - round.startedAt, 0) }
    : round;
}

function dealRound(game: StudentGame, played: StudentRound[]): StudentRound {
  return stamped({ answer: pickAnswer(game, played), guesses: [] });
}

/**
 * Appends today's puzzle unless the history already ends with it, dropping
 * any from a day after today (a clock set back), like the OST's withToday.
 */
function withToday(game: StudentGame, saved: StudentRound[]): StudentRound[] {
  const day = dayNumber();
  const stored = saved.filter(
    (round) => typeof round.day === "number" && round.day <= day
  );
  const last = stored[stored.length - 1];
  if (last && last.day === day) return stored;
  return [
    ...stored,
    stamped({ answer: dailyAnswer(game, day), guesses: [], day }),
  ];
}

/** An endless history ready to play: the round left open, or a new one. */
function resumeOrDeal(
  game: StudentGame,
  stored: StudentRound[]
): StudentRound[] {
  const last = stored[stored.length - 1];
  if (last && !isOver(last)) return stored;
  return [...stored, dealRound(game, stored)];
}

function initialHistories(): Histories {
  const load = (slot: StudentSlot) =>
    knownRounds(gameOf(slot), loadStudentRounds(slot));
  return {
    "gameplay-daily": withToday("gameplay", load("gameplay-daily")),
    "gameplay-endless": resumeOrDeal("gameplay", load("gameplay-endless")),
    "lore-daily": withToday("lore", load("lore-daily")),
    "lore-endless": resumeOrDeal("lore", load("lore-endless")),
  };
}

/**
 * Owns the student game's state: all four histories (each way to play,
 * daily and endless) at once, so switching is instant, each mirrored to its
 * own localStorage key by its own effect, as useGame does for the OST.
 */
export function useStudentGame(game: StudentGame, mode: StudentMode) {
  const [histories, setHistories] = React.useState<Histories>(initialHistories);

  // Another server's saves: loaded while rendering, so no frame shows this
  // server's pools with the other's rounds, and nothing else on the page
  // starts over.
  const server = useServer();
  const [loadedFor, setLoadedFor] = React.useState(server);
  if (loadedFor !== server) {
    setLoadedFor(server);
    setHistories(initialHistories());
  }

  const gameplayDaily = histories["gameplay-daily"];
  const gameplayEndless = histories["gameplay-endless"];
  const loreDaily = histories["lore-daily"];
  const loreEndless = histories["lore-endless"];

  React.useEffect(() => {
    saveStudentRounds("gameplay-daily", gameplayDaily);
  }, [gameplayDaily]);

  React.useEffect(() => {
    saveStudentRounds("gameplay-endless", gameplayEndless);
  }, [gameplayEndless]);

  React.useEffect(() => {
    saveStudentRounds("lore-daily", loreDaily);
  }, [loreDaily]);

  React.useEffect(() => {
    saveStudentRounds("lore-endless", loreEndless);
  }, [loreEndless]);

  const slot = slotOf(game, mode);
  const rounds = histories[slot];
  const round = rounds[rounds.length - 1];

  const updateCurrent = React.useCallback(
    (patch: (round: StudentRound) => StudentRound) => {
      setHistories((previous) => {
        const next = [...previous[slot]];
        next[next.length - 1] = patch(next[next.length - 1]);
        return { ...previous, [slot]: next };
      });
    },
    [slot]
  );

  /**
   * Guesses a student. The first guess sent starts the round's clock, so
   * time spent choosing where to begin, or a puzzle left open, costs nothing.
   */
  const guess = React.useCallback(
    (id: number) => {
      const now = Date.now();
      updateCurrent((current) => {
        const next = guessStudent(current, id);
        if (next === current) return current;
        // A find on the first guess never started the clock: it stays
        // untimed, rather than a 0:00 no search could beat.
        if (isWon(next)) return stopClock(next, now);
        return { ...next, startedAt: current.startedAt ?? now };
      });
    },
    [updateCurrent]
  );

  const giveUp = React.useCallback(() => {
    const now = Date.now();
    updateCurrent((current) => {
      const next = giveUpStudent(current);
      return next === current ? current : stopClock(next, now);
    });
  }, [updateCurrent]);

  const next = React.useCallback(() => {
    // One student a day in daily; there is no next.
    if (mode === "daily") return;
    setHistories((previous) => ({
      ...previous,
      [slot]: [...previous[slot], dealRound(game, previous[slot])],
    }));
  }, [game, mode, slot]);

  const reset = React.useCallback(() => {
    clearStudentRounds(slot);
    setHistories((previous) => ({
      ...previous,
      [slot]: mode === "daily" ? withToday(game, []) : [dealRound(game, [])],
    }));
  }, [game, mode, slot]);

  /** Rolls the daily puzzles over when the date changes under an open tab. */
  const refreshDay = React.useCallback(() => {
    setHistories((previous) => {
      const gameplay = withToday("gameplay", previous["gameplay-daily"]);
      const lore = withToday("lore", previous["lore-daily"]);
      return gameplay === previous["gameplay-daily"] &&
        lore === previous["lore-daily"]
        ? previous
        : { ...previous, "gameplay-daily": gameplay, "lore-daily": lore };
    });
  }, []);

  React.useEffect(() => {
    if (mode !== "daily") return;

    refreshDay();
    const onFocus = () => refreshDay();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [mode, refreshDay]);

  // The OST's streak and calendar helpers, fed the same rounds in its shape.
  const asRounds = React.useMemo(() => rounds.map(asRound), [rounds]);

  const tally = React.useMemo(() => studentTally(rounds), [rounds]);

  const streak = React.useMemo(
    () =>
      mode === "daily"
        ? calDayStreak(asRounds, dayNumber())
        : calWinStreak(asRounds),
    [mode, asRounds]
  );

  const best = React.useMemo(
    () =>
      mode === "daily"
        ? calStreaks(asRounds, dayNumber()).max
        : bestWinStreak(asRounds),
    [mode, asRounds]
  );

  const dailyResults = React.useMemo(
    () => (mode === "daily" ? dailyOutcomes(asRounds) : new Map()),
    [mode, asRounds]
  );

  /** Guesses per win, to one decimal place, or 0 before the first win. */
  const averageGuesses = React.useMemo(() => {
    const wins = rounds.filter(isWon);
    if (wins.length === 0) return 0;
    const total = wins.reduce((sum, won) => sum + won.guesses.length, 0);
    return Math.round((total / wins.length) * 10) / 10;
  }, [rounds]);

  const fastest = React.useMemo(() => fastestTime(rounds), [rounds]);
  const averageFind = React.useMemo(() => averageTime(rounds), [rounds]);

  const played = tally.reduce((sum, count) => sum + count, 0);

  // Different students found at least once, for the recap.
  const found = React.useMemo(
    () => new Set(rounds.filter(isWon).map(({ answer }) => answer)).size,
    [rounds]
  );

  return {
    slot,
    round,
    rounds,
    tally,
    played,
    wins: played - tally[0],
    averageGuesses,
    fastest,
    averageFind,
    found,
    streak,
    best,
    dailyResults,
    hasHistory: played > 0,
    guess,
    giveUp,
    next,
    reset,
    refreshDay,
  };
}
