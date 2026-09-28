import React from "react";
import { IoDice, IoGrid, IoStopwatch } from "react-icons/io5";

import {
  formatSolveTime,
  isOver,
  poolOf,
  studentById,
} from "../../helpers/studentRounds";
import { WinStreak } from "../../helpers/winStreak";
import {
  Student,
  StudentGame as Way,
  StudentMode,
  StudentRound,
} from "../../types/student";

import { Button } from "../Button";

import { ClueTable } from "./ClueTable";
import { StudentListPopUp } from "./StudentListPopUp";
import { StudentResult } from "./StudentResult";
import { StudentSearch } from "./StudentSearch";

import * as Styled from "./index.styled";

interface Props {
  game: Way;
  mode: StudentMode;
  round: StudentRound;
  /** Found out of played, for endless. */
  score: string;
  streak: WinStreak;
  /** Starts the round's clock, when the player starts looking. */
  onStart: () => void;
  onGuess: (id: number) => void;
  onGiveUp: () => void;
  onNext: () => void;
  onNewDay: () => void;
  /** False while a dialog is open, so the page's keys stay inert. */
  keyboardEnabled: boolean;
}

/** How long "Give up" waits for the second press that means it. */
const CONFIRM_MS = 3000;

/**
 * The round's clock, read once a second while it runs: the time since the
 * round started, including any time spent away, as it's the wall clock.
 */
function SolveClock({ startedAt }: { startedAt: number }) {
  const [now, setNow] = React.useState(Date.now);
  React.useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  return (
    <Styled.Clock>
      <IoStopwatch aria-hidden="true" />
      <span role="timer" aria-label="Time so far">
        {formatSolveTime(now - startedAt)}
      </span>
    </Styled.Clock>
  );
}

/**
 * The student game: guess a student, and each guess shows how its school,
 * role, birthday and the rest compare with the answer's. No limit on
 * guesses; giving up counts as a loss.
 */
export function StudentGame({
  game,
  mode,
  round,
  score,
  streak,
  onStart,
  onGuess,
  onGiveUp,
  onNext,
  onNewDay,
  keyboardEnabled,
}: Props) {
  const answer = studentById.get(round.answer);
  const guessed = React.useMemo(() => new Set(round.guesses), [round.guesses]);
  const over = isOver(round);

  // The guess made on this screen, whose cells turn over one by one. Rounds
  // resumed on load or a mode switch appear at once.
  const [fresh, setFresh] = React.useState<number>();
  const guess = React.useCallback(
    (id: number) => {
      setFresh(id);
      onGuess(id);
    },
    [onGuess]
  );

  // The student picked in the box, the grid or at random, guessed on Enter
  // or Guess, as a song is in the OST.
  const [selected, setSelected] = React.useState<Student>();
  const confirm = React.useCallback(
    (id: number) => {
      setSelected(undefined);
      guess(id);
    },
    [guess]
  );
  const [listOpen, setListOpen] = React.useState(false);
  const pickFromList = React.useCallback((id: number) => {
    setListOpen(false);
    setSelected(studentById.get(id));
  }, []);

  // A first guess for a player with no idea where to start. Never the
  // answer: a find by the dice would be no find at all.
  const pickRandom = React.useCallback(() => {
    const others = poolOf(game).filter(
      (student) => student.id !== round.answer && !guessed.has(student.id)
    );
    if (others.length === 0) return;
    onStart();
    setSelected(others[Math.floor(Math.random() * others.length)]);
  }, [game, round.answer, guessed, onStart]);

  // A misclick shouldn't end a hunt: the first press asks, the second gives up.
  const [confirming, setConfirming] = React.useState(false);
  React.useEffect(() => {
    if (!confirming) return;
    const timer = window.setTimeout(() => setConfirming(false), CONFIRM_MS);
    return () => window.clearTimeout(timer);
  }, [confirming]);

  const giveUp = React.useCallback(() => {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setConfirming(false);
    onGiveUp();
  }, [confirming, onGiveUp]);

  if (!answer) return null;

  return (
    <Styled.Wrapper>
      {over ? (
        <StudentResult
          game={game}
          mode={mode}
          round={round}
          answer={answer}
          score={score}
          streak={streak}
          onNext={onNext}
          onNewDay={onNewDay}
          keyboardEnabled={keyboardEnabled}
        />
      ) : (
        <>
          <Styled.SearchRow>
            <StudentSearch
              pool={poolOf(game)}
              guessed={guessed}
              onGuess={confirm}
              selected={selected}
              onSelect={setSelected}
              guessButton
              onType={onStart}
              // The list has the keys while it's open.
              keyboardEnabled={keyboardEnabled && !listOpen}
            />
            <Styled.BrowseButton
              type="button"
              onClick={() => {
                onStart();
                setListOpen(true);
              }}
              aria-label="Browse all students"
              title="All students"
            >
              <IoGrid size={20} aria-hidden="true" />
            </Styled.BrowseButton>
            {/* Always there, so the search box never changes width. */}
            <Styled.GiveUp>
              <Button
                stroke
                variant="red"
                onClick={giveUp}
                disabled={round.guesses.length === 0}
              >
                {confirming ? "Sure?" : "Give up"}
              </Button>
            </Styled.GiveUp>
          </Styled.SearchRow>
          <Styled.Hint>
            {round.guesses.length === 0 ? (
              <>
                {game === "gameplay"
                  ? "Guess any student or costume: each has its own kit."
                  : "Guess any student: their profile, not their outfit."}
                <Styled.RandomButton type="button" onClick={pickRandom}>
                  <IoDice aria-hidden="true" />
                  Random first guess
                </Styled.RandomButton>
              </>
            ) : (
              <>
                {round.guesses.length}{" "}
                {round.guesses.length === 1 ? "guess" : "guesses"} so far ·{" "}
                <kbd>Enter</kbd> picks the top name, <kbd>Enter</kbd> again
                guesses
              </>
            )}
            {typeof round.startedAt === "number" && (
              <SolveClock startedAt={round.startedAt} />
            )}
          </Styled.Hint>
        </>
      )}
      {listOpen && (
        <StudentListPopUp
          pool={poolOf(game)}
          guessed={guessed}
          onPick={pickFromList}
          onClose={() => setListOpen(false)}
        />
      )}
      <ClueTable
        game={game}
        answer={answer}
        guesses={round.guesses}
        fresh={fresh}
      />
    </Styled.Wrapper>
  );
}
