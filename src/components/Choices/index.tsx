import React from "react";

import { choiceSongs } from "../../helpers/choices";
import { Song } from "../../types/song";

import * as Styled from "./index.styled";

interface Props {
  /** The round's answers, as theme numbers. */
  choices: string[];
  /** Picks an answer. Left out once the round is over. */
  onPick?: (song: Song) => void;
  /** False while a dialog is open, so the number keys stay inert. */
  keyboardEnabled?: boolean;
  /** Once the round is over: the answer, marked right. */
  answer?: string;
  /** Once the round is over: what the player picked, marked wrong if it was. */
  picked?: string;
}

/**
 * The four answers of a four-choice round, picked with a tap or the keys 1 to
 * 4. Once the round is over the same four show again, with the answer marked,
 * and the player's pick too if it was wrong.
 */
export function Choices({
  choices,
  onPick,
  keyboardEnabled = true,
  answer,
  picked,
}: Props) {
  const options = React.useMemo(() => choiceSongs(choices), [choices]);
  const isOver = answer !== undefined;

  React.useEffect(() => {
    if (!keyboardEnabled || !onPick || isOver) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      const option = options[Number(e.key) - 1];
      if (!option) return;
      e.preventDefault();
      onPick(option);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [keyboardEnabled, onPick, isOver, options]);

  const toneOf = (song: Song): Styled.ChoiceTone => {
    if (!isOver) return "open";
    if (song.themeNo === answer) return "right";
    if (song.themeNo === picked) return "wrong";
    return "other";
  };

  return (
    <Styled.Grid role="group" aria-label="Answers">
      {options.map((song, index) => (
        <Styled.Choice
          key={song.themeNo}
          type="button"
          $tone={toneOf(song)}
          disabled={isOver || !onPick}
          onClick={() => onPick?.(song)}
        >
          <Styled.Key aria-hidden="true">{index + 1}</Styled.Key>
          <Styled.Text>
            <Styled.Name>{song.name}</Styled.Name>
            <Styled.Artist>{song.artist}</Styled.Artist>
          </Styled.Text>
        </Styled.Choice>
      ))}
    </Styled.Grid>
  );
}
