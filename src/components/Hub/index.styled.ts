import styled, { DefaultTheme } from "styled-components";
import "@fontsource-variable/nunito-sans";
import { IoChevronForward } from "react-icons/io5";

import { Game } from "../../types/mode";
import { DailyState } from "../../helpers/todayResults";

/** Each game's colour, for its card's icon and edge. */
function accentOf(game: Game, theme: DefaultTheme): string {
  switch (game) {
    case "ost":
      return theme.blue;
    case "voice":
      return theme.pink;
    case "students":
      return theme.green;
    default:
      return theme.orange;
  }
}

export const Hub = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  width: 100%;

  font-family: "Nunito Sans Variable";
  color: ${({ theme }) => theme.text};
`;

export const Intro = styled.p`
  max-width: 520px;
  margin: 0;

  font-size: 0.95rem;
  font-weight: 600;
  line-height: 1.45;
  text-align: center;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.9);

  @media (max-width: 480px) {
    font-size: 0.85rem;
  }
`;

export const Continue = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 8px;

  padding: 9px 20px;

  font-size: 1rem;
  font-weight: 800;
  color: #fff;
  text-decoration: none;

  background-color: ${({ theme }) => theme.blue};
  border-radius: 999px;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.35);

  transition: transform 0.12s ease, filter 0.2s ease;

  &:hover {
    filter: brightness(1.1);
  }

  &:active {
    transform: scale(0.96);
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.border};
    outline-offset: 3px;
  }
`;

export const Today = styled.p`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin: 0;

  font-size: 0.8rem;
  font-weight: 700;
  opacity: 0.85;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.9);
`;

export const Cards = styled.ul`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  width: 100%;
  margin: 0;
  padding: 0;
  list-style: none;

  @media (max-width: 560px) {
    grid-template-columns: minmax(0, 1fr);
    gap: 8px;
  }
`;

export const Card = styled.a<{ $game: Game }>`
  display: flex;
  flex-direction: column;
  gap: 6px;
  box-sizing: border-box;
  height: 100%;
  padding: 14px 16px 12px;

  color: inherit;
  text-decoration: none;

  /* The page artwork stays faintly visible behind the card. */
  background-color: ${({ theme }) => theme.background1}e6;
  border: 1px solid ${({ theme }) => theme.background100};
  border-left: 4px solid ${({ theme, $game }) => accentOf($game, theme)};
  border-radius: 12px;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.3);

  transition: transform 0.15s ease, border-color 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    border-color: ${({ theme, $game }) => accentOf($game, theme)};
  }

  &:active {
    transform: scale(0.98);
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.border};
    outline-offset: 2px;
  }

  @media (max-width: 560px) {
    padding: 10px 12px;
    gap: 4px;
  }
`;

export const CardHead = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

export const Icon = styled.span<{ $game: Game }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 32px;
  height: 32px;

  font-size: 17px;
  color: #fff;

  background-color: ${({ theme, $game }) => accentOf($game, theme)};
  border-radius: 50%;
`;

export const Name = styled.h2`
  flex: 1;
  margin: 0;

  font-size: 1.15rem;
  font-weight: 800;
`;

export const Go = styled(IoChevronForward)`
  flex-shrink: 0;
  opacity: 0.6;
`;

export const Blurb = styled.p`
  margin: 0;

  font-size: 0.85rem;
  font-weight: 600;
  line-height: 1.35;
  opacity: 0.92;
`;

export const Modes = styled.p`
  margin: 0;

  font-size: 0.72rem;
  font-weight: 700;
  opacity: 0.6;
`;

export const Statuses = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-top: auto;
  padding-top: 4px;
`;

export const TodayLabel = styled.span`
  font-size: 0.72rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  opacity: 0.6;
`;

function statusColour(state: DailyState, theme: DefaultTheme): string {
  switch (state) {
    case "won":
      return theme.green;
    case "lost":
      return theme.red;
    case "playing":
      return theme.orange;
    default:
      return "rgba(255, 255, 255, 0.12)";
  }
}

export const Status = styled.span<{ $state: DailyState }>`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 9px;

  font-size: 0.75rem;
  font-weight: 800;
  color: #fff;

  background-color: ${({ theme, $state }) => statusColour($state, theme)};
  border-radius: 999px;
`;

/** Which of a game's two puzzles, before how it went. */
export const StatusLabel = styled.span`
  &::after {
    content: "·";
    margin: 0 4px;
    opacity: 0.7;
  }
`;
