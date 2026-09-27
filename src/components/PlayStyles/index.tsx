import { GameMode } from "../../types/mode";

import * as Styled from "./index.styled";

interface Props {
  mode: GameMode;
  onChange: (mode: GameMode) => void;
}

/** The ways to play under Endless, in the order the switch shows them. */
export const PLAY_STYLES: Array<{
  mode: GameMode;
  label: string;
  hint: string;
}> = [
  { mode: "endless", label: "Classic", hint: "Six tries to name each song" },
  {
    mode: "choice",
    label: "4-Choice",
    hint: "A short clip and one pick from four answers",
  },
  {
    mode: "timeattack",
    label: "Time Attack",
    hint: "As many songs as you can in three minutes",
  },
];

/**
 * Picks how to play Endless, above the play area. It shows only there: the
 * header keeps the one choice every player makes, Daily or Endless, and fits
 * on a phone beside the logo.
 */
export function PlayStyles({ mode, onChange }: Props) {
  const index = PLAY_STYLES.findIndex((style) => style.mode === mode);

  return (
    <Styled.Styles
      role="group"
      aria-label="Way to play"
      $count={PLAY_STYLES.length}
    >
      <Styled.Thumb
        aria-hidden="true"
        $index={Math.max(index, 0)}
        $count={PLAY_STYLES.length}
      />
      {PLAY_STYLES.map((style) => (
        <Styled.Style
          key={style.mode}
          type="button"
          $active={style.mode === mode}
          aria-pressed={style.mode === mode}
          title={style.hint}
          onClick={() => onChange(style.mode)}
        >
          {style.label}
        </Styled.Style>
      ))}
    </Styled.Styles>
  );
}
