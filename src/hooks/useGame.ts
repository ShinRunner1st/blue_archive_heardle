import React from "react";

import { calRecentCorrect, calStats, isFinished } from "../helpers";
import { badgeNews, badgeProgress, guessedThemes } from "../helpers/badges";
import { dailyOutcomes } from "../helpers/dailyCalendar";
import { songRecord, songRecordText } from "../helpers/songRecord";
import { calStreaks } from "../helpers/streaks";
import {
  bestWinStreak,
  calDayStreak,
  calWinStreak,
} from "../helpers/winStreak";
import { RecapStats } from "../helpers/picture/recapPicture";
import { songs } from "../constants";
import { CHOICE_CLIP_SECONDS } from "../constants/game";
import { makeChoices } from "../helpers/choices";
import { dailySong, dayNumber } from "../helpers/daily";
import { isBagEmpty, pickSong } from "../helpers/pickSong";
import {
  clearRounds,
  emptyGuesses,
  loadRounds,
  saveRounds,
} from "../helpers/storage";
import { BADGE_MODES, ROUND_MODES, RoundMode } from "../types/mode";
import { Round } from "../types/stats";
import { Song } from "../types/song";

type Histories = Record<RoundMode, Round[]>;

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

/**
 * The next round for a mode that deals from a bag: endless, or four-choice
 * with its four answers drawn up now and saved with it.
 */
function createRound(mode: RoundMode, playedRounds: Round[]): Round {
  const solution = pickSong(playedRounds);
  if (mode !== "choice") return newRound(solution);

  return {
    ...newRound(solution),
    tries: 1,
    choices: makeChoices(solution),
    clip: CHOICE_CLIP_SECONDS,
  };
}

/**
 * A bag mode's saved rounds, ready to play: a round left unfinished is
 * resumed, otherwise a new one is dealt. A four-choice round that lost its
 * choices to a damaged save can't be played, so it is dealt again.
 */
function resumeOrDeal(mode: RoundMode, stored: Round[]): Round[] {
  const last = stored[stored.length - 1];
  if (!last || isFinished(last)) {
    return [...stored, createRound(mode, stored)];
  }
  if (mode === "choice" && !last.choices) {
    const earlier = stored.slice(0, -1);
    return [...earlier, createRound(mode, earlier)];
  }
  return stored;
}

/**
 * Appends today's puzzle unless the stored history already ends with it.
 * Rounds from a day after today are dropped: they can only come from before
 * daily mode restarted its numbering at baheardle.com, or a clock set back.
 */
function withToday(saved: Round[]): Round[] {
  const day = dayNumber();
  const stored = saved.filter(
    (round) => round.day === undefined || round.day <= day
  );
  const last = stored[stored.length - 1];

  if (last && last.day === day) return stored;
  return [...stored, newRound(dailySong(day), day)];
}

function initialHistories(): Histories {
  return {
    endless: resumeOrDeal("endless", loadRounds("endless")),
    choice: resumeOrDeal("choice", loadRounds("choice")),
    // Today's puzzle is resumed even when it is already over: daily mode shows
    // the result again rather than dealing a second song.
    daily: withToday(loadRounds("daily")),
  };
}

/** Every mode's rounds in one list, or only the modes given. */
function allRounds(
  histories: Histories,
  modes: RoundMode[] = ROUND_MODES
): Round[] {
  return modes.flatMap((mode) => histories[mode]);
}

/**
 * Owns all game state. Every mode is kept in memory at once so switching
 * between them is instant and none loses its place; each is mirrored to its
 * own localStorage key by its own effect, so persistence can't drift out of
 * sync with what is on screen.
 */
export function useGame(mode: RoundMode) {
  const [histories, setHistories] = React.useState<Histories>(initialHistories);

  React.useEffect(() => {
    saveRounds(histories.endless, "endless");
  }, [histories.endless]);

  React.useEffect(() => {
    saveRounds(histories.daily, "daily");
  }, [histories.daily]);

  React.useEffect(() => {
    saveRounds(histories.choice, "choice");
  }, [histories.choice]);

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
    if (mode === "daily") return;

    setHistories((previous) => ({
      ...previous,
      [mode]: [...previous[mode], createRound(mode, previous[mode])],
    }));
  }, [mode]);

  /**
   * Throws away the round in progress and deals a different song. Used when the
   * song turns out to be unplayable, which is not the player's fault, so the
   * round is replaced rather than counted as a loss.
   */
  const replaceCurrentSong = React.useCallback(() => {
    if (mode === "daily") return;

    setHistories((previous) => {
      const next = [...previous[mode]];
      // The current round is excluded from its own bag, so the song it was
      // holding stays eligible - the unplayable list is what keeps it out.
      next[next.length - 1] = createRound(mode, next.slice(0, -1));
      return { ...previous, [mode]: next };
    });
  }, [mode]);

  const resetScore = React.useCallback(() => {
    clearRounds(mode);

    setHistories((previous) => ({
      ...previous,
      [mode]: mode === "daily" ? withToday([]) : [createRound(mode, [])],
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
    () => mode !== "daily" && isBagEmpty(rounds),
    [mode, rounds]
  );

  const streaks = React.useMemo(
    () => calStreaks(histories.daily, dayNumber()),
    [histories.daily]
  );

  // How each daily puzzle went, for the calendar in stats.
  const dailyResults = React.useMemo(
    () => dailyOutcomes(histories.daily),
    [histories.daily]
  );

  // Each mode's own run, which moves its background (see
  // constants/streakPlaces): wins in a row in a bag mode, and the daily day
  // streak.
  const winStreak = React.useMemo(() => calWinStreak(rounds), [rounds]);
  const dayStreak = React.useMemo(
    () => calDayStreak(histories.daily, dayNumber()),
    [histories.daily]
  );

  const current = rounds[rounds.length - 1];

  // Songs guessed right in any mode, which stand out in the Jukebox.
  const guessedEver = React.useMemo(
    () => guessedThemes(allRounds(histories)),
    [histories]
  );

  // The OST badges count songs named in daily and endless. Picking from four
  // is much easier, so four-choice earns none.
  const badgeGuesses = React.useMemo(
    () => guessedThemes(allRounds(histories, BADGE_MODES)),
    [histories]
  );
  const badges = React.useMemo(
    () => badgeProgress(badgeGuesses),
    [badgeGuesses]
  );
  const earnsBadges = BADGE_MODES.includes(mode);

  // The mode's record, for the recap picture in stats.
  const recap = React.useMemo<RecapStats>(() => {
    return {
      mode,
      tally: stats,
      current: mode === "daily" ? streaks.current : winStreak.current,
      best: mode === "daily" ? streaks.max : bestWinStreak(rounds),
      songsGuessed: songs.filter((song) => badgeGuesses.has(song.themeNo))
        .length,
      songsTotal: songs.length,
      badgesEarned: badges.filter((badge) => badge.done).length,
      badgesTotal: badges.length,
    };
  }, [mode, stats, streaks, winStreak, rounds, badgeGuesses, badges]);

  // What the round just won did for them: judged against every other round.
  const badgeLines = React.useMemo(() => {
    if (!current.didGuess || !earnsBadges) return [];
    const others = allRounds(histories, BADGE_MODES).filter(
      (round) => round !== current
    );
    return badgeNews(current.solution.themeNo, guessedThemes(others));
  }, [histories, current, earnsBadges]);

  // The player's history with this song, shown once the round is over. It
  // counts tries, so it is kept to the modes with six of them.
  const record = React.useMemo(() => {
    if (!isFinished(current) || !earnsBadges) return "";
    return songRecordText(
      songRecord(allRounds(histories, BADGE_MODES), current.solution.themeNo)
    );
  }, [histories, current, earnsBadges]);

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
    dailyResults,
    winStreak,
    dayStreak,
    badges,
    guessedEver,
    recap,
    badgeLines,
    record,
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
