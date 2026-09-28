import { Game, GameMode } from "../../types/mode";
import { StudentGame } from "../../types/student";

import * as Styled from "./index.styled";

interface Option<T extends string> {
  value: T;
  label: string;
  hint: string;
}

interface PillsProps<T extends string> {
  /** What the choice is, for screen readers. */
  label: string;
  options: Array<Option<T>>;
  value: T;
  onChange: (value: T) => void;
}

/**
 * A smaller cousin of the header's Daily/Endless switch, for the choices under
 * the header: which game, and how to play it.
 */
export function Pills<T extends string>({
  label,
  options,
  value,
  onChange,
}: PillsProps<T>) {
  const index = options.findIndex((option) => option.value === value);

  return (
    <Styled.Styles role="group" aria-label={label} $count={options.length}>
      <Styled.Thumb
        aria-hidden="true"
        $index={Math.max(index, 0)}
        $count={options.length}
      />
      {options.map((option) => (
        <Styled.Style
          key={option.value}
          type="button"
          $active={option.value === value}
          aria-pressed={option.value === value}
          title={option.hint}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </Styled.Style>
      ))}
    </Styled.Styles>
  );
}

/** The ways to play under Endless, in the order the switch shows them. */
export const PLAY_STYLES: Array<Option<GameMode>> = [
  { value: "endless", label: "Classic", hint: "Six tries to name each song" },
  {
    value: "choice",
    label: "4-Choice",
    hint: "A short clip and one pick from four answers",
  },
  {
    value: "timeattack",
    label: "Time Attack",
    hint: "As many songs as you can in three minutes",
  },
];

/**
 * Picks how to play Endless, above the play area. It shows only there: the
 * header keeps the one choice every player makes, Daily or Endless, and fits
 * on a phone beside the logo.
 */
export function PlayStyles({
  mode,
  onChange,
}: {
  mode: GameMode;
  onChange: (mode: GameMode) => void;
}) {
  return (
    <Pills
      label="Way to play"
      options={PLAY_STYLES}
      value={mode}
      onChange={onChange}
    />
  );
}

const GAMES: Array<Option<Game>> = [
  { value: "ost", label: "OST", hint: "Name the song from a clip" },
  {
    value: "students",
    label: "Students",
    hint: "Name the student from how they compare",
  },
];

/** Picks the game: the OST, or the students. */
export function GameSwitch({
  game,
  onChange,
}: {
  game: Game;
  onChange: (game: Game) => void;
}) {
  return (
    <Pills label="Game" options={GAMES} value={game} onChange={onChange} />
  );
}

const STUDENT_GAMES: Array<Option<StudentGame>> = [
  {
    value: "gameplay",
    label: "Gameplay",
    hint: "School, role, damage, weapon, EX cost and release",
  },
  {
    value: "lore",
    label: "Lore",
    hint: "Height, birthday, year, club, favourite gift and more",
  },
];

/** Picks how to play the student game: by kit, or by profile. */
export function StudentStyles({
  game,
  onChange,
}: {
  game: StudentGame;
  onChange: (game: StudentGame) => void;
}) {
  return (
    <Pills
      label="Way to play"
      options={STUDENT_GAMES}
      value={game}
      onChange={onChange}
    />
  );
}
