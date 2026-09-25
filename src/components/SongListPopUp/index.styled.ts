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

export const Group = styled.section`
  & + & {
    margin-top: 4px;
  }
`;

/** Stays pinned while its songs scroll past, so the artist is always known. */
export const Artist = styled.h3`
  position: sticky;
  top: 0;
  z-index: 1;

  display: flex;
  align-items: baseline;
  justify-content: space-between;

  margin: 0;
  padding: 8px 12px 6px;

  font-size: 0.8rem;
  font-weight: 800;
  letter-spacing: 0.6px;
  text-transform: uppercase;
  color: lightblue;

  background-color: ${({ theme }) => theme.background1};
  border-bottom: 1px solid ${({ theme }) => theme.background100};
`;

export const ArtistCount = styled.span`
  font-weight: 600;
  color: ${({ theme }) => theme.text};
  opacity: 0.6;
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

export const Empty = styled.p`
  margin: 0;
  padding: 24px 12px;

  font-size: 0.9rem;
  text-align: center;
  opacity: 0.75;
`;
