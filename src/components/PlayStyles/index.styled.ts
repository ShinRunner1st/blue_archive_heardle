import styled from "styled-components";
import "@fontsource-variable/nunito-sans";

/**
 * A smaller cousin of the header's Daily/Endless switch, for the ways to play
 * Endless. Equal columns, so the sliding pill is the same width everywhere.
 */
export const Styles = styled.div<{ $count: number }>`
  position: relative;
  display: grid;
  grid-template-columns: repeat(${({ $count }) => $count}, 1fr);

  margin: 0 auto 16px;
  padding: 3px;

  font-family: "Nunito Sans Variable";

  background-color: rgba(0, 0, 0, 0.22);
  border: 1px solid ${({ theme }) => theme.border100};
  border-radius: 999px;

  @media (max-width: 768px) {
    margin-bottom: 12px;
  }
`;

export const Thumb = styled.div<{ $index: number; $count: number }>`
  position: absolute;
  top: 3px;
  bottom: 3px;
  left: 3px;

  width: calc(
    ${({ $count }) => 100 / $count}% - ${({ $count }) => 6 / $count}px
  );

  background-color: ${({ theme }) => theme.blue};
  border-radius: 999px;

  transform: translateX(${({ $index }) => $index * 100}%);
  transition: transform 0.32s cubic-bezier(0.34, 1.35, 0.5, 1);
`;

export const Style = styled.button<{ $active: boolean }>`
  /* Above the sliding pill, which shares this space. */
  position: relative;
  z-index: 1;

  padding: 4px 14px;

  font-family: inherit;
  font-size: 0.78rem;
  font-weight: 700;
  white-space: nowrap;
  color: ${({ theme }) => theme.text};
  opacity: ${({ $active }) => ($active ? 1 : 0.65)};
  text-shadow: ${({ $active }) => ($active ? "none" : "#000 0 0 6px")};

  background: none;
  border: none;
  border-radius: 999px;
  cursor: pointer;

  transition: opacity 0.2s ease, transform 0.12s ease;

  &:hover {
    opacity: 1;
  }

  &:active {
    transform: scale(0.94);
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.border};
    outline-offset: 2px;
  }

  @media (max-width: 360px) {
    padding: 4px 10px;
  }
`;
