import styled from "styled-components";
import { IoChevronDown, IoSearch } from "react-icons/io5";

import { slimScrollbar } from "../PopUp/scrollbar";

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

/**
 * Our own clear button, like the main search's: the browser's built-in one
 * on a search box ignores the Blue Archive cursor.
 */
export const FilterClear = styled.button`
  display: flex;
  align-items: center;
  flex-shrink: 0;

  padding: 0;

  color: inherit;
  background: none;
  border: none;
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.border};
    outline-offset: 2px;
    border-radius: 4px;
  }
`;

/** Height of one chip, so "one row" below is an exact measurement. */
const CHIP_HEIGHT = 30;
const CHIP_GAP = 6;
/** Room for a focused chip's outline, which the fold would otherwise clip. */
const CHIP_PAD = 3;

/**
 * The artist chips wrap onto as many rows as they need, folded to one until
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
    $expanded ? "none" : `${CHIP_HEIGHT + CHIP_PAD * 2}px`};
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

/**
 * Scrolls on its own, so the filter stays in view above it. On a short screen
 * it gives up height first, down to a few rows, before the pop-up scrolls.
 */
export const List = styled.div`
  box-sizing: border-box;
  width: 100%;
  max-height: min(55vh, 480px);
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

export const Empty = styled.p`
  margin: 0;
  padding: 24px 12px;

  font-size: 0.9rem;
  text-align: center;
  opacity: 0.75;
`;
