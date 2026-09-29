import React from "react";
import { IoGrid } from "react-icons/io5";

import {
  hasPictureHints,
  picturePool,
  pictureHints,
  ruledOut,
  showsShape,
} from "../../helpers/pictureRounds";
import { studentById } from "../../helpers/studentRounds";
import { hintsShown, isOver, triesOf } from "../../helpers/voiceRounds";
import { PictureGameState } from "../../hooks/usePictureGame";
import { optionsOf, PictureKind, PictureOptions } from "../../types/picture";
import { Student } from "../../types/student";

import { Button } from "../Button";
import { StudentListPopUp } from "../StudentGame/StudentListPopUp";
import { StudentSearch } from "../StudentGame/StudentSearch";
import { hasSilhouette } from "../StudentIcon";
import { VoiceChoices, VoiceGuesses } from "../VoiceGame/VoiceParts";

import { GuessPicture } from "./GuessPicture";
import { KindRow, PictureHints } from "./PictureParts";
import { PictureResult } from "./PictureResult";

import * as Styled from "./index.styled";

export { KindRow } from "./PictureParts";
export { PictureTimeAttack } from "./PictureTimeAttack";

interface Props {
  game: PictureGameState;
  onKindChange: (kind: PictureKind) => void;
  /**
   * Turns the silhouette and hints on or off: each mix is its own way to
   * play, with its own stats.
   */
  onOptionsChange?: (options: PictureOptions) => void;
  /** False while a dialog is open, so the page's keys stay inert. */
  keyboardEnabled: boolean;
}

/**
 * The picture game: see a student's halo or weapon and name them. Daily and
 * Classic give a hint with each miss, four tries in all; Classic can turn
 * the hints off and show the picture's silhouette instead, and 4-Choice,
 * one pick from four, can show the silhouette too.
 */
export function PictureGame({
  game,
  onKindChange,
  onOptionsChange,
  keyboardEnabled,
}: Props) {
  const { kind, mode, round } = game;
  const answer = studentById.get(round.answer);
  const over = isOver(round);
  const tries = triesOf(round);
  const shape = showsShape(mode, round);
  const withHints = hasPictureHints(mode);
  const guessed = React.useMemo(
    () => ruledOut(kind, round.guesses),
    [kind, round.guesses]
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
  // A skip or a new picture leaves nothing picked.
  const tried = round.guesses.length;
  React.useEffect(() => setSelected(undefined), [tried, round.answer]);

  // Shift+Enter skips, as in the OST and Voice mode. A held key doesn't
  // skip every try.
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

  if (!answer) return null;

  const kindRow = (
    <KindRow
      kind={kind}
      onKindChange={onKindChange}
      options={optionsOf(mode)}
      toggles={
        mode === "daily"
          ? []
          : mode.startsWith("choice")
          ? ["shape"]
          : ["shape", "hints"]
      }
      onOptionsChange={onOptionsChange}
    />
  );

  if (over) {
    return (
      <Styled.Wrapper>
        {kindRow}
        <PictureResult
          // A new result for each round.
          key={game.rounds.length}
          game={game}
          answer={answer}
          keyboardEnabled={keyboardEnabled}
        />
      </Styled.Wrapper>
    );
  }

  const stage = (
    <Styled.Stage>
      <GuessPicture kind={kind} id={answer.id} shape={shape} />
    </Styled.Stage>
  );

  if (round.choices) {
    return (
      <Styled.Wrapper>
        {kindRow}
        {stage}
        <Styled.Tip>
          <kbd>1</kbd>–<kbd>4</kbd> pick an answer
        </Styled.Tip>
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
  const hints = pictureHints(shape, hasSilhouette(answer.id));
  const nextHint = withHints && misses < hints.length;
  const pool = picturePool(kind);

  return (
    <Styled.Wrapper>
      {kindRow}
      {stage}
      <Styled.Tip>
        Type, then <kbd>Enter</kbd> to pick and guess · <kbd>Shift</kbd>+
        <kbd>Enter</kbd> skip
      </Styled.Tip>
      <VoiceGuesses guesses={round.guesses} tries={tries} answer={answer.id} />
      {withHints && (
        <PictureHints
          kind={kind}
          answer={answer}
          hints={hints}
          shown={hintsShown(round, true)}
        />
      )}
      <Styled.SearchRow>
        <StudentSearch
          pool={pool}
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
          pool={pool}
          guessed={guessed}
          onPick={pickFromList}
          onClose={() => setListOpen(false)}
        />
      )}
    </Styled.Wrapper>
  );
}
