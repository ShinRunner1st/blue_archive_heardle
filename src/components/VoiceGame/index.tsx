import React from "react";
import { IoGrid } from "react-icons/io5";

import { getVoiceUrl } from "../../helpers/audioUrl";
import { studentById } from "../../helpers/studentRounds";
import {
  hasHints,
  HINTS,
  hintsShown,
  isOver,
  triesOf,
  voicePool,
} from "../../helpers/voiceRounds";
import { VoiceGameState } from "../../hooks/useVoiceGame";
import { Student } from "../../types/student";
import { SKIPPED, VoiceRoundMode } from "../../types/voice";

import { Button } from "../Button";
import * as GameStyled from "../Game/index.styled";
import { Chip } from "../SongListPopUp/index.styled";
import { StudentListPopUp } from "../StudentGame/StudentListPopUp";
import { StudentSearch } from "../StudentGame/StudentSearch";

import { VoiceChoices, VoiceGuesses, VoiceHints } from "./VoiceParts";
import { VoicePlayer } from "./VoicePlayer";
import { VoiceResult } from "./VoiceResult";

import * as Styled from "./index.styled";

export { VoiceTimeAttack } from "./VoiceTimeAttack";

interface Props {
  mode: VoiceRoundMode;
  game: VoiceGameState;
  /** Turns Classic's hints on or off: No hints is Classic without them. */
  onHintsChange?: (on: boolean) => void;
  /** False while a dialog is open, so the page's keys stay inert. */
  keyboardEnabled: boolean;
}

/**
 * Voice mode: hear a student's line and name them. Daily and Classic give a
 * hint with each miss, four tries in all; No hints doesn't; 4-Choice is one
 * pick from four students.
 */
export function VoiceGame({
  mode,
  game,
  onHintsChange,
  keyboardEnabled,
}: Props) {
  const { round } = game;
  const answer = studentById.get(round.answer);
  const over = isOver(round);
  const tries = triesOf(round);
  const withHints = hasHints(mode);
  const guessed = React.useMemo(
    () => new Set(round.guesses.filter((id) => id !== SKIPPED)),
    [round.guesses]
  );

  // The student picked in the box or the grid, guessed on Enter or Guess.
  const [selected, setSelected] = React.useState<Student>();
  const [listOpen, setListOpen] = React.useState(false);
  const pickFromList = React.useCallback((id: number) => {
    setListOpen(false);
    setSelected(studentById.get(id));
  }, []);
  const guess = React.useCallback(
    (id: number) => {
      setSelected(undefined);
      game.guess(id);
    },
    [game]
  );
  // A skip or a new line leaves nothing picked.
  const tried = round.guesses.length;
  React.useEffect(() => setSelected(undefined), [tried, round.answer]);

  // Shift+Enter skips, as in the OST, so a round can be played start to
  // finish from the keyboard. A held key doesn't skip every try.
  const { skip } = game;
  React.useEffect(() => {
    if (!keyboardEnabled || over || round.choices || listOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Enter" || !e.shiftKey || e.repeat) return;
      e.preventDefault();
      skip();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [keyboardEnabled, over, round.choices, listOpen, skip]);

  // Whether a round has been played on this screen: the answer only plays
  // by itself when the round ended here, as in the OST, never on a mode
  // switch or a reload.
  const playedHere = React.useRef(false);
  if (!over) playedHere.current = true;

  if (!answer) return null;

  const score = `${game.wins}/${game.played}`;

  if (over) {
    return (
      <VoiceResult
        // A new result, and a fresh player, for each round.
        key={game.rounds.length}
        mode={mode}
        round={round}
        answer={answer}
        score={score}
        streak={game.streak}
        onNext={game.next}
        onNewDay={game.refreshDay}
        record={game.record}
        autoPlay={playedHere.current}
        keyboardEnabled={keyboardEnabled}
      />
    );
  }

  const url = getVoiceUrl(answer.id, round.line);
  const onSkipTrack = mode === "daily" ? undefined : game.replaceCurrent;

  if (round.choices) {
    return (
      <Styled.Wrapper>
        <VoicePlayer
          url={url}
          keyboardEnabled={keyboardEnabled}
          onSkipTrack={onSkipTrack}
          hint={
            <>
              <kbd>Space</kbd> play · <kbd>1</kbd>–<kbd>4</kbd> pick an answer
            </>
          }
        />
        <VoiceChoices
          choices={round.choices}
          onPick={game.guess}
          keyboardEnabled={keyboardEnabled}
        />
      </Styled.Wrapper>
    );
  }

  const misses = round.guesses.length;
  const isLastTry = misses === tries - 1;
  const nextHint = withHints && misses < HINTS.length;

  return (
    <Styled.Wrapper>
      {onHintsChange && mode !== "daily" && (
        <GameStyled.ClipRow>
          <GameStyled.ClipLabel>Hints</GameStyled.ClipLabel>
          <Styled.HintSwitch role="group" aria-label="Hints">
            {[true, false].map((on) => (
              <Chip
                key={String(on)}
                type="button"
                $active={withHints === on}
                aria-pressed={withHints === on}
                onClick={() => onHintsChange(on)}
              >
                {on ? "On" : "Off"}
              </Chip>
            ))}
          </Styled.HintSwitch>
        </GameStyled.ClipRow>
      )}
      <VoiceGuesses guesses={round.guesses} tries={tries} answer={answer.id} />
      {withHints && (
        <VoiceHints answer={answer} shown={hintsShown(round, true)} />
      )}
      <VoicePlayer
        url={url}
        keyboardEnabled={keyboardEnabled && !listOpen}
        onSkipTrack={onSkipTrack}
        hint={
          <>
            <kbd>Space</kbd> play · type, then <kbd>Enter</kbd> to pick and
            guess · <kbd>Shift</kbd>+<kbd>Enter</kbd> skip
          </>
        }
      />
      <Styled.SearchRow>
        <StudentSearch
          pool={voicePool()}
          guessed={guessed}
          onGuess={guess}
          selected={selected}
          onSelect={setSelected}
          direction="up"
          keyboardEnabled={keyboardEnabled && !listOpen}
        />
        <Styled.BrowseButton
          type="button"
          onClick={() => setListOpen(true)}
          aria-label="Browse all students"
          title="All students"
        >
          <IoGrid size={20} aria-hidden="true" />
        </Styled.BrowseButton>
      </Styled.SearchRow>
      <Styled.Buttons>
        <Button stroke onClick={skip}>
          {isLastTry ? "Give up?" : nextHint ? "Skip for a hint" : "Skip"}
        </Button>
        <Button
          stroke
          variant="green"
          onClick={() => selected && guess(selected.id)}
          disabled={!selected}
        >
          Guess
        </Button>
      </Styled.Buttons>
      {listOpen && (
        <StudentListPopUp
          pool={voicePool()}
          guessed={guessed}
          onPick={pickFromList}
          onClose={() => setListOpen(false)}
        />
      )}
    </Styled.Wrapper>
  );
}
