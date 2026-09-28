import React from "react";

import { dayNumber } from "../helpers/daily";
import { dailyOutcomes } from "../helpers/dailyCalendar";
import {
  clearVoiceRounds,
  loadVoiceRounds,
  saveVoiceRounds,
} from "../helpers/storage";
import { calStreaks } from "../helpers/streaks";
import { studentById } from "../helpers/studentRounds";
import {
  asRound,
  dailyVoice,
  isOver,
  isWon,
  knownVoiceRounds,
  makeVoiceChoices,
  pickVoice,
  triesOf,
  VOICE_TRIES,
  voiceRecordText,
  voiceTally,
} from "../helpers/voiceRounds";
import {
  bestWinStreak,
  calDayStreak,
  calWinStreak,
} from "../helpers/winStreak";
import { SKIPPED, VoiceRound, VoiceRoundMode } from "../types/voice";

type Histories = Record<VoiceRoundMode, VoiceRound[]>;

/** A new round from the mode's bag, with four answers in 4-Choice. */
function dealRound(mode: VoiceRoundMode, played: VoiceRound[]): VoiceRound {
  const { answer, line } = pickVoice(played);
  const student = studentById.get(answer);
  return {
    answer,
    line,
    guesses: [],
    ...(mode === "choice" && student
      ? { choices: makeVoiceChoices(student) }
      : {}),
  };
}

/**
 * Appends today's puzzle unless the history already ends with it, dropping
 * any from a day after today (a clock set back), like the OST's withToday.
 */
function withToday(saved: VoiceRound[]): VoiceRound[] {
  const day = dayNumber();
  const stored = saved.filter(
    (round) => typeof round.day === "number" && round.day <= day
  );
  const last = stored[stored.length - 1];
  if (last && last.day === day) return stored;
  return [...stored, { ...dailyVoice(day), guesses: [], day }];
}

/** A bag mode's history ready to play: the round left open, or a new one. */
function resumeOrDeal(
  mode: VoiceRoundMode,
  stored: VoiceRound[]
): VoiceRound[] {
  const last = stored[stored.length - 1];
  if (last && !isOver(last)) return stored;
  return [...stored, dealRound(mode, stored)];
}

function initialHistories(): Histories {
  const load = (mode: VoiceRoundMode) =>
    knownVoiceRounds(loadVoiceRounds(mode));
  return {
    daily: withToday(load("daily")),
    endless: resumeOrDeal("endless", load("endless")),
    nohint: resumeOrDeal("nohint", load("nohint")),
    choice: resumeOrDeal("choice", load("choice")),
  };
}

/**
 * Owns Voice mode's rounds: every mode's history at once, so switching is
 * instant, each mirrored to its own localStorage key, as useStudentGame
 * does. Time attack is useVoiceTimeAttack's.
 */
export function useVoiceGame(mode: VoiceRoundMode) {
  const [histories, setHistories] = React.useState<Histories>(initialHistories);

  const { daily, endless, nohint, choice } = histories;

  React.useEffect(() => saveVoiceRounds("daily", daily), [daily]);
  React.useEffect(() => saveVoiceRounds("endless", endless), [endless]);
  React.useEffect(() => saveVoiceRounds("nohint", nohint), [nohint]);
  React.useEffect(() => saveVoiceRounds("choice", choice), [choice]);

  const rounds = histories[mode];
  const round = rounds[rounds.length - 1];

  const updateCurrent = React.useCallback(
    (patch: (round: VoiceRound) => VoiceRound) => {
      setHistories((previous) => {
        const next = [...previous[mode]];
        next[next.length - 1] = patch(next[next.length - 1]);
        return { ...previous, [mode]: next };
      });
    },
    [mode]
  );

  /** Guesses a student, or skips the try with SKIPPED. */
  const guess = React.useCallback(
    (id: number) => {
      updateCurrent((current) => {
        if (isOver(current)) return current;
        if (id === SKIPPED ? triesOf(current) === 1 : !studentById.has(id)) {
          return current;
        }
        if (id !== SKIPPED && current.guesses.includes(id)) return current;
        return { ...current, guesses: [...current.guesses, id] };
      });
    },
    [updateCurrent]
  );

  const skip = React.useCallback(() => guess(SKIPPED), [guess]);

  const next = React.useCallback(() => {
    // One line a day in daily; there is no next.
    if (mode === "daily") return;
    setHistories((previous) => ({
      ...previous,
      [mode]: [...previous[mode], dealRound(mode, previous[mode])],
    }));
  }, [mode]);

  /**
   * Deals a different line in place of one that won't play. Not the
   * player's fault, so it counts for nothing. Daily is the same line for
   * everyone, so it can't be swapped.
   */
  const replaceCurrent = React.useCallback(() => {
    if (mode === "daily") return;
    setHistories((previous) => {
      const list = previous[mode];
      return {
        ...previous,
        [mode]: [...list.slice(0, -1), dealRound(mode, list)],
      };
    });
  }, [mode]);

  const reset = React.useCallback(() => {
    clearVoiceRounds(mode);
    setHistories((previous) => ({
      ...previous,
      [mode]: mode === "daily" ? withToday([]) : [dealRound(mode, [])],
    }));
  }, [mode]);

  /** Rolls the daily puzzle over when the date changes under an open tab. */
  const refreshDay = React.useCallback(() => {
    setHistories((previous) => {
      const today = withToday(previous.daily);
      return today === previous.daily
        ? previous
        : { ...previous, daily: today };
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

  const tries = mode === "choice" ? 1 : VOICE_TRIES;
  const tally = React.useMemo(() => voiceTally(rounds, tries), [rounds, tries]);

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

  const played = tally.reduce((sum, count) => sum + count, 0);

  // Different students named at least once, for the stats.
  const found = React.useMemo(
    () => new Set(rounds.filter(isWon).map(({ answer }) => answer)).size,
    [rounds]
  );

  // The player's history with this voice, across every mode.
  const record = React.useMemo(
    () =>
      voiceRecordText(
        [...daily, ...endless, ...nohint, ...choice],
        round.answer
      ),
    [daily, endless, nohint, choice, round.answer]
  );

  return {
    mode,
    round,
    rounds,
    record,
    tally,
    played,
    wins: played - tally[0],
    found,
    streak,
    best,
    dailyResults,
    hasHistory: played > 0,
    guess,
    skip,
    next,
    replaceCurrent,
    reset,
    refreshDay,
  };
}

export type VoiceGameState = ReturnType<typeof useVoiceGame>;
