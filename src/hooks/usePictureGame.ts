import React from "react";

import { dayNumber } from "../helpers/daily";
import { dailyOutcomes } from "../helpers/dailyCalendar";
import {
  asGuess,
  dailyPicture,
  knownPictureRounds,
  makePictureChoices,
  pickPicture,
  pictureAnswers,
  pictureRecordText,
} from "../helpers/pictureRounds";
import {
  clearPictureRounds,
  loadPictureRounds,
  savePictureRounds,
} from "../helpers/storage";
import { calStreaks } from "../helpers/streaks";
import { studentById } from "../helpers/studentRounds";
import {
  asRound,
  isOver,
  isWon,
  triesOf,
  VOICE_TRIES,
  voiceTally,
} from "../helpers/voiceRounds";
import {
  bestWinStreak,
  calDayStreak,
  calWinStreak,
} from "../helpers/winStreak";
import {
  PICTURE_KINDS,
  PICTURE_ROUND_MODES,
  PictureKind,
  PictureRound,
  PictureRoundMode,
} from "../types/picture";
import { SKIPPED } from "../types/voice";

type Slot = `${PictureKind}-${PictureRoundMode}`;
type Histories = Record<Slot, PictureRound[]>;

/** A new round from the mode's bag, with four answers in 4-Choice. */
function dealRound(
  kind: PictureKind,
  mode: PictureRoundMode,
  played: PictureRound[]
): PictureRound {
  const answer = pickPicture(kind, played);
  return {
    answer,
    guesses: [],
    ...(mode === "choice" ? { choices: makePictureChoices(kind, answer) } : {}),
  };
}

/**
 * Appends today's puzzle unless the history already ends with it, dropping
 * any from a day after today (a clock set back), like Voice mode's.
 */
function withToday(kind: PictureKind, saved: PictureRound[]): PictureRound[] {
  const day = dayNumber();
  const stored = saved.filter(
    (round) => typeof round.day === "number" && round.day <= day
  );
  const last = stored[stored.length - 1];
  if (last && last.day === day) return stored;
  return [...stored, { answer: dailyPicture(kind, day), guesses: [], day }];
}

/** A bag mode's history ready to play: the round left open, or a new one. */
function resumeOrDeal(
  kind: PictureKind,
  mode: PictureRoundMode,
  stored: PictureRound[]
): PictureRound[] {
  const last = stored[stored.length - 1];
  if (last && !isOver(last)) return stored;
  return [...stored, dealRound(kind, mode, stored)];
}

function initialHistories(): Histories {
  const entries = PICTURE_KINDS.flatMap((kind) =>
    PICTURE_ROUND_MODES.map((mode): [Slot, PictureRound[]] => {
      const saved = knownPictureRounds(
        kind,
        loadPictureRounds(`${kind}-${mode}`)
      );
      return [
        `${kind}-${mode}`,
        mode === "daily"
          ? withToday(kind, saved)
          : resumeOrDeal(kind, mode, saved),
      ];
    })
  );
  return Object.fromEntries(entries) as Histories;
}

/**
 * Owns the picture game's rounds: every kind and mode's history at once, so
 * switching is instant, each mirrored to its own localStorage key, as
 * useVoiceGame does. Time attack is usePictureTimeAttack's.
 */
export function usePictureGame(kind: PictureKind, mode: PictureRoundMode) {
  const [histories, setHistories] = React.useState<Histories>(initialHistories);
  const slot: Slot = `${kind}-${mode}`;

  // Saves only the slot that changed.
  const saved = React.useRef(histories);
  React.useEffect(() => {
    for (const key of Object.keys(histories) as Slot[]) {
      if (histories[key] !== saved.current[key]) {
        savePictureRounds(key, histories[key]);
      }
    }
    saved.current = histories;
  }, [histories]);

  const rounds = histories[slot];
  const round = rounds[rounds.length - 1];

  const updateCurrent = React.useCallback(
    (patch: (round: PictureRound) => PictureRound) => {
      setHistories((previous) => {
        const next = [...previous[slot]];
        next[next.length - 1] = patch(next[next.length - 1]);
        return { ...previous, [slot]: next };
      });
    },
    [slot]
  );

  /** Guesses a student, or skips the try with SKIPPED. */
  const guess = React.useCallback(
    (picked: number) => {
      updateCurrent((current) => {
        if (isOver(current)) return current;
        if (
          picked === SKIPPED ? triesOf(current) === 1 : !studentById.has(picked)
        ) {
          return current;
        }
        const id = asGuess(kind, current, picked);
        if (id !== SKIPPED && current.guesses.includes(id)) return current;
        return { ...current, guesses: [...current.guesses, id] };
      });
    },
    [kind, updateCurrent]
  );

  const skip = React.useCallback(() => guess(SKIPPED), [guess]);

  const next = React.useCallback(() => {
    // One picture a day in daily; there is no next.
    if (mode === "daily") return;
    setHistories((previous) => ({
      ...previous,
      [slot]: [...previous[slot], dealRound(kind, mode, previous[slot])],
    }));
  }, [kind, mode, slot]);

  const reset = React.useCallback(() => {
    clearPictureRounds(slot);
    setHistories((previous) => ({
      ...previous,
      [slot]:
        mode === "daily" ? withToday(kind, []) : [dealRound(kind, mode, [])],
    }));
  }, [kind, mode, slot]);

  /** Rolls the daily puzzles over when the date changes under an open tab. */
  const refreshDay = React.useCallback(() => {
    setHistories((previous) => {
      let changed = false;
      const next = { ...previous };
      for (const each of PICTURE_KINDS) {
        const today = withToday(each, previous[`${each}-daily`]);
        if (today !== previous[`${each}-daily`]) {
          next[`${each}-daily`] = today;
          changed = true;
        }
      }
      return changed ? next : previous;
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

  // Different pictures named at least once, for the stats.
  const found = React.useMemo(
    () => new Set(rounds.filter(isWon).map(({ answer }) => answer)).size,
    [rounds]
  );

  // The player's history with this picture, across the kind's modes.
  const record = React.useMemo(
    () =>
      pictureRecordText(
        PICTURE_ROUND_MODES.flatMap((each) => histories[`${kind}-${each}`]),
        round.answer
      ),
    [histories, kind, round.answer]
  );

  return {
    kind,
    mode,
    round,
    rounds,
    record,
    tally,
    played,
    wins: played - tally[0],
    found,
    total: pictureAnswers(kind).length,
    streak,
    best,
    dailyResults,
    hasHistory: played > 0,
    guess,
    skip,
    next,
    reset,
    refreshDay,
  };
}

export type PictureGameState = ReturnType<typeof usePictureGame>;
