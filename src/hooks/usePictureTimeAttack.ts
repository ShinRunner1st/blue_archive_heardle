import React from "react";

import { PICTURE_SHEETS, SHAPE_SHEETS } from "../constants/guessSheets";
import { loadIconSheet } from "../helpers/iconSheet";
import { asGuess, knownPictureRounds } from "../helpers/pictureRounds";
import {
  answerPictureRound,
  dealPictureRound,
  loadPictureSettings,
  pictureTimeAttackStats,
  PictureTimeAttackSettings,
  savePictureSettings,
} from "../helpers/pictureTimeAttack";
import {
  clearPictureRounds,
  loadPictureRounds,
  savePictureRounds,
} from "../helpers/storage";
import { Clock, runClock, timeLeft } from "../helpers/timeAttack";
import { isWon } from "../helpers/voiceRounds";
import { PICTURE_KINDS, PictureKind, PictureRound } from "../types/picture";
import { RIGHT_PAUSE_MS, WRONG_PAUSE_MS } from "./useTimeAttack";

/** A run being played, or just over, as Voice mode's (see useVoiceTimeAttack). */
export interface PictureRun {
  id: number;
  kind: PictureKind;
  settings: PictureTimeAttackSettings;
  /** The pictures answered so far, in order. */
  rounds: PictureRound[];
  /** The picture showing now. */
  current: PictureRound;
  clock: Clock;
  over: boolean;
  /** The picture just answered, shown with its answer before the next. */
  reveal: PictureRound | null;
}

/** How often the clock is checked for the end of the run. */
const TICK_MS = 200;

function ended(run: PictureRun, now: number): PictureRun {
  return { ...run, clock: runClock(run.clock, false, now), over: true };
}

type Histories = Record<PictureKind, PictureRound[]>;

function loadHistories(): Histories {
  return Object.fromEntries(
    PICTURE_KINDS.map((kind) => [
      kind,
      knownPictureRounds(kind, loadPictureRounds(`${kind}-timeattack`)).filter(
        (round) => round.guesses.length > 0
      ),
    ])
  ) as Histories;
}

/**
 * Picture time attack: as many halos or weapons as possible in three
 * minutes, one pick each. It works as Voice mode's does: each picture is
 * saved as it is answered, tagged with its run, and the run itself is kept
 * in memory only, so a reload ends it rather than winning time back. A
 * sheet holds every picture, so once it has loaded nothing more loads: the
 * clock waits for it only at the start.
 */
export function usePictureTimeAttack(kind: PictureKind) {
  const [earlier, setEarlier] = React.useState<Histories>(loadHistories);
  const [settings, setSettingsState] =
    React.useState<PictureTimeAttackSettings>(loadPictureSettings);
  const [run, setRun] = React.useState<PictureRun | null>(null);

  // The run's kind's history, with the run's answers.
  const answered = run?.rounds;
  const runKind = run?.kind;
  const histories = React.useMemo(
    () =>
      answered && runKind
        ? { ...earlier, [runKind]: [...earlier[runKind], ...answered] }
        : earlier,
    [earlier, answered, runKind]
  );
  const history = histories[kind];

  const saved = React.useRef(histories);
  React.useEffect(() => {
    for (const each of PICTURE_KINDS) {
      if (histories[each] !== saved.current[each]) {
        savePictureRounds(`${each}-timeattack`, histories[each]);
      }
    }
    saved.current = histories;
  }, [histories]);

  const setSettings = React.useCallback((picked: PictureTimeAttackSettings) => {
    setSettingsState(picked);
    savePictureSettings(picked);
  }, []);

  const start = React.useCallback(() => {
    const id = Date.now();
    const sheet = (settings.shape ? SHAPE_SHEETS : PICTURE_SHEETS)[kind];
    loadIconSheet(sheet.key).catch(() => undefined);

    setEarlier(histories);
    setRun({
      id,
      kind,
      settings,
      rounds: [],
      current: dealPictureRound(kind, settings, id, history),
      clock: { spent: 0, since: null },
      over: false,
      reveal: null,
    });
  }, [kind, settings, histories, history]);

  /** Answers `round`, the picture showing, or passes on it with null. */
  const answer = React.useCallback((round: PictureRound, id: number | null) => {
    setRun((was) => {
      if (!was || was.over || was.reveal || was.current !== round) {
        return was;
      }
      const answered = answerPictureRound(
        round,
        id === null ? null : asGuess(was.kind, round, id)
      );
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
      const current = dealPictureRound(was.kind, was.settings, was.id, [
        ...(earlier[was.kind] ?? []),
        ...was.rounds,
      ]);
      return {
        ...was,
        current,
        reveal: null,
        // Stopped for a right answer: it runs again with the next picture.
        clock: runClock(was.clock, true, Date.now()),
      };
    });
  }, [earlier]);

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

  /** Runs the clock, or stops it while the sheet loads. */
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
    setEarlier(histories);
    setRun(null);
  }, [histories]);

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
    clearPictureRounds(`${kind}-timeattack`);
    setEarlier((was) => ({ ...was, [kind]: [] }));
    setRun(null);
  }, [kind]);

  const stats = React.useMemo(() => pictureTimeAttackStats(history), [history]);

  // The run's score moves the background, and starts again with each run.
  const score = run ? run.rounds.filter(isWon).length : 0;

  return {
    kind,
    history,
    settings,
    setSettings,
    // A run of the other kind isn't this kind's.
    run: run && run.kind === kind ? run : null,
    score,
    stats,
    start,
    answer,
    setClockRunning,
    finish,
    leave,
    resetHistory,
  };
}

export type PictureTimeAttack = ReturnType<typeof usePictureTimeAttack>;
