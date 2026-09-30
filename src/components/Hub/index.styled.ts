import styled, { DefaultTheme } from "styled-components";
import "@fontsource-variable/nunito-sans";
import { IoChevronForward } from "react-icons/io5";

import { Game } from "../../types/mode";
import { DailyState } from "../../helpers/todayResults";

type CardKind = Game | "multiplayer";

/** Each game's colour, for its card's icon and edge. */
function accentOf(game: CardKind, theme: DefaultTheme): string {
  switch (game) {
    case "multiplayer":
      return theme.gray;
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

/** Multiplayer's card, across the grid under the games'. */
export const WideItem = styled.li`
  grid-column: 1 / -1;
`;

export const Card = styled.a<{ $game: CardKind }>`
  /* Its own layer, so the picture and its shading sit behind the words
     but above the card's colour. */
  position: relative;
  isolation: isolate;
  overflow: hidden;

  display: flex;
  flex-direction: column;
  gap: 6px;
  box-sizing: border-box;
  height: 100%;
  padding: 14px 16px 12px;

  color: inherit;
  text-decoration: none;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.8);

  /* Shades the picture: solid where the words start, lighter to the right. */
  &::before {
    content: "";
    position: absolute;
    inset: 0;
    z-index: -1;
    background: linear-gradient(
      100deg,
      ${({ theme }) => theme.background1}f2 0%,
      ${({ theme }) => theme.background1}d0 50%,
      ${({ theme }) => theme.background1}70 100%
    );
  }

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

  &:hover img {
    transform: scale(1.05);
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

/** The card's picture, one of the game's scenes, behind its shading. */
export const Art = styled.img`
  position: absolute;
  inset: 0;
  z-index: -2;
  width: 100%;
  height: 100%;

  object-fit: cover;
  object-position: right center;

  transition: transform 0.4s ease;
`;

export const CardHead = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

export const Icon = styled.span<{ $game: CardKind }>`
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

/** The hub's other boxes, below the cards: a record, Global, birthdays. */
export const Panel = styled.section<{ $wide?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 10px;
  box-sizing: border-box;
  min-width: 0;
  padding: 12px 14px;

  background-color: ${({ theme }) => theme.background1}e6;
  border: 1px solid ${({ theme }) => theme.background100};
  border-radius: 12px;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.3);

  ${({ $wide }) => ($wide ? "width: 100%;" : "")}
`;

/** Global and birthdays side by side, or one across when it is alone. */
export const Panels = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  align-items: start;
  gap: 12px;
  width: 100%;

  &:empty {
    display: none;
  }

  @media (max-width: 560px) {
    gap: 8px;
  }
`;

export const PanelHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
`;

export const PanelTitle = styled.h2`
  margin: 0;

  font-size: 0.78rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  opacity: 0.75;
`;

export const PanelAction = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 10px;

  font-family: inherit;
  font-size: 0.75rem;
  font-weight: 800;
  color: ${({ theme }) => theme.text};

  background-color: rgba(241, 247, 237, 0.1);
  border: none;
  border-radius: 999px;
  cursor: pointer;

  &:hover {
    background-color: rgba(241, 247, 237, 0.18);
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.border};
    outline-offset: 2px;
  }
`;

export const Source = styled.a`
  font-size: 0.7rem;
  font-weight: 700;
  color: inherit;
  opacity: 0.55;

  &:hover {
    opacity: 0.9;
  }
`;

export const Tiles = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;

  @media (max-width: 480px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`;

export const Tile = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 4px;

  background-color: rgba(241, 247, 237, 0.06);
  border-radius: 8px;
`;

export const TileValue = styled.span`
  font-size: 1.15rem;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
`;

export const TileLabel = styled.span`
  font-size: 0.7rem;
  font-weight: 700;
  text-align: center;
  opacity: 0.65;
`;

export const Row = styled.div<{ $raid?: boolean }>`
  /* A raid's boss sits behind its words, in the row's own layer. */
  position: relative;
  isolation: isolate;

  display: flex;
  flex-direction: column;
  gap: 4px;
  ${({ $raid }) =>
    $raid ? "min-height: 52px; text-shadow: 0 1px 3px #000, 0 0 8px #000;" : ""}

  & + & {
    padding-top: 8px;
    border-top: 1px solid rgba(241, 247, 237, 0.08);
  }
`;

export const RowHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
`;

export const Kind = styled.span`
  font-size: 0.72rem;
  font-weight: 800;
  color: #6cb8ff;
`;

/** On a small dark pill, so it reads over a raid boss too. */
export const Ends = styled.span`
  padding: 1px 7px;

  font-size: 0.7rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  color: rgba(255, 255, 255, 0.75);

  background-color: rgba(0, 0, 0, 0.45);
  border-radius: 999px;
`;

export const RowText = styled.p`
  margin: 0;

  font-size: 0.85rem;
  font-weight: 700;
`;

/** The event's logo from the game, its name drawn in. */
export const EventLogo = styled.img`
  display: block;
  width: auto;
  max-width: 100%;
  height: 60px;
  object-fit: contain;
  object-position: left center;
`;

/** A raid boss's lobby picture, fading in from the left behind the row. */
export const Boss = styled.img`
  position: absolute;
  right: -14px;
  bottom: 0;
  z-index: -1;
  height: 100%;
  max-height: 72px;
  width: auto;

  opacity: 0.55;
  -webkit-mask-image: linear-gradient(to right, transparent, #000 55%);
  mask-image: linear-gradient(to right, transparent, #000 55%);
  pointer-events: none;
`;

export const Terrain = styled.span`
  font-weight: 600;
  opacity: 0.6;
`;

/** As many a row as fit, sharing it evenly: five fit beside birthdays. */
export const Pickup = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(48px, 1fr));
  gap: 8px 4px;
`;

export const PickupStudent = styled.span`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  min-width: 0;

  font-size: 0.66rem;
  font-weight: 700;
  line-height: 1.2;
  text-align: center;
`;

export const List = styled.ul`
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
`;

export const Birthday = styled.li`
  display: flex;
  align-items: center;
  gap: 10px;
`;

/** Keeps the names lined up where a portrait is missing. */
export const NoPortrait = styled.span`
  flex-shrink: 0;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background-color: rgba(241, 247, 237, 0.1);
`;

export const BirthdayName = styled.span`
  flex: 1;
  min-width: 0;

  font-size: 0.88rem;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

export const BirthdayDay = styled.span<{ $today: boolean }>`
  font-size: 0.75rem;
  font-weight: 800;
  white-space: nowrap;
  opacity: ${({ $today }) => ($today ? 1 : 0.65)};
  color: ${({ theme, $today }) => ($today ? theme.pink : "inherit")};
`;

/** Which server the student games follow, under the day's line. */
export const ServerRow = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;

  font-size: 0.8rem;
  font-weight: 700;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.9);
`;

export const ServerChoices = styled.div`
  display: inline-flex;
  gap: 2px;
  padding: 2px;

  background-color: rgba(0, 0, 0, 0.3);
  border: 1px solid ${({ theme }) => theme.border100};
  border-radius: 999px;
`;

export const ServerChoice = styled.button<{ $active: boolean }>`
  padding: 2px 12px;

  font-family: inherit;
  font-size: 0.78rem;
  font-weight: 800;
  color: ${({ theme }) => theme.text};
  text-shadow: none;

  background-color: ${({ theme, $active }) =>
    $active ? theme.blue : "transparent"};
  border: none;
  border-radius: 999px;
  cursor: pointer;
  opacity: ${({ $active }) => ($active ? 1 : 0.7)};

  &:hover {
    opacity: 1;
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.border};
    outline-offset: 2px;
  }
`;
