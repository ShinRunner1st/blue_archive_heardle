import React from "react";

import { GuessType } from "../../types/guess";
import { Song } from "../../types/song";

import * as Styled from "./index.styled";

interface Props {
  guess: GuessType;
  active: boolean;
  solution: Song;
}

/** A guess within this many theme numbers of the answer counts as "warm". */
const HINT_RANGE = 10;

export function Guess({ guess, active, solution }: Props) {
  const { song, skipped, isCorrect } = guess;

  // Derived straight from props - holding this in state only risked the two
  // drifting apart.
  const hint = React.useMemo(() => {
    if (!song) return null;

    const difference = Number(song.themeNo) - Number(solution.themeNo);
    if (!Number.isFinite(difference)) return null;

    return {
      isClose: Math.abs(difference) <= HINT_RANGE,
      // The answer is lower than the guess, so point the player downwards.
      arrow: difference > 0 ? "↓" : difference < 0 ? "↑" : "",
    };
  }, [song, solution.themeNo]);

  const text = song
    ? `${song.artist} - ${song.name}`
    : skipped
    ? "Skipped"
    : "";

  return (
    <Styled.Container
      $active={active}
      $isCorrect={isCorrect}
      $closeHint={hint?.isClose ?? false}
    >
      <Styled.Text>{text}</Styled.Text>
      {song && (
        <Styled.ThemeNo>
          [Theme {song.themeNo}] {hint?.arrow}
        </Styled.ThemeNo>
      )}
    </Styled.Container>
  );
}
