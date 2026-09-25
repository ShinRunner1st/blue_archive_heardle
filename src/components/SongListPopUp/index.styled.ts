import styled from "styled-components";
import { IoCheckmarkCircle, IoSearch } from "react-icons/io5";

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
 * One row of artist chips. It scrolls sideways rather than wrapping, so on a
 * phone it stays a single line; the fade on the right hints there is more.
 */
export const Artists = styled.div`
  display: flex;
  gap: 6px;

  width: 100%;
  margin-top: 10px;
  padding: 2px 24px 4px 2px;
  overflow-x: auto;
  scrollbar-width: none;

  mask-image: linear-gradient(to right, #000 calc(100% - 28px), transparent);

  &::-webkit-scrollbar {
    display: none;
  }
`;

export const Chip = styled.button<{ $active: boolean }>`
  flex-shrink: 0;

  display: inline-flex;
  align-items: center;
  gap: 5px;

  padding: 5px 11px;

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

export const Count = styled.p`
  align-self: flex-start;
  margin: 8px 0 6px;

  font-size: 0.8rem;
  opacity: 0.7;
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

export const Songs = styled.ul`
  margin: 0;
  padding: 4px;
  list-style: none;
`;

export const SongButton = styled.button<{
  $selected: boolean;
  $guessed: boolean;
}>`
  display: flex;
  align-items: center;
  gap: 8px;

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
 * The song's artist, small, at the end of the row. Fixed width so the tags
 * line up down the list whatever the artist's name.
 */
export const ArtistTag = styled.span`
  flex-shrink: 0;
  box-sizing: border-box;
  width: 76px;
  padding: 2px 6px;

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
    width: 66px;
  }
`;

export const Empty = styled.p`
  margin: 0;
  padding: 24px 12px;

  font-size: 0.9rem;
  text-align: center;
  opacity: 0.75;
`;
