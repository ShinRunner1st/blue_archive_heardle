import React from "react";

import { isOver, poolOf, studentById } from "../../helpers/studentRounds";
import { WinStreak } from "../../helpers/winStreak";
import {
  StudentGame as Way,
  StudentMode,
  StudentRound,
} from "../../types/student";

import { Button } from "../Button";

import { ClueTable } from "./ClueTable";
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
              onGuess={guess}
              keyboardEnabled={keyboardEnabled}
            />
            {round.guesses.length > 0 && (
              <Button stroke variant="red" onClick={giveUp}>
                {confirming ? "Sure?" : "Give up"}
              </Button>
            )}
          </Styled.SearchRow>
          <Styled.Hint>
            {round.guesses.length === 0 ? (
              game === "gameplay" ? (
                "Guess any student or costume: each has its own kit."
              ) : (
                "Guess any student: their profile, not their outfit."
              )
            ) : (
              <>
                {round.guesses.length}{" "}
                {round.guesses.length === 1 ? "guess" : "guesses"} so far ·{" "}
                <kbd>Enter</kbd> guesses the top name
              </>
            )}
          </Styled.Hint>
        </>
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
