import styled from "styled-components";
import { IoCheckmarkCircle, IoChevronDown, IoSearch } from "react-icons/io5";

export const Filter = styled.label`
  display: flex;
  align-items: center;
  gap: 10px;

  box-sizing: border-box;
  width: 100%;
  height: 42px;
  padding: 0 12px;

  background-color: ${({ theme }) => theme.background1};
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 6px;

  &:focus-within {
    outline: 2px solid ${({ theme }) => theme.border};
    outline-offset: 2px;
  }
`;

export const FilterIcon = styled(IoSearch)`
  flex-shrink: 0;
  font-size: 18px;
`;

export const FilterInput = styled.input`
  flex: 1;
  min-width: 0;
  height: 100%;

  font-family: inherit;
  font-size: 1rem;
  color: ${({ theme }) => theme.text};

  background: transparent;
  border: none;
  outline: none;

  &::placeholder {
    color: ${({ theme }) => theme.text};
    opacity: 0.55;
  }
`;

/** Height of one chip, so "two rows" below is an exact measurement. */
const CHIP_HEIGHT = 30;
const CHIP_GAP = 6;
/** Room for a focused chip's outline, which the fold would otherwise clip. */
const CHIP_PAD = 3;

/**
 * The artist chips wrap onto as many rows as they need, folded to two until
 * the player asks for the rest - so any number of artists fits.
 */
export const Artists = styled.div<{ $expanded: boolean }>`
  display: flex;
  flex-wrap: wrap;
  gap: ${CHIP_GAP}px;

  width: 100%;
  margin-top: ${10 - CHIP_PAD}px;
  padding: ${CHIP_PAD}px;

  max-height: ${({ $expanded }) =>
    $expanded ? "none" : `${CHIP_HEIGHT * 2 + CHIP_GAP + CHIP_PAD * 2}px`};
  overflow: hidden;
`;

export const Chip = styled.button<{ $active: boolean }>`
  flex-shrink: 0;

  display: inline-flex;
  align-items: center;
  gap: 5px;

  height: ${CHIP_HEIGHT}px;
  padding: 0 11px;

  font-family: inherit;
  font-size: 0.8rem;
  font-weight: 700;
  white-space: nowrap;
  color: ${({ theme }) => theme.text};

  background-color: ${({ theme, $active }) =>
    $active ? theme.green : theme.background1};
  border: 1px solid
    ${({ theme, $active }) =>
      $active ? theme.green : "rgba(255, 255, 255, 0.2)"};
  border-radius: 999px;
  cursor: pointer;

  transition: background-color 0.15s ease, border-color 0.15s ease;

  &:hover {
    border-color: ${({ theme }) => theme.border};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.border};
    outline-offset: 2px;
  }
`;

export const ChipCount = styled.span`
  font-weight: 600;
  opacity: 0.7;
`;

/** The result count, with the artists toggle beside it. */
export const Summary = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;

  width: 100%;
  margin: 6px 0;
`;

export const Count = styled.p`
  margin: 0;

  font-size: 0.8rem;
  opacity: 0.7;
`;

export const MoreButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;

  padding: 2px 4px;

  font-family: inherit;
  font-size: 0.8rem;
  font-weight: 700;
  color: lightblue;

  background: none;
  border: none;
  border-radius: 4px;
  cursor: pointer;

  &:hover {
    text-decoration: underline;
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.border};
    outline-offset: 2px;
  }
`;

export const MoreIcon = styled(IoChevronDown)<{ $expanded: boolean }>`
  transform: rotate(${({ $expanded }) => ($expanded ? "180deg" : "0")});
  transition: transform 0.2s ease;
`;

/** Scrolls on its own, so the filter stays in view above it. */
export const List = styled.div`
  box-sizing: border-box;
  width: 100%;
  max-height: min(55vh, 480px);
  overflow-y: auto;
  overscroll-behavior: contain;

  background-color: ${({ theme }) => theme.background1};
  border-radius: 8px;
`;

/**
 * A grid shared by every row (each row is a subgrid), so the number and artist
 * columns size themselves to their widest entry and line up down the list.
 */
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

export const SongButton = styled.button<{
  $selected: boolean;
  $guessed: boolean;
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
  text-align: left;
  color: ${({ theme }) => theme.text};

  background-color: ${({ theme, $selected }) =>
    $selected ? theme.background100 : "transparent"};
  border: none;
  border-radius: 5px;
  cursor: pointer;

  opacity: ${({ $guessed }) => ($guessed ? 0.5 : 1)};

  &:hover {
    background-color: ${({ theme }) => theme.background100};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.border};
    outline-offset: -2px;
  }
`;

export const NameCell = styled.span`
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
`;

export const SongName = styled.span`
  flex: 1;
  min-width: 0;
`;

export const Tag = styled.span`
  flex-shrink: 0;
  padding: 1px 6px;

  font-size: 0.7rem;
  font-weight: 700;

  border: 1px solid currentColor;
  border-radius: 4px;
`;

export const Check = styled(IoCheckmarkCircle)`
  flex-shrink: 0;
  font-size: 18px;
  color: ${({ theme }) => theme.green};
`;

export const ThemeNo = styled.span`
  flex-shrink: 0;
  min-width: 2.5ch;

  font-size: 0.8rem;
  font-variant-numeric: tabular-nums;
  text-align: right;
  opacity: 0.55;
`;

/**
 * The song's artist, small, at the end of the row. Its column is as wide as
 * the longest name in view, capped so a very long one can't squeeze out the
 * song name - that one is shortened, with the full name on hover.
 */
export const ArtistTag = styled.span`
  justify-self: stretch;
  box-sizing: border-box;
  max-width: 9rem;
  padding: 2px 8px;

  font-size: 0.68rem;
  font-weight: 700;
  line-height: 1.4;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: lightblue;

  background-color: rgba(255, 255, 255, 0.08);
  border-radius: 999px;

  @media (max-width: 480px) {
    max-width: 6.5rem;
  }
`;

export const Empty = styled.p`
  margin: 0;
  padding: 24px 12px;

  font-size: 0.9rem;
  text-align: center;
  opacity: 0.75;
`;
