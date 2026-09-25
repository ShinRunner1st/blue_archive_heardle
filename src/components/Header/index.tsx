import React from "react";
import {
  IoBarChart,
  IoInformationCircle,
  IoGameController,
  IoMoon,
  IoSunny,
} from "react-icons/io5";

import { switchColorScheme } from "../../helpers/colorScheme";
import { useColorScheme } from "../../hooks/useColorScheme";
import { GameMode } from "../../types/mode";

import * as Styled from "./index.styled";
import img from "../../image/BlueArchive-Heardle.png";

interface Props {
  openInfoPopUp: () => void;
  openStatsPopUp: () => void;
  openHowToPopUp: () => void;
  mode: GameMode;
  onModeChange: (mode: GameMode) => void;
  /** Consecutive daily wins. Shown in daily mode once there is a run going. */
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
  mode,
  onModeChange,
  streak,
}: Props) {
  const showStreak = mode === "daily" && streak > 0;
  const scheme = useColorScheme();
  const next = scheme === "dark" ? "light" : "dark";

  const toggleScheme = React.useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      // The new scheme spreads out from the button that was pressed.
      const box = e.currentTarget.getBoundingClientRect();
      switchColorScheme(next, {
        x: box.left + box.width / 2,
        y: box.top + box.height / 2,
      });
    },
    [next]
  );

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

        <Styled.Brand>
          {/* The wordmark carries the page heading, so its alt text is the h1. */}
          <Styled.Heading>
            <Styled.Logo src={img} alt="Blue Archive Heardle" />
          </Styled.Heading>
          <Styled.Tagline>Guess the Blue Archive OST</Styled.Tagline>
        </Styled.Brand>

        <Styled.Tools>
          {showStreak && (
            <Styled.Streak
              role="img"
              aria-label={`${streak} day streak`}
              title={`${streak} day streak`}
            >
              🔥 {streak}
            </Styled.Streak>
          )}
          <Styled.IconButton
            type="button"
            onClick={toggleScheme}
            aria-label={`Switch to ${next} mode`}
            title={`Switch to ${next} mode`}
          >
            {/* Keyed, so each switch remounts the icon and replays its spin. */}
            <Styled.SchemeIcon key={scheme}>
              {scheme === "dark" ? (
                <IoSunny size="1em" aria-hidden="true" />
              ) : (
                <IoMoon size="1em" aria-hidden="true" />
              )}
            </Styled.SchemeIcon>
          </Styled.IconButton>
          <Styled.IconButton
            type="button"
            onClick={openInfoPopUp}
            aria-label="About this game"
          >
            <IoInformationCircle size="1em" aria-hidden="true" />
          </Styled.IconButton>
          <Styled.IconButton
            type="button"
            onClick={openHowToPopUp}
            aria-label="How to play"
          >
            <IoGameController size="1em" aria-hidden="true" />
          </Styled.IconButton>
          <Styled.IconButton
            type="button"
            onClick={openStatsPopUp}
            aria-label="Your stats"
          >
            <IoBarChart size="1em" aria-hidden="true" />
          </Styled.IconButton>
        </Styled.Tools>
      </Styled.Content>
    </Styled.Container>
  );
}
