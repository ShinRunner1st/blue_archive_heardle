import React from "react";
import { IoGrid } from "react-icons/io5";

import {
  guessTimeAttackPictureName,
  makeGuessTimeAttackPicture,
} from "../../helpers/picture/guessPicture";
import { KIND_NAMES, picturePool } from "../../helpers/pictureRounds";
import {
  pictureRunsOf,
  pictureTimeAttackShareText,
  shapeLabel,
} from "../../helpers/pictureTimeAttack";
import { studentById } from "../../helpers/studentRounds";
import {
  answersLabel,
  formatClock,
  TIME_ATTACK_MS,
  timeLeft,
} from "../../helpers/timeAttack";
import { isWon } from "../../helpers/voiceRounds";
import { placeFor } from "../../helpers/winStreak";
import { useBackdropSrc } from "../../hooks/useBackdropSrc";
import {
  PictureRun,
  PictureTimeAttack as PictureTimeAttackState,
} from "../../hooks/usePictureTimeAttack";
import { useSharePicture } from "../../hooks/useSharePicture";
import logo from "../../image/BlueArchive-Heardle.png";
import { PictureKind, PictureRound } from "../../types/picture";
import { Student } from "../../types/student";
import { SKIPPED } from "../../types/voice";

import { Button } from "../Button";
import { StudentListPopUp } from "../StudentGame/StudentListPopUp";
import { StudentSearch } from "../StudentGame/StudentSearch";
import { Chip } from "../SongListPopUp/index.styled";
import { StudentIcon } from "../StudentIcon";
import * as TA from "../TimeAttack/index.styled";
import { VoiceChoices } from "../VoiceGame/VoiceParts";

import { GuessPicture } from "./GuessPicture";
import { ownersOf } from "./PictureResult";
import { KindRow } from "./PictureParts";

import * as Styled from "./index.styled";

interface Props {
  timeAttack: PictureTimeAttackState;
  onKindChange: (kind: PictureKind) => void;
  keyboardEnabled: boolean;
}

/** The last stretch of the run, when the clock turns red. */
const LOW_MS = 15_000;
const DRAW_MS = 250;

/**
 * Picture time attack: the start screen, the run, then how it went, as
 * Voice mode's. The settings are how to answer, and pictures or their
 * silhouettes.
 */
export function PictureTimeAttack({
  timeAttack,
  onKindChange,
  keyboardEnabled,
}: Props) {
  const { run, kind } = timeAttack;
  if (!run) {
    return (
      <Styled.Wrapper>
        <KindRow kind={kind} onKindChange={onKindChange} />
        <Start timeAttack={timeAttack} keyboardEnabled={keyboardEnabled} />
      </Styled.Wrapper>
    );
  }
  if (run.over) {
    return (
      <Styled.Wrapper>
        <KindRow kind={kind} onKindChange={onKindChange} />
        <Over run={run} timeAttack={timeAttack} />
      </Styled.Wrapper>
    );
  }
  return (
    <Styled.Wrapper>
      <Playing
        run={run}
        timeAttack={timeAttack}
        keyboardEnabled={keyboardEnabled}
      />
    </Styled.Wrapper>
  );
}

function Start({
  timeAttack,
  keyboardEnabled,
}: {
  timeAttack: PictureTimeAttackState;
  keyboardEnabled: boolean;
}) {
  const { kind, settings, setSettings, stats, start } = timeAttack;
  const noun = KIND_NAMES[kind].toLowerCase();

  React.useEffect(() => {
    if (!keyboardEnabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Enter" || e.shiftKey || e.repeat) return;
      if (e.target instanceof HTMLButtonElement) return;
      e.preventDefault();
      start();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [keyboardEnabled, start]);

  return (
    <>
      <TA.Title>{KIND_NAMES[kind]} Time Attack ⏱</TA.Title>
      <TA.Lead>
        Name as many students as you can by their {noun} in{" "}
        {formatClock(TIME_ATTACK_MS)}. One try each, and a miss or a pass costs
        two seconds.
      </TA.Lead>

      <TA.Card aria-label="Run settings">
        <TA.Setting>
          <TA.SettingText>
            <TA.SettingName>Answers</TA.SettingName>
            <TA.SettingHint>Type the name, or pick from four</TA.SettingHint>
          </TA.SettingText>
          <TA.Options role="group" aria-label="Answers">
            {(["typed", "choice"] as const).map((answers) => (
              <Chip
                key={answers}
                type="button"
                $active={settings.answers === answers}
                aria-pressed={settings.answers === answers}
                onClick={() => setSettings({ ...settings, answers })}
              >
                {answersLabel(answers)}
              </Chip>
            ))}
          </TA.Options>
        </TA.Setting>
        <TA.Setting>
          <TA.SettingText>
            <TA.SettingName>Shows</TA.SettingName>
            <TA.SettingHint>
              The {noun} as it is, or only its shape
            </TA.SettingHint>
          </TA.SettingText>
          <TA.Options role="group" aria-label="Shows">
            {[false, true].map((shape) => (
              <Chip
                key={String(shape)}
                type="button"
                $active={settings.shape === shape}
                aria-pressed={settings.shape === shape}
                onClick={() => setSettings({ ...settings, shape })}
              >
                {shapeLabel(shape)}
              </Chip>
            ))}
          </TA.Options>
        </TA.Setting>
      </TA.Card>

      {stats.runs > 0 && (
        <TA.Note>
          Best: Typed {stats.best.typed} · 4-Choice {stats.best.choice}
        </TA.Note>
      )}
      <TA.Note>Your runs are kept in Stats.</TA.Note>

      <TA.Buttons>
        <Button stroke variant="green" onClick={start}>
          Start
        </Button>
      </TA.Buttons>
    </>
  );
}

function useNow(running: boolean): number {
  const [now, setNow] = React.useState(() => Date.now());

  React.useEffect(() => {
    setNow(Date.now());
    if (!running) return;
    const timer = window.setInterval(() => setNow(Date.now()), DRAW_MS);
    return () => window.clearInterval(timer);
  }, [running]);

  return now;
}

/** How the last answer went, with a place reached on the way. */
function feedbackFor(
  kind: PictureKind,
  rounds: PictureRound[]
): {
  text: string;
  right: boolean | null;
} {
  const last = rounds[rounds.length - 1];
  if (!last) return { text: "", right: null };

  const name = ownersOf(kind, last.answer);
  if (!isWon(last)) {
    return {
      text:
        last.guesses[0] === SKIPPED ? `Passed: ${name}` : `✗ It was ${name}`,
      right: false,
    };
  }

  const score = rounds.filter(isWon).length;
  const place = placeFor(score);
  const reached = place && place.wins === score ? ` · 📍 ${place.name}!` : "";
  return { text: `✓ ${name}${reached}`, right: true };
}

function Playing({
  run,
  timeAttack,
  keyboardEnabled,
}: {
  run: PictureRun;
  timeAttack: PictureTimeAttackState;
  keyboardEnabled: boolean;
}) {
  const { answer, setClockRunning, finish, score } = timeAttack;
  const { current, reveal, kind } = run;

  const running = run.clock.since !== null;
  const left = timeLeft(run.clock, useNow(running));
  const low = left <= LOW_MS;
  const waiting = reveal !== null;

  // The clock starts once the sheet has loaded, which it does once.
  const ready = React.useCallback(
    () => setClockRunning(true),
    [setClockRunning]
  );

  const pass = React.useCallback(() => {
    if (!waiting) answer(current, null);
  }, [answer, current, waiting]);
  const pick = React.useCallback(
    (id: number) => answer(current, id),
    [answer, current]
  );

  // The student picked in the box or the grid, answered on Enter or Answer.
  // Each picture starts with nothing picked.
  const [selected, setSelected] = React.useState<Student>();
  const [listOpen, setListOpen] = React.useState(false);
  const count = run.rounds.length;
  React.useEffect(() => setSelected(undefined), [count]);
  const pickFromList = React.useCallback((id: number) => {
    setListOpen(false);
    setSelected(studentById.get(id));
  }, []);

  // Shift+Enter passes; Enter in the search box answers with the top name.
  React.useEffect(() => {
    if (!keyboardEnabled || current.choices || waiting || listOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Enter" || !e.shiftKey || e.repeat) return;
      e.preventDefault();
      pass();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [keyboardEnabled, current.choices, waiting, listOpen, pass]);

  const feedback = feedbackFor(kind, run.rounds);
  const none = React.useMemo(() => new Set<number>(), []);
  const pool = picturePool(kind);

  return (
    <>
      <TA.Status>
        <TA.Clock
          $low={low}
          $paused={!running}
          role="timer"
          aria-label={`${formatClock(left)} left`}
        >
          {formatClock(left)}
        </TA.Clock>
        <TA.TimeTrack aria-hidden="true">
          <TA.TimeFill
            $low={low}
            style={{ width: `${(left / TIME_ATTACK_MS) * 100}%` }}
          />
        </TA.TimeTrack>
        <TA.Score aria-label={`${score} right`}>✓ {score}</TA.Score>
        <TA.Quit type="button" onClick={finish}>
          Quit
        </TA.Quit>
      </TA.Status>

      <TA.Feedback $right={feedback.right} aria-live="polite">
        {feedback.text}
      </TA.Feedback>

      <Styled.Stage>
        <GuessPicture
          kind={kind}
          id={current.answer}
          shape={current.shape === true}
          onReady={ready}
        />
      </Styled.Stage>
      <Styled.Tip>
        {current.choices ? (
          <>
            <kbd>1</kbd>–<kbd>4</kbd> pick an answer
          </>
        ) : (
          <>
            <kbd>Enter</kbd> pick, then answer · <kbd>Shift</kbd>+
            <kbd>Enter</kbd> pass
          </>
        )}
      </Styled.Tip>

      {current.choices ? (
        <VoiceChoices
          key={`${run.rounds.length}`}
          choices={current.choices}
          onPick={pick}
          keyboardEnabled={keyboardEnabled}
          answer={reveal ? current.answer : undefined}
          picked={reveal?.guesses[0]}
        />
      ) : (
        <>
          <Styled.SearchRow>
            <StudentSearch
              // A clear box for each picture.
              key={run.rounds.length}
              pool={pool}
              guessed={none}
              onGuess={pick}
              selected={selected}
              onSelect={setSelected}
              direction="up"
              keyboardEnabled={keyboardEnabled && !waiting && !listOpen}
            />
            <Styled.BrowseButton
              type="button"
              onClick={() => setListOpen(true)}
              disabled={waiting}
              aria-label="Browse all students"
              title="All students"
            >
              <IoGrid size={20} aria-hidden="true" />
            </Styled.BrowseButton>
          </Styled.SearchRow>
          <TA.PlayButtons>
            <Button stroke onClick={pass} disabled={waiting}>
              Pass
            </Button>
            <Button
              stroke
              variant="green"
              onClick={() => selected && pick(selected.id)}
              disabled={waiting || !selected}
            >
              Answer
            </Button>
          </TA.PlayButtons>
          {listOpen && (
            <StudentListPopUp
              pool={pool}
              guessed={none}
              onPick={pickFromList}
              onClose={() => setListOpen(false)}
            />
          )}
        </>
      )}
    </>
  );
}

function Over({
  run,
  timeAttack,
}: {
  run: PictureRun;
  timeAttack: PictureTimeAttackState;
}) {
  const { start, leave, history, score } = timeAttack;
  const { kind } = run;
  const [copied, setCopied] = React.useState("Share result");

  const bestBefore = Math.max(
    0,
    ...pictureRunsOf(history)
      .filter(
        (other) =>
          other.id !== run.id &&
          other.answers === run.settings.answers &&
          other.shapes === run.settings.shape
      )
      .map((other) => other.score)
  );
  const isBest = score > bestBefore;
  const place = placeFor(score);

  const shareText = pictureTimeAttackShareText(kind, run.rounds, run.settings);
  const copyResult = React.useCallback(() => {
    navigator.clipboard
      .writeText(shareText)
      .then(() => setCopied("Copied to your clipboard"))
      .catch(() => setCopied("Copy failed"));
  }, [shareText]);

  React.useEffect(() => {
    if (copied === "Share result") return;
    const timer = window.setTimeout(() => setCopied("Share result"), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);

  // On the backdrop the run reached, like the page behind it.
  const backdrop = useBackdropSrc(score);
  const best = Math.max(score, bestBefore);
  const makePicture = React.useCallback(
    () =>
      makeGuessTimeAttackPicture(
        { kind, rounds: run.rounds, settings: run.settings, best },
        { backdrop, logo }
      ),
    [kind, run, best, backdrop]
  );
  const picture = useSharePicture(
    "Share picture",
    makePicture,
    guessTimeAttackPictureName(kind),
    shareText
  );

  return (
    <>
      <TA.Title>Time&apos;s up, Sensei! ⏱</TA.Title>
      <TA.Lead>
        {score} right out of {run.rounds.length} ·{" "}
        {answersLabel(run.settings.answers)} · {shapeLabel(run.settings.shape)}
      </TA.Lead>
      {isBest && (
        <TA.Note>
          🏆 New best for {answersLabel(run.settings.answers)},{" "}
          {shapeLabel(run.settings.shape).toLowerCase()}!
        </TA.Note>
      )}
      {place && <TA.Note>📍 This run reached {place.name}.</TA.Note>}

      {run.rounds.length > 0 && (
        <TA.Songs aria-label={`${KIND_NAMES[kind]}s this run`}>
          {run.rounds.map((round, index) => {
            const student = studentById.get(round.answer);
            return (
              <Styled.RunRow key={index}>
                <TA.Mark
                  $right={isWon(round)}
                  aria-label={isWon(round) ? "Right" : "Missed"}
                >
                  {isWon(round) ? "✓" : "✗"}
                </TA.Mark>
                <StudentIcon id={round.answer} size={28} />
                <TA.SongName>{ownersOf(kind, round.answer)}</TA.SongName>
                <TA.SongArtist>{student?.school}</TA.SongArtist>
              </Styled.RunRow>
            );
          })}
        </TA.Songs>
      )}

      <TA.Buttons>
        <Button stroke variant="blue" onClick={copyResult}>
          {copied}
        </Button>
        <Button stroke variant="pink" onClick={picture.share}>
          {picture.text}
        </Button>
        <Button stroke variant="orange" onClick={leave}>
          Settings
        </Button>
        <Button stroke variant="green" onClick={start}>
          Play again
        </Button>
      </TA.Buttons>
    </>
  );
}
