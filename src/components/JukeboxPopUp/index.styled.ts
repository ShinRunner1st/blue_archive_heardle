import styled from "styled-components";
import { IoVolumeHigh } from "react-icons/io5";

import { slimScrollbar } from "../PopUp/scrollbar";

export {
  ArtistTag,
  Chip,
  NameCell,
  SongName,
  ThemeNo,
} from "../SongListPopUp/index.styled";

/** The album chips, which all fit on a line or two. */
export const Shelves = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;

  width: 100%;
  margin: 0 0 10px;
  padding: 3px;
`;

/** Holds the now-playing card's place before a song is picked. */
export const Idle = styled.p`
  box-sizing: border-box;
  width: 100%;
  margin: 0 0 12px;
  padding: 18px 12px;

  font-size: 0.9rem;
  text-align: center;
  opacity: 0.75;

  background-color: ${({ theme }) => theme.background1};
  border-radius: 8px;
`;

/** The card sits flush in the pop-up rather than floating on the page. */
export const Playing = styled.div`
  width: 100%;

  section {
    width: 100%;
    margin: 0 0 12px;
    box-shadow: none;
  }
`;

/** Scrolls on its own, like the All OST list, so the player stays in view. */
export const List = styled.div`
  box-sizing: border-box;
  width: 100%;
  max-height: min(45vh, 420px);
  overflow-y: auto;
  overscroll-behavior: contain;

  background-color: ${({ theme }) => theme.background1};
  border-radius: 8px;

  && {
    flex-shrink: 1;
    min-height: 160px;
  }

  ${slimScrollbar}
`;

/** One grid for every row, so the number and artist columns line up. */
export const Songs = styled.ul`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;

  margin: 0;
  padding: 4px;
  list-style: none;

  li {
    display: grid;
    grid-column: 1 / -1;
    grid-template-columns: subgrid;
  }
`;

export const ShelfHeading = styled.h3`
  grid-column: 1 / -1;

  display: flex;
  align-items: baseline;
  gap: 8px;

  margin: 12px 10px 4px;

  font-size: 0.85rem;
  font-weight: 800;
  color: lightblue;
`;

export const ShelfTitle = styled.span`
  flex: 1;
  min-width: 0;

  font-weight: 600;
  opacity: 0.75;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const ShelfCount = styled.span`
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  opacity: 0.75;
`;

/**
 * Songs guessed right stand out and the rest are dimmed. There is no third
 * look for songs missed: that would show what is left in the endless bag.
 */
export const SongButton = styled.button<{
  $bright: boolean;
  $selected: boolean;
}>`
  display: grid;
  grid-column: 1 / -1;
  grid-template-columns: subgrid;
  align-items: center;
  column-gap: 8px;

  width: 100%;
  padding: 9px 10px;

  font-family: inherit;
  font-size: 0.95rem;
  font-weight: ${({ $bright }) => ($bright ? 700 : 400)};
  text-align: left;
  color: ${({ theme }) => theme.text};

  background-color: ${({ theme, $selected }) =>
    $selected ? theme.background100 : "transparent"};
  border: none;
  border-radius: 5px;
  cursor: pointer;

  opacity: ${({ $bright, $selected }) => ($bright || $selected ? 1 : 0.5)};

  &:hover {
    opacity: 1;
    background-color: ${({ theme }) => theme.background100};
  }

  &:focus-visible {
    opacity: 1;
    outline: 2px solid ${({ theme }) => theme.border};
    outline-offset: -2px;
  }
`;

export const NowIcon = styled(IoVolumeHigh)`
  flex-shrink: 0;
  font-size: 16px;
  color: ${({ theme }) => theme.green};
`;
