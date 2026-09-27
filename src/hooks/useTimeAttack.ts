import React from "react";

import { loadAudio } from "../helpers/audioSource";
import { getClipUrl } from "../helpers/audioUrl";
import { guessedThemes } from "../helpers/badges";
import { clearRounds, loadRounds, saveRounds } from "../helpers/storage";
import {
  answerRound,
  Clock,
  dealRound,
  loadSettings,
  runClock,
  saveSettings,
  timeAttackStats,
  timeLeft,
  TimeAttackSettings,
} from "../helpers/timeAttack";
import { Round } from "../types/stats";
import { Song } from "../types/song";

/** A run being played, or just over. Held in memory only; see useTimeAttack. */
export interface Run {
  id: number;
  settings: TimeAttackSettings;
  /** The songs answered so far, in order. */
  rounds: Round[];
  /** The song playing now. */
  current: Round;
  /** The song after it, loading while this one plays. */
  next: Round;
  clock: Clock;
  over: boolean;
}

/** How often the clock is checked for the end of the run. */
const TICK_MS = 200;

/** Ends the run, stopping its clock where it is. */
function ended(run: Run, now: number): Run {
  return { ...run, clock: runClock(run.clock, false, now), over: true };
}

/**
 * Time attack: as many songs as possible in three minutes, one try each.
 *
 * Each song is saved as soon as it is answered, tagged with its run, so the
 * saved rounds are the runs' scores. The run itself - its clock, and the song
 * playing - is kept in memory only: a reload ends it with what was answered,
 * rather than resuming it with time that could be won back by reloading.
 */
export function useTimeAttack() {
  // Songs from earlier runs. The run being played adds its own on top.
  // A song left unanswered by a reload never counts.
  const [earlier, setEarlier] = React.useState<Round[]>(() =>
    loadRounds("timeattack").filter((round) => round.currentTry > 0)
  );
  const [settings, setSettingsState] =
    React.useState<TimeAttackSettings>(loadSettings);
  const [run, setRun] = React.useState<Run | null>(null);

  // Only a new answer changes it, not the clock, so it isn't saved again on
  // every tick.
  const answered = run?.rounds;
  const history = React.useMemo(
    () => (answered ? [...earlier, ...answered] : earlier),
    [earlier, answered]
  );

  React.useEffect(() => {
    saveRounds(history, "timeattack");
  }, [history]);

  // The next song downloads while this one plays, so it's ready when its turn
  // comes. The first two start together.
  const current = run?.current;
  const next = run?.next;
  React.useEffect(() => {
    for (const round of [current, next]) {
      if (round) {
        loadAudio(getClipUrl(round.solution.themeNo)).catch(() => undefined);
      }
    }
  }, [current, next]);

  const setSettings = React.useCallback((picked: TimeAttackSettings) => {
    setSettingsState(picked);
    saveSettings(picked);
  }, []);

  /**
   * Starts a run with the settings picked. Its clock waits for the first song
   * to load. Songs aren't repeated until every one has come up in a run.
   */
  const start = React.useCallback(() => {
    const id = Date.now();
    const current = dealRound(settings, id, history);
    const next = dealRound(settings, id, [...history, current]);

    setEarlier(history);
    setRun({
      id,
      settings,
      rounds: [],
      current,
      next,
      clock: { spent: 0, since: null },
      over: false,
    });
  }, [settings, history]);

  /**
   * Answers `round`, the song playing, or passes on it with null, and moves
   * on. Naming the round means a double tap can't answer the next song too.
   */
  const answer = React.useCallback((round: Round, song: Song | null) => {
    setRun((was) => {
      if (!was || was.over || was.current !== round) return was;

      const rounds = [...was.rounds, answerRound(round, song)];
      const next = dealRound(was.settings, was.id, [...rounds, was.next]);
      return { ...was, rounds, current: was.next, next };
    });
  }, []);

  /**
   * Swaps `round` for another song when it won't play. Not the player's
   * fault, so it counts for nothing either way.
   */
  const replaceCurrent = React.useCallback((round: Round) => {
    setRun((was) => {
      if (!was || was.over || was.current !== round) return was;

      const next = dealRound(was.settings, was.id, [
        ...was.rounds,
        was.current,
        was.next,
      ]);
      return { ...was, current: was.next, next };
    });
  }, []);

  /** Runs the clock, or stops it while a song loads. */
  const setClockRunning = React.useCallback((running: boolean) => {
    setRun((was) => {
      if (!was || was.over) return was;
      const clock = runClock(was.clock, running, Date.now());
      return clock === was.clock ? was : { ...was, clock };
    });
  }, []);

  /** Ends the run now: the player left it for another mode. */
  const finish = React.useCallback(() => {
    setRun((was) => (!was || was.over ? was : ended(was, Date.now())));
  }, []);

  /** Back to the start screen, to change the settings. */
  const leave = React.useCallback(() => {
    setEarlier(history);
    setRun(null);
  }, [history]);

  // Watches the clock for the end of the run while it is running.
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
    clearRounds("timeattack");
    setEarlier([]);
    setRun(null);
  }, []);

  const stats = React.useMemo(() => timeAttackStats(history), [history]);
  const guessed = React.useMemo(() => guessedThemes(history), [history]);

  // The run's score moves the background, and starts again with each run.
  const score = run ? run.rounds.filter((round) => round.didGuess).length : 0;

  return {
    history,
    settings,
    setSettings,
    run,
    score,
    stats,
    guessed,
    start,
    answer,
    replaceCurrent,
    setClockRunning,
    finish,
    leave,
    resetHistory,
  };
}

export type TimeAttack = ReturnType<typeof useTimeAttack>;
