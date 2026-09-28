import React from "react";

import { loadAudio } from "../helpers/audioSource";
import { getVoiceUrl } from "../helpers/audioUrl";
import {
  clearVoiceRounds,
  loadVoiceRounds,
  saveVoiceRounds,
} from "../helpers/storage";
import { Clock, runClock, timeLeft } from "../helpers/timeAttack";
import { isWon, knownVoiceRounds } from "../helpers/voiceRounds";
import {
  answerVoiceRound,
  dealVoiceRound,
  loadVoiceSettings,
  saveVoiceSettings,
  voiceTimeAttackStats,
  VoiceTimeAttackSettings,
} from "../helpers/voiceTimeAttack";
import { VoiceRound } from "../types/voice";
import { RIGHT_PAUSE_MS, WRONG_PAUSE_MS } from "./useTimeAttack";

/** A run being played, or just over, as the OST's (see useTimeAttack). */
export interface VoiceRun {
  id: number;
  settings: VoiceTimeAttackSettings;
  /** The lines answered so far, in order. */
  rounds: VoiceRound[];
  /** The line playing now. */
  current: VoiceRound;
  /** The line after it, loading while this one plays. */
  next: VoiceRound;
  clock: Clock;
  over: boolean;
  /** The line just answered, shown with its answer before the next. */
  reveal: VoiceRound | null;
}

/** How often the clock is checked for the end of the run. */
const TICK_MS = 200;

function ended(run: VoiceRun, now: number): VoiceRun {
  return { ...run, clock: runClock(run.clock, false, now), over: true };
}

/**
 * Voice time attack: as many students as possible in three minutes, one
 * pick each. It works as the OST's does: each line is saved as it is
 * answered, tagged with its run, and the run itself is kept in memory only,
 * so a reload ends it rather than winning time back.
 */
export function useVoiceTimeAttack() {
  const [earlier, setEarlier] = React.useState<VoiceRound[]>(() =>
    knownVoiceRounds(loadVoiceRounds("timeattack")).filter(
      (round) => round.guesses.length > 0
    )
  );
  const [settings, setSettingsState] =
    React.useState<VoiceTimeAttackSettings>(loadVoiceSettings);
  const [run, setRun] = React.useState<VoiceRun | null>(null);

  const answered = run?.rounds;
  const history = React.useMemo(
    () => (answered ? [...earlier, ...answered] : earlier),
    [earlier, answered]
  );

  React.useEffect(() => {
    saveVoiceRounds("timeattack", history);
  }, [history]);

  // The next line downloads while this one plays.
  const current = run?.current;
  const next = run?.next;
  React.useEffect(() => {
    for (const round of [current, next]) {
      if (round) {
        loadAudio(getVoiceUrl(round.answer, round.line)).catch(() => undefined);
      }
    }
  }, [current, next]);

  const setSettings = React.useCallback((picked: VoiceTimeAttackSettings) => {
    setSettingsState(picked);
    saveVoiceSettings(picked);
  }, []);

  const start = React.useCallback(() => {
    const id = Date.now();
    const current = dealVoiceRound(settings, id, history);
    const next = dealVoiceRound(settings, id, [...history, current]);

    setEarlier(history);
    setRun({
      id,
      settings,
      rounds: [],
      current,
      next,
      clock: { spent: 0, since: null },
      over: false,
      reveal: null,
    });
  }, [settings, history]);

  /** Answers `round`, the line playing, or passes on it with null. */
  const answer = React.useCallback((round: VoiceRound, id: number | null) => {
    setRun((was) => {
      if (!was || was.over || was.reveal || was.current !== round) return was;

      const answered = answerVoiceRound(round, id);
      return {
        ...was,
        rounds: [...was.rounds, answered],
        reveal: answered,
        clock: isWon(answered)
          ? runClock(was.clock, false, Date.now())
          : was.clock,
      };
    });
  }, []);

  const advance = React.useCallback(() => {
    setRun((was) => {
      if (!was || was.over || !was.reveal) return was;

      const next = dealVoiceRound(was.settings, was.id, [
        ...was.rounds,
        was.next,
      ]);
      return { ...was, current: was.next, next, reveal: null };
    });
  }, []);

  const reveal = run?.reveal;
  const over = run?.over;
  React.useEffect(() => {
    if (!reveal || over) return;

    const timer = window.setTimeout(
      advance,
      isWon(reveal) ? RIGHT_PAUSE_MS : WRONG_PAUSE_MS
    );
    return () => window.clearTimeout(timer);
  }, [reveal, over, advance]);

  /** Swaps `round` for another line when it won't play; it counts for nothing. */
  const replaceCurrent = React.useCallback((round: VoiceRound) => {
    setRun((was) => {
      if (!was || was.over || was.reveal || was.current !== round) {
        return was;
      }

      const next = dealVoiceRound(was.settings, was.id, [
        ...was.rounds,
        was.current,
        was.next,
      ]);
      return { ...was, current: was.next, next };
    });
  }, []);

  /** Runs the clock, or stops it while a line loads. */
  const setClockRunning = React.useCallback((running: boolean) => {
    setRun((was) => {
      if (!was || was.over) return was;
      if (running && was.reveal && isWon(was.reveal)) return was;
      const clock = runClock(was.clock, running, Date.now());
      return clock === was.clock ? was : { ...was, clock };
    });
  }, []);

  /** Ends the run now: the player quit, or left it for another mode. */
  const finish = React.useCallback(() => {
    setRun((was) => (!was || was.over ? was : ended(was, Date.now())));
  }, []);

  /** Back to the start screen, to change the settings. */
  const leave = React.useCallback(() => {
    setEarlier(history);
    setRun(null);
  }, [history]);

  const running = run !== null && !run.over && run.clock.since !== null;
  React.useEffect(() => {
    if (!running) return;

    const timer = window.setInterval(() => {
      setRun((was) => {
        if (!was || was.over) return was;
        const now = Date.now();
        return timeLeft(was.clock, now) > 0 ? was : ended(was, now);
      });
    }, TICK_MS);

    return () => window.clearInterval(timer);
  }, [running]);

  const resetHistory = React.useCallback(() => {
    clearVoiceRounds("timeattack");
    setEarlier([]);
    setRun(null);
  }, []);

  const stats = React.useMemo(() => voiceTimeAttackStats(history), [history]);

  // The run's score moves the background, and starts again with each run.
  const score = run ? run.rounds.filter(isWon).length : 0;

  return {
    history,
    settings,
    setSettings,
    run,
    score,
    stats,
    start,
    answer,
    replaceCurrent,
    setClockRunning,
    finish,
    leave,
    resetHistory,
  };
}

export type VoiceTimeAttack = ReturnType<typeof useVoiceTimeAttack>;
