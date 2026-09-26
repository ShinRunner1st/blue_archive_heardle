import { IoBarChart } from "react-icons/io5";

import { GameMode } from "../../types/mode";

import { HeaderMenu } from "../HeaderMenu";

import * as Styled from "./index.styled";
import img from "../../image/BlueArchive-Heardle.png";

interface Props {
  openInfoPopUp: () => void;
  openStatsPopUp: () => void;
  openHowToPopUp: () => void;
  openSettingsPopUp: () => void;
  mode: GameMode;
  onModeChange: (mode: GameMode) => void;
  /**
   * The current mode's run: consecutive daily wins, or endless wins in a row.
   * Shown once there is one going.
   */
  streak: number;
}

const MODES: Array<{ mode: GameMode; label: string; hint: string }> = [
  { mode: "daily", label: "Daily", hint: "One track a day, same for everyone" },
  { mode: "endless", label: "Endless", hint: "Play as many as you like" },
];

export function Header({
  openInfoPopUp,
  openStatsPopUp,
  openHowToPopUp,
  openSettingsPopUp,
  mode,
  onModeChange,
  streak,
}: Props) {
  const showStreak = streak > 0;
  const streakLabel =
    mode === "daily" ? `${streak} day streak` : `${streak} wins in a row`;

  return (
    <Styled.Container>
      <Styled.Content>
        <Styled.Modes role="group" aria-label="Game mode">
          {/*
            The green pill is one element that slides, rather than a background
            that jumps from one button to the other.
          */}
          <Styled.ModeThumb
            aria-hidden="true"
            $index={MODES.findIndex((option) => option.mode === mode)}
          />
          {MODES.map((option) => (
            <Styled.ModeButton
              key={option.mode}
              type="button"
              $active={mode === option.mode}
              aria-pressed={mode === option.mode}
              title={option.hint}
              onClick={() => onModeChange(option.mode)}
            >
              {option.label}
            </Styled.ModeButton>
          ))}
        </Styled.Modes>

        {/* The wordmark carries the page heading, so its alt text is the h1. */}
        <Styled.Heading>
          <Styled.Logo src={img} alt="Blue Archive Heardle" />
        </Styled.Heading>

        <Styled.Tools>
          {showStreak && (
            <Styled.Streak
              role="img"
              aria-label={streakLabel}
              title={streakLabel}
            >
              🔥 {streak}
            </Styled.Streak>
          )}
          <Styled.IconButton
            type="button"
            onClick={openStatsPopUp}
            aria-label="Your stats"
          >
            <IoBarChart size="1em" aria-hidden="true" />
          </Styled.IconButton>
          <HeaderMenu
            openInfoPopUp={openInfoPopUp}
            openHowToPopUp={openHowToPopUp}
            openSettingsPopUp={openSettingsPopUp}
          />
        </Styled.Tools>
        <Styled.Tagline>Guess the Blue Archive OST</Styled.Tagline>
      </Styled.Content>
    </Styled.Container>
  );
}
