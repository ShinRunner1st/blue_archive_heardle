import React from "react";
import { IoBarChart } from "react-icons/io5";

import { PAGES } from "../../constants/pages";
import { isPlainClick } from "../../hooks/usePage";
import { GameMode, isEndlessStyle } from "../../types/mode";

import { HeaderMenu } from "../HeaderMenu";

import * as Styled from "./index.styled";
import img from "../../image/BlueArchive-Heardle.png";

interface Props {
  openInfoPopUp: () => void;
  openStatsPopUp: () => void;
  openBadgesPopUp: () => void;
  openHowToPopUp: () => void;
  openSettingsPopUp: () => void;
  openWhatsNewPopUp: () => void;
  openJukeboxPopUp: () => void;
  openSenseiCard: () => void;
  mode: GameMode;
  onModeChange: (mode: GameMode) => void;
  /**
   * The current mode's run: consecutive daily wins, or endless wins in a row.
   * Shown once there is one going.
   */
  streak: number;
  /** The line under the logo: which game is being played. */
  tagline: string;
  /**
   * On the hub there is no game, so no Daily/Endless, streak or stats, and
   * the logo is the page's heading. On a game's page the tagline is.
   */
  isHub?: boolean;
  /** The logo links to the hub; a plain click moves there in place. */
  onHome?: () => void;
}

const MODES: Array<{ mode: GameMode; label: string; hint: string }> = [
  { mode: "daily", label: "Daily", hint: "One track a day, same for everyone" },
  { mode: "endless", label: "Endless", hint: "Play as many as you like" },
];

export function Header({
  openInfoPopUp,
  openStatsPopUp,
  openBadgesPopUp,
  openHowToPopUp,
  openSettingsPopUp,
  openWhatsNewPopUp,
  openJukeboxPopUp,
  openSenseiCard,
  mode,
  onModeChange,
  streak,
  tagline,
  isHub = false,
  onHome,
}: Props) {
  const showStreak = !isHub && streak > 0;
  const streakLabel =
    mode === "daily"
      ? `${streak} day streak`
      : mode === "timeattack"
      ? `${streak} right this run`
      : `${streak} wins in a row`;

  return (
    <Styled.Container>
      <Styled.Content>
        {!isHub && (
          <Styled.Modes role="group" aria-label="Game mode">
            {/*
            The green pill is one element that slides, rather than a background
            that jumps from one button to the other.
          */}
            <Styled.ModeThumb
              aria-hidden="true"
              $index={isEndlessStyle(mode) ? 1 : 0}
            />
            {MODES.map((option) => {
              // Endless stands for every way to play it (see PlayStyles).
              const active =
                option.mode === "daily"
                  ? mode === "daily"
                  : isEndlessStyle(mode);

              return (
                <Styled.ModeButton
                  key={option.mode}
                  type="button"
                  $active={active}
                  aria-pressed={active}
                  title={option.hint}
                  onClick={() => onModeChange(option.mode)}
                >
                  {option.label}
                </Styled.ModeButton>
              );
            })}
          </Styled.Modes>
        )}

        {/* On the hub the wordmark carries the page heading, so its alt
            text is the h1; on a game's page the tagline is. */}
        <Styled.Heading as={isHub ? "h1" : "div"}>
          <Styled.HomeLink
            href={PAGES.hub.path}
            title="Every game"
            onClick={(event: React.MouseEvent) => {
              if (!onHome || !isPlainClick(event)) return;
              event.preventDefault();
              onHome();
            }}
          >
            <Styled.Logo src={img} alt="Blue Archive Heardle" />
          </Styled.HomeLink>
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
          {!isHub && (
            <Styled.IconButton
              type="button"
              onClick={openStatsPopUp}
              aria-label="Your stats"
            >
              <IoBarChart size="1em" aria-hidden="true" />
            </Styled.IconButton>
          )}
          <HeaderMenu
            openInfoPopUp={openInfoPopUp}
            openHowToPopUp={openHowToPopUp}
            openSettingsPopUp={openSettingsPopUp}
            openWhatsNewPopUp={openWhatsNewPopUp}
            openJukeboxPopUp={openJukeboxPopUp}
            openBadgesPopUp={openBadgesPopUp}
            openSenseiCard={openSenseiCard}
          />
        </Styled.Tools>
        <Styled.Tagline as={isHub ? "p" : "h1"}>{tagline}</Styled.Tagline>
      </Styled.Content>
    </Styled.Container>
  );
}
