import React from "react";
import { IoGrid } from "react-icons/io5";

import { getVoiceUrl } from "../../helpers/audioUrl";
import {
  makeVoiceTimeAttackPicture,
  voiceTimeAttackPictureName,
} from "../../helpers/picture/voicePicture";
import { studentById } from "../../helpers/studentRounds";
import {
  answersLabel,
  formatClock,
  TIME_ATTACK_MS,
  timeLeft,
} from "../../helpers/timeAttack";
import { isWon, voicePool } from "../../helpers/voiceRounds";
import {
  linesLabel,
  voiceRunsOf,
  voiceTimeAttackShareText,
} from "../../helpers/voiceTimeAttack";
import { placeFor } from "../../helpers/winStreak";
import {
  VoiceRun,
  VoiceTimeAttack as VoiceTimeAttackState,
} from "../../hooks/useVoiceTimeAttack";
import { Student } from "../../types/student";
import { SKIPPED, VoiceRound } from "../../types/voice";
import { useBackdropSrc } from "../../hooks/useBackdropSrc";
import { useSharePicture } from "../../hooks/useSharePicture";
import logo from "../../image/BlueArchive-Heardle.png";

import { Button } from "../Button";
import { PlayerStatus } from "../Player";
import { StudentListPopUp } from "../StudentGame/StudentListPopUp";
import { StudentSearch } from "../StudentGame/StudentSearch";
import { Chip } from "../SongListPopUp/index.styled";
import { StudentIcon } from "../StudentIcon";
import * as TA from "../TimeAttack/index.styled";

import { VoiceChoices } from "./VoiceParts";
import { VoicePlayer } from "./VoicePlayer";

import * as Styled from "./index.styled";

interface Props {
  timeAttack: VoiceTimeAttackState;
  keyboardEnabled: boolean;
}

/** The last stretch of the run, when the clock turns red. */
const LOW_MS = 15_000;
const DRAW_MS = 250;

/**
 * Voice time attack: the start screen, the run, then how it went, as the
 * OST's. A line plays whole each time, so the settings are how to answer
 * and which lines.
 */
export function VoiceTimeAttack({ timeAttack, keyboardEnabled }: Props) {
  const { run } = timeAttack;
  if (!run) {
    return <Start timeAttack={timeAttack} keyboardEnabled={keyboardEnabled} />;
  }
  if (run.over) return <Over run={run} timeAttack={timeAttack} />;
  return (
    <Playing
      run={run}
      timeAttack={timeAttack}
      keyboardEnabled={keyboardEnabled}
    />
  );
}

function Start({ timeAttack, keyboardEnabled }: Props) {
  const { settings, setSettings, stats, start } = timeAttack;

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
      <TA.Title>Voice Time Attack ⏱</TA.Title>
      <TA.Lead>
        Name as many students as you can by their voice in{" "}
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
            <TA.SettingName>Lines</TA.SettingName>
            <TA.SettingHint>Any line, or only “Blue Archive!”</TA.SettingHint>
          </TA.SettingText>
          <TA.Options role="group" aria-label="Lines">
            {(["all", "titles"] as const).map((lines) => (
              <Chip
                key={lines}
                type="button"
                $active={settings.lines === lines}
                aria-pressed={settings.lines === lines}
                onClick={() => setSettings({ ...settings, lines })}
              >
                {linesLabel(lines)}
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
function feedbackFor(rounds: VoiceRound[]): {
  text: string;
  right: boolean | null;
} {
  const last = rounds[rounds.length - 1];
  if (!last) return { text: "", right: null };

  const name = studentById.get(last.answer)?.name ?? "";
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
}: Props & { run: VoiceRun }) {
  const { answer, replaceCurrent, setClockRunning, finish, score } = timeAttack;
  const { current, reveal } = run;

  const running = run.clock.since !== null;
  const left = timeLeft(run.clock, useNow(running));
  const low = left <= LOW_MS;
  const waiting = reveal !== null;

  const handleStatus = React.useCallback(
    (status: PlayerStatus) => setClockRunning(status === "ready"),
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
  // Each line starts with nothing picked.
  const [selected, setSelected] = React.useState<Student>();
  const [listOpen, setListOpen] = React.useState(false);
  const lineNumber = run.rounds.length;
  React.useEffect(() => setSelected(undefined), [lineNumber]);
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

  const feedback = feedbackFor(run.rounds);
  const none = React.useMemo(() => new Set<number>(), []);

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

      <VoicePlayer
        url={getVoiceUrl(current.answer, current.line)}
        keyboardEnabled={keyboardEnabled}
        onSkipTrack={() => replaceCurrent(current)}
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
              <kbd>Space</kbd> replay · <kbd>Enter</kbd> pick, then answer ·{" "}
              <kbd>Shift</kbd>+<kbd>Enter</kbd> pass
            </>
          )
        }
      />

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
              // A clear box for each line.
              key={run.rounds.length}
              pool={voicePool()}
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
              pool={voicePool()}
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
  run: VoiceRun;
  timeAttack: VoiceTimeAttackState;
}) {
  const { start, leave, history, score } = timeAttack;
  const [copied, setCopied] = React.useState("Share result");

  const bestBefore = Math.max(
    0,
    ...voiceRunsOf(history)
      .filter(
        (other) =>
          other.id !== run.id &&
          other.answers === run.settings.answers &&
          other.titles === (run.settings.lines === "titles")
      )
      .map((other) => other.score)
  );
  const isBest = score > bestBefore;
  const place = placeFor(score);

  const shareText = voiceTimeAttackShareText(run.rounds, run.settings);
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
      makeVoiceTimeAttackPicture(
        { rounds: run.rounds, settings: run.settings, best },
        { backdrop, logo }
      ),
    [run, best, backdrop]
  );
  const picture = useSharePicture(
    "Share picture",
    makePicture,
    voiceTimeAttackPictureName(),
    shareText
  );

  return (
    <>
      <TA.Title>Time&apos;s up, Sensei! ⏱</TA.Title>
      <TA.Lead>
        {score} right out of {run.rounds.length} ·{" "}
        {answersLabel(run.settings.answers)} · {linesLabel(run.settings.lines)}
      </TA.Lead>
      {isBest && (
        <TA.Note>
          🏆 New best for {answersLabel(run.settings.answers)},{" "}
          {linesLabel(run.settings.lines).toLowerCase()}!
        </TA.Note>
      )}
      {place && <TA.Note>📍 This run reached {place.name}.</TA.Note>}

      {run.rounds.length > 0 && (
        <TA.Songs aria-label="Voices this run">
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
                <TA.SongName>{student?.name}</TA.SongName>
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
