import React from "react";

import {
  answersLabel,
  formatClock,
  runsOf,
  TIME_ATTACK_MS,
  timeAttackShareText,
  timeLeft,
  TimeAttackSettings,
} from "../../helpers/timeAttack";
import {
  makeTimeAttackPicture,
  timeAttackPictureName,
} from "../../helpers/picture/timeAttackPicture";
import { placeFor } from "../../helpers/winStreak";
import { useBackdropSrc } from "../../hooks/useBackdropSrc";
import { useSharePicture } from "../../hooks/useSharePicture";
import { Run, TimeAttack as TimeAttackState } from "../../hooks/useTimeAttack";
import logo from "../../image/BlueArchive-Heardle.png";
import { Round } from "../../types/stats";
import { Song } from "../../types/song";

import { Button } from "../Button";
import { Choices } from "../Choices";
import { ClipLength } from "../ClipLength";
import { Player, PlayerStatus } from "../Player";
import { Search } from "../Search";
import { Chip } from "../SongListPopUp/index.styled";
import { Switch } from "../Switch";

import * as Styled from "./index.styled";

interface Props {
  timeAttack: TimeAttackState;
  /** False while a dialog is open, so global shortcuts stay inert. */
  keyboardEnabled: boolean;
}

/** The last stretch of the run, when the clock turns red. */
const LOW_MS = 15_000;
/** How often the clock on screen is redrawn. */
const DRAW_MS = 250;

/**
 * Time attack: the start screen, the run, then how it went. The screen after a
 * run has no Enter to play again: it would catch a key pressed to answer just
 * as the clock ran out.
 */
export function TimeAttack({ timeAttack, keyboardEnabled }: Props) {
  const { run } = timeAttack;

  if (!run) {
    return <Start timeAttack={timeAttack} keyboardEnabled={keyboardEnabled} />;
  }
  if (run.over) {
    return <Over run={run} timeAttack={timeAttack} />;
  }
  return (
    <Playing
      run={run}
      timeAttack={timeAttack}
      keyboardEnabled={keyboardEnabled}
    />
  );
}

function Start({
  timeAttack,
  keyboardEnabled,
}: {
  timeAttack: TimeAttackState;
  keyboardEnabled: boolean;
}) {
  const { settings, setSettings, stats, start } = timeAttack;
  const change = (patch: Partial<TimeAttackSettings>) =>
    setSettings({ ...settings, ...patch });

  // Enter starts the run, so it can be played from the keyboard throughout.
  React.useEffect(() => {
    if (!keyboardEnabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Enter" || e.shiftKey || e.repeat) return;
      // A focused button already answers Enter with a click.
      if (e.target instanceof HTMLButtonElement) return;
      e.preventDefault();
      start();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [keyboardEnabled, start]);

  return (
    <>
      <Styled.Title>Time Attack ⏱</Styled.Title>
      <Styled.Lead>
        Name as many songs as you can in {formatClock(TIME_ATTACK_MS)}. One try
        each, and a miss or a pass costs two seconds.
      </Styled.Lead>

      <Styled.Card aria-label="Run settings">
        <Styled.Setting>
          <Styled.SettingText>
            <Styled.SettingName>Clip length</Styled.SettingName>
            <Styled.SettingHint>How much of each song plays</Styled.SettingHint>
          </Styled.SettingText>
          <ClipLength
            value={settings.clip}
            onChange={(clip) => change({ clip })}
          />
        </Styled.Setting>

        <Styled.Setting>
          <Styled.SettingText>
            <Styled.SettingName>Answers</Styled.SettingName>
            <Styled.SettingHint>
              Type the name, or pick from four
            </Styled.SettingHint>
          </Styled.SettingText>
          <Styled.Options role="group" aria-label="Answers">
            {(["typed", "choice"] as const).map((answers) => (
              <Chip
                key={answers}
                type="button"
                $active={settings.answers === answers}
                aria-pressed={settings.answers === answers}
                onClick={() => change({ answers })}
              >
                {answersLabel(answers)}
              </Chip>
            ))}
          </Styled.Options>
        </Styled.Setting>

        <Styled.Setting>
          <Styled.SettingText>
            <Styled.SettingName>Random start</Styled.SettingName>
            <Styled.SettingHint>
              Start anywhere in the 16-second clip, not at its top
            </Styled.SettingHint>
          </Styled.SettingText>
          <Styled.Toggle
            type="button"
            role="switch"
            aria-checked={settings.randomStart}
            aria-label="Random start"
            onClick={() => change({ randomStart: !settings.randomStart })}
          >
            <Switch $on={settings.randomStart} aria-hidden="true" />
          </Styled.Toggle>
        </Styled.Setting>
      </Styled.Card>

      {stats.runs > 0 && (
        <Styled.Note>
          Best: Typed {stats.best.typed} · 4-Choice {stats.best.choice}
        </Styled.Note>
      )}
      <Styled.Note>
        No OST badges are earned in Time Attack. Your runs are kept in Stats.
      </Styled.Note>

      <Styled.Buttons>
        <Button stroke variant="green" onClick={start}>
          Start
        </Button>
      </Styled.Buttons>
    </>
  );
}

/** Redraws while the clock runs, and gives the time now. */
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
function feedbackFor(rounds: Round[]): { text: string; right: boolean | null } {
  const last = rounds[rounds.length - 1];
  if (!last) return { text: "", right: null };

  const { name } = last.solution;
  if (!last.didGuess) {
    return {
      text: last.guesses[0]?.skipped ? `Passed: ${name}` : `✗ It was ${name}`,
      right: false,
    };
  }

  const score = rounds.filter((round) => round.didGuess).length;
  const place = placeFor(score);
  const reached = place && place.wins === score ? ` · 📍 ${place.name}!` : "";
  return { text: `✓ ${name}${reached}`, right: true };
}

function Playing({
  run,
  timeAttack,
  keyboardEnabled,
}: {
  run: Run;
  timeAttack: TimeAttackState;
  keyboardEnabled: boolean;
}) {
  const { answer, replaceCurrent, setClockRunning, finish, score } = timeAttack;
  const { current, settings, reveal } = run;
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [selectedSong, setSelectedSong] = React.useState<Song>();

  const running = run.clock.since !== null;
  const left = timeLeft(run.clock, useNow(running));
  const low = left <= LOW_MS;
  // While an answer shows, nothing more can be answered.
  const waiting = reveal !== null;

  // The clock only runs while the song is ready to hear.
  const handleStatus = React.useCallback(
    (status: PlayerStatus) => setClockRunning(status === "ready"),
    [setClockRunning]
  );

  const submit = React.useCallback(() => {
    if (!selectedSong || waiting) return;
    answer(current, selectedSong);
    setSelectedSong(undefined);
  }, [answer, current, selectedSong, waiting]);

  const pass = React.useCallback(() => {
    if (!waiting) answer(current, null);
  }, [answer, current, waiting]);
  const pick = React.useCallback(
    (song: Song) => answer(current, song),
    [answer, current]
  );

  // Enter answers with the song picked; Shift+Enter passes. A held key doesn't
  // repeat, or one press could pass every song.
  React.useEffect(() => {
    if (!keyboardEnabled || current.choices || waiting) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Enter" || e.repeat) return;
      if (e.shiftKey) {
        e.preventDefault();
        pass();
      } else if (selectedSong) {
        e.preventDefault();
        submit();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [keyboardEnabled, current.choices, waiting, selectedSong, submit, pass]);

  const feedback = feedbackFor(run.rounds);

  return (
    <>
      <Styled.Status>
        <Styled.Clock
          $low={low}
          $paused={!running}
          role="timer"
          aria-label={`${formatClock(left)} left`}
        >
          {formatClock(left)}
        </Styled.Clock>
        <Styled.TimeTrack aria-hidden="true">
          <Styled.TimeFill
            $low={low}
            style={{ width: `${(left / TIME_ATTACK_MS) * 100}%` }}
          />
        </Styled.TimeTrack>
        <Styled.Score aria-label={`${score} right`}>✓ {score}</Styled.Score>
        <Styled.Quit type="button" onClick={finish}>
          Quit
        </Styled.Quit>
      </Styled.Status>

      <Styled.Feedback $right={feedback.right} aria-live="polite">
        {feedback.text}
      </Styled.Feedback>

      <Player
        themeNo={current.solution.themeNo}
        currentTry={0}
        setStartTime={noop}
        startTime={current.startTime}
        offset={current.startTime ?? 0}
        inputRef={inputRef}
        keyboardEnabled={keyboardEnabled}
        onSkipTrack={() => replaceCurrent(current)}
        lengths={[settings.clip * 1000]}
        autoPlay
        steady
        onStatusChange={handleStatus}
        hint={
          current.choices ? (
            <>
              <kbd>Space</kbd> replay · <kbd>1</kbd>–<kbd>4</kbd> pick an answer
            </>
          ) : (
            <>
              <kbd>Space</kbd> replay · <kbd>Enter</kbd> answer ·{" "}
              <kbd>Shift</kbd>+<kbd>Enter</kbd> pass
            </>
          )
        }
      />

      {current.choices ? (
        <Choices
          // Fresh buttons for each song, so focus doesn't sit on the answer
          // just given.
          key={current.solution.themeNo}
          choices={current.choices}
          onPick={pick}
          keyboardEnabled={keyboardEnabled}
          answer={reveal ? current.solution.themeNo : undefined}
          picked={reveal?.guesses[0]?.song?.themeNo}
        />
      ) : (
        <>
          <Search
            // Clears the box for each new song.
            currentTry={run.rounds.length}
            setSelectedSong={setSelectedSong}
            selectedSong={selectedSong}
            inputRef={inputRef}
            keyboardEnabled={keyboardEnabled && !waiting}
          />
          <Styled.PlayButtons>
            <Button stroke onClick={pass} disabled={waiting}>
              Pass
            </Button>
            <Button
              stroke
              variant="green"
              onClick={submit}
              disabled={!selectedSong || waiting}
            >
              Answer
            </Button>
          </Styled.PlayButtons>
        </>
      )}
    </>
  );
}

function noop() {
  // Time attack sets each song's start when it deals it.
}

function Over({ run, timeAttack }: { run: Run; timeAttack: TimeAttackState }) {
  const { start, leave, history, score, stats } = timeAttack;
  const [copied, setCopied] = React.useState("Share result");

  // Judged against the other runs answered the same way.
  const bestBefore = Math.max(
    0,
    ...runsOf(history)
      .filter(
        (other) => other.id !== run.id && other.answers === run.settings.answers
      )
      .map((other) => other.score)
  );
  const isBest = score > bestBefore;
  const place = placeFor(score);

  const shareText = timeAttackShareText(run.rounds, run.settings);
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
  const best = stats.best[run.settings.answers];
  const makePicture = React.useCallback(
    () =>
      makeTimeAttackPicture(
        { rounds: run.rounds, settings: run.settings, best },
        { backdrop, logo }
      ),
    [run, best, backdrop]
  );
  const picture = useSharePicture(
    "Share picture",
    makePicture,
    timeAttackPictureName(),
    shareText
  );

  return (
    <>
      <Styled.Title>Time&apos;s up, Sensei! ⏱</Styled.Title>
      <Styled.Lead>
        {score} right out of {run.rounds.length} ·{" "}
        {answersLabel(run.settings.answers)} · {run.settings.clip}s clips
        {run.settings.randomStart && " · random start"}
      </Styled.Lead>
      {isBest && (
        <Styled.Note>
          🏆 New best for {answersLabel(run.settings.answers)}!
        </Styled.Note>
      )}
      {place && <Styled.Note>📍 This run reached {place.name}.</Styled.Note>}

      {run.rounds.length > 0 && (
        <Styled.Songs aria-label="Songs this run">
          {run.rounds.map((round, index) => (
            <Styled.SongRow key={index}>
              <Styled.Mark
                $right={round.didGuess}
                aria-label={round.didGuess ? "Right" : "Missed"}
              >
                {round.didGuess ? "✓" : "✗"}
              </Styled.Mark>
              <Styled.SongName>{round.solution.name}</Styled.SongName>
              <Styled.SongArtist>{round.solution.artist}</Styled.SongArtist>
            </Styled.SongRow>
          ))}
        </Styled.Songs>
      )}

      <Styled.Buttons>
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
      </Styled.Buttons>
    </>
  );
}
