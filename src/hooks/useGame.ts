import React from "react";

import { calRecentCorrect, calStats, isFinished } from "../helpers";
import { calStreaks } from "../helpers/streaks";
import { calDayStreak, calWinStreak } from "../helpers/winStreak";
import { dailySong, dayNumber } from "../helpers/daily";
import { isBagEmpty, pickSong } from "../helpers/pickSong";
import {
  clearRounds,
  emptyGuesses,
  loadRounds,
  saveRounds,
} from "../helpers/storage";
import { GameMode } from "../types/mode";
import { Round } from "../types/stats";
import { Song } from "../types/song";

type Histories = Record<GameMode, Round[]>;

function newRound(solution: Song, day?: number): Round {
  return {
    solution,
    currentTry: 0,
    didGuess: false,
    guesses: emptyGuesses(),
    startTime: null,
    ...(day === undefined ? {} : { day }),
  };
}

function createEndlessRound(playedRounds: Round[]): Round {
  return newRound(pickSong(playedRounds));
}

/** Appends today's puzzle unless the stored history already ends with it. */
function withToday(stored: Round[]): Round[] {
  const day = dayNumber();
  const last = stored[stored.length - 1];

  if (last && last.day === day) return stored;
  return [...stored, newRound(dailySong(day), day)];
}

function initialHistories(): Histories {
  const stored = loadRounds("endless");
  const last = stored[stored.length - 1];

  return {
    // Resume a round that was left unfinished, otherwise open a new one.
    endless:
      last && !isFinished(last)
        ? stored
        : [...stored, createEndlessRound(stored)],
    // Today's puzzle is resumed even when it is already over: daily mode shows
    // the result again rather than dealing a second song.
    daily: withToday(loadRounds("daily")),
  };
}

/**
 * Owns all game state. Both modes are kept in memory at once so switching
 * between them is instant and neither loses its place; each is mirrored to its
 * own localStorage key by its own effect, so persistence can't drift out of
 * sync with what is on screen.
 */
export function useGame(mode: GameMode) {
  const [histories, setHistories] = React.useState<Histories>(initialHistories);

  React.useEffect(() => {
    saveRounds(histories.endless, "endless");
  }, [histories.endless]);

  React.useEffect(() => {
    saveRounds(histories.daily, "daily");
  }, [histories.daily]);

  const rounds = histories[mode];

  const updateCurrent = React.useCallback(
    (patch: (round: Round) => Round) => {
      setHistories((previous) => {
        const next = [...previous[mode]];
        next[next.length - 1] = patch(next[next.length - 1]);
        return { ...previous, [mode]: next };
      });
    },
    [mode]
  );

  const guess = React.useCallback(
    (song: Song) => {
      updateCurrent((round) => {
        if (isFinished(round)) return round;

        const isCorrect = song.themeNo === round.solution.themeNo;
        const guesses = [...round.guesses];
        guesses[round.currentTry] = { song, skipped: false, isCorrect };

        return {
          ...round,
          guesses,
          currentTry: round.currentTry + 1,
          didGuess: isCorrect,
        };
      });
    },
    [updateCurrent]
  );

  const skip = React.useCallback(() => {
    updateCurrent((round) => {
      if (isFinished(round)) return round;

      const guesses = [...round.guesses];
      guesses[round.currentTry] = {
        song: undefined,
        skipped: true,
        isCorrect: undefined,
      };

      return { ...round, guesses, currentTry: round.currentTry + 1 };
    });
  }, [updateCurrent]);

  const setStartTime = React.useCallback(
    (startTime: number) => {
      updateCurrent((round) =>
        round.startTime === startTime ? round : { ...round, startTime }
      );
    },
    [updateCurrent]
  );

  const nextSong = React.useCallback(() => {
    // Daily mode deals one song a day; there is no "next" to move to.
    if (mode !== "endless") return;

    setHistories((previous) => ({
      ...previous,
      endless: [...previous.endless, createEndlessRound(previous.endless)],
    }));
  }, [mode]);

  /**
   * Throws away the round in progress and deals a different song. Used when the
   * song turns out to be unplayable, which is not the player's fault, so the
   * round is replaced rather than counted as a loss.
   */
  const replaceCurrentSong = React.useCallback(() => {
    if (mode !== "endless") return;

    setHistories((previous) => {
      const next = [...previous.endless];
      // The current round is excluded from its own bag, so the song it was
      // holding stays eligible - the unplayable list is what keeps it out.
      next[next.length - 1] = createEndlessRound(next.slice(0, -1));
      return { ...previous, endless: next };
    });
  }, [mode]);

  const resetScore = React.useCallback(() => {
    clearRounds(mode);

    setHistories((previous) => ({
      ...previous,
      [mode]: mode === "daily" ? withToday([]) : [createEndlessRound([])],
    }));
  }, [mode]);

  /** Rolls the daily puzzle over when the date changes under an open tab. */
  const refreshDay = React.useCallback(() => {
    setHistories((previous) => {
      const daily = withToday(previous.daily);
      return daily === previous.daily ? previous : { ...previous, daily };
    });
  }, []);

  React.useEffect(() => {
    if (mode !== "daily") return;

    refreshDay();

    // A tab left open past midnight is otherwise still showing yesterday.
    const onFocus = () => refreshDay();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);

    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [mode, refreshDay]);

  const stats = React.useMemo(() => calStats(rounds), [rounds]);
  const score = React.useMemo(() => calRecentCorrect(rounds), [rounds]);

  const bagEmpty = React.useMemo(
    () => mode === "endless" && isBagEmpty(rounds),
    [mode, rounds]
  );

  const streaks = React.useMemo(
    () => calStreaks(histories.daily, dayNumber()),
    [histories.daily]
  );

  // Each mode's own run, which moves its background (see
  // constants/streakPlaces): endless wins in a row, and the daily day streak.
  const winStreak = React.useMemo(
    () => calWinStreak(histories.endless),
    [histories.endless]
  );
  const dayStreak = React.useMemo(
    () => calDayStreak(histories.daily, dayNumber()),
    [histories.daily]
  );

  const current = rounds[rounds.length - 1];

  return {
    solution: current.solution,
    guesses: current.guesses,
    currentTry: current.currentTry,
    didGuess: current.didGuess,
    startTime: current.startTime,
    round: current,
    day: current.day,
    stats,
    score,
    streaks,
    winStreak,
    dayStreak,
    bagEmpty,
    hasHistory: stats[7] > 0,
    guess,
    skip,
    setStartTime,
    nextSong,
    replaceCurrentSong,
    resetScore,
    refreshDay,
  };
}
