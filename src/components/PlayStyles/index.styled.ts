import styled from "styled-components";
import "@fontsource-variable/nunito-sans";

/**
 * A smaller cousin of the header's Daily/Endless switch, for the ways to play
 * Endless. Equal columns, so the sliding pill is the same width everywhere.
 */
export const Styles = styled.div<{ $count: number; $compact: boolean }>`
  position: relative;
  display: grid;
  grid-template-columns: repeat(
    ${({ $count }) => $count},
    ${({ $compact }) => ($compact ? "auto" : "minmax(0, 1fr)")}
  );

  padding: 3px;

  font-family: "Nunito Sans Variable";

  background-color: rgba(0, 0, 0, 0.22);
  border: 1px solid ${({ theme }) => theme.border100};
  border-radius: 999px;
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
  transition: transform 0.32s cubic-bezier(0.34, 1.35, 0.5, 1),
    left 0.32s cubic-bezier(0.34, 1.35, 0.5, 1),
    width 0.32s cubic-bezier(0.34, 1.35, 0.5, 1);
`;

export const Style = styled.button<{ $active: boolean; $iconOnly: boolean }>`
  /* Above the sliding pill, which shares this space. */
  position: relative;
  z-index: 1;

  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 0;

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

  @media (max-width: 420px) {
    padding: ${({ $iconOnly }) => ($iconOnly ? "4px 7px" : "4px 6px")};
  }
`;

const HIDDEN = `
  display: inline-block;
  width: 0;
  margin-left: 0;
  overflow: hidden;
`;

/**
 * A label with an icon beside it gives way to the icon on a narrow screen,
 * where the four games' names leave the ways to play no room, and in a
 * compact switch everywhere but on the picked option. It keeps its line, at
 * no width, so the switch stays as tall as the others. A long label gives
 * way to its short one on a phone.
 */
export const Label = styled.span<{
  $hideable: boolean;
  $hidden: boolean;
}>`
  margin-left: ${({ $hideable }) => ($hideable ? "5px" : "0")};
  ${({ $hidden }) => ($hidden ? HIDDEN : "")}

  @media (max-width: 560px) {
    ${({ $hideable }) => ($hideable ? HIDDEN : "")}
  }

  /* Drawn from data-short, so the button's text stays the full label. */
  @media (max-width: 420px) {
    &[data-short] {
      font-size: 0;
    }

    &[data-short]::after {
      content: attr(data-short);
      font-size: 0.78rem;
    }
  }
`;

/** Holds a compact switch's label and, invisibly, every other one. */
export const Fit = styled.span`
  display: inline-grid;

  & > * {
    grid-area: 1 / 1;
    justify-self: center;
  }
`;

export const Ghost = styled.span`
  visibility: hidden;

  &::before {
    content: attr(data-label);
  }
`;
