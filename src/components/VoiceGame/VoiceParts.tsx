import React from "react";
import { IoLockClosed } from "react-icons/io5";

import { studentById } from "../../helpers/studentRounds";
import { Hint, HINTS } from "../../helpers/voiceRounds";
import { Student } from "../../types/student";
import { SKIPPED } from "../../types/voice";

import * as ChoiceStyled from "../Choices/index.styled";
import { ClueIcon, hasClueIcon, Silhouette, StudentIcon } from "../StudentIcon";

import * as Styled from "./index.styled";

/** The round's tries, two to a row: who was guessed, a skip, or empty. */
export function VoiceGuesses({
  guesses,
  tries,
  answer,
}: {
  guesses: number[];
  tries: number;
  answer: number;
}) {
  return (
    <Styled.Tries>
      {Array.from({ length: tries }, (_, index) => {
        const id = guesses[index];
        const student = id === undefined ? undefined : studentById.get(id);
        return (
          <Styled.GuessRow
            key={index}
            $active={index === guesses.length}
            $isCorrect={
              id === undefined || id === SKIPPED ? undefined : id === answer
            }
          >
            {id === SKIPPED && <Styled.Skipped>Skipped</Styled.Skipped>}
            {student && (
              <>
                <StudentIcon id={student.id} size={28} />
                <Styled.GuessName>{student.name}</Styled.GuessName>
              </>
            )}
          </Styled.GuessRow>
        );
      })}
    </Styled.Tries>
  );
}

const HINT_LABELS: Record<Hint, string> = {
  school: "School",
  club: "Club",
  silhouette: "Silhouette",
};

/**
 * The hints, a card each, opened one per miss. A locked card says when it
 * opens, and holds nothing of the answer: the school, club and silhouette
 * only reach the page once they show.
 */
export function VoiceHints({
  answer,
  shown,
}: {
  answer: Student;
  shown: number;
}) {
  return (
    <Styled.Hints aria-label="Hints">
      {HINTS.map((hint, index) => {
        const open = index < shown;
        return (
          <Styled.HintCard key={hint} $open={open}>
            <Styled.HintLabel>{HINT_LABELS[hint]}</Styled.HintLabel>
            {open ? (
              <HintValue hint={hint} answer={answer} />
            ) : (
              <Styled.HintLocked>
                <IoLockClosed aria-hidden="true" />
                {index === 0 ? "After 1 miss" : `After ${index + 1} misses`}
              </Styled.HintLocked>
            )}
          </Styled.HintCard>
        );
      })}
    </Styled.Hints>
  );
}

function HintValue({ hint, answer }: { hint: Hint; answer: Student }) {
  if (hint === "silhouette") return <Silhouette id={answer.id} size={48} />;
  if (hint === "club")
    return <Styled.HintValue>{answer.club}</Styled.HintValue>;

  const icon = `school/${answer.school}`;
  return (
    <Styled.HintValue>
      {hasClueIcon(icon) && <ClueIcon iconKey={icon} size={28} />}
      {answer.school}
    </Styled.HintValue>
  );
}

interface ChoicesProps {
  /** The four answers, by id. */
  choices: number[];
  /** Picks an answer. Left out once the round is over. */
  onPick?: (id: number) => void;
  keyboardEnabled?: boolean;
  /** Once answered: the answer, marked right. */
  answer?: number;
  /** Once answered: the pick, marked wrong if it was. */
  picked?: number;
  /** During the round: the pick waiting to be sent, as Choices' is. */
  selected?: number;
}

/**
 * The four students of a one-pick round, picked with a tap or the keys 1 to
 * 4, like the OST's four songs.
 */
export function VoiceChoices({
  choices,
  onPick,
  keyboardEnabled = true,
  answer,
  picked,
  selected,
}: ChoicesProps) {
  const options = React.useMemo(
    () =>
      choices
        .map((id) => studentById.get(id))
        .filter((student): student is Student => student !== undefined),
    [choices]
  );
  const isOver = answer !== undefined;

  React.useEffect(() => {
    if (!keyboardEnabled || !onPick || isOver) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      const option = options[Number(e.key) - 1];
      if (!option) return;
      e.preventDefault();
      onPick(option.id);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [keyboardEnabled, onPick, isOver, options]);

  const toneOf = (id: number): ChoiceStyled.ChoiceTone => {
    if (!isOver) return id === selected ? "chosen" : "open";
    if (id === answer) return "right";
    if (id === picked) return "wrong";
    return "other";
  };

  return (
    <ChoiceStyled.Grid role="group" aria-label="Answers">
      {options.map((student, index) => (
        <ChoiceStyled.Choice
          key={student.id}
          type="button"
          $tone={toneOf(student.id)}
          disabled={isOver || !onPick}
          aria-pressed={
            selected === undefined ? undefined : student.id === selected
          }
          onClick={() => onPick?.(student.id)}
        >
          <ChoiceStyled.Key aria-hidden="true">{index + 1}</ChoiceStyled.Key>
          <StudentIcon id={student.id} size={40} />
          <ChoiceStyled.Text>
            <ChoiceStyled.Name>{student.name}</ChoiceStyled.Name>
            <Styled.ChoiceSub>{student.school}</Styled.ChoiceSub>
          </ChoiceStyled.Text>
        </ChoiceStyled.Choice>
      ))}
    </ChoiceStyled.Grid>
  );
}
