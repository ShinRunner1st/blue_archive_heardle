import styled, { css, keyframes } from "styled-components";
import "@fontsource-variable/nunito-sans";

import { Verdict } from "../../helpers/studentClues";

export { ClearButton, LiveRegion } from "../Search/index.styled";

/** Softer than the theme's pure red, so a table of misses isn't glaring. */
const VERDICT_COLOURS: Record<Verdict, string> = {
  right: "#3FA553",
  close: "#D9A21B",
  wrong: "#B8433C",
};

export const Wrapper = styled.div`
  font-family: "Nunito Sans Variable";

  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;

  width: 100%;
`;

/** The search box with the give-up button beside it. */
export const SearchRow = styled.div`
  display: flex;
  gap: 8px;

  width: 100%;
`;

export const SearchBox = styled.div`
  position: relative;
  flex: 1;
  min-width: 0;
`;

export const InputField = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;

  height: 45px;
  padding: 0 15px;

  color: ${({ theme }) => theme.text};
  background-color: ${({ theme }) => theme.background1};
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 5px;

  @media (max-width: 768px) {
    height: 38px;
  }
`;

export const Input = styled.input`
  flex: 1;
  min-width: 0;
  height: 100%;

  font-family: inherit;
  font-size: 1rem;
  color: ${({ theme }) => theme.text};

  background: transparent;
  border: none;
  outline: none !important;
`;

/** Under the box, over the table: the table is below, the box on top. */
export const Results = styled.div`
  position: absolute;
  top: calc(100% + 2px);
  left: 0;
  right: 0;
  z-index: 2;

  display: flex;
  flex-direction: column;

  max-height: min(344px, 55vh);
  overflow-y: auto;

  border-radius: 5px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
`;

export const Result = styled.div<{ $focused: boolean }>`
  display: flex;
  align-items: center;
  gap: 10px;

  flex-shrink: 0;
  min-height: 43px;
  padding: 4px 12px;

  color: ${({ theme }) => theme.text};
  background-color: ${({ theme, $focused }) =>
    $focused ? theme.background100 : theme.background1};
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 5px;

  cursor: pointer;
  user-select: none;

  &:hover {
    background-color: ${({ theme }) => theme.background100};
  }
`;

export const ResultName = styled.span`
  display: flex;
  flex-direction: column;
  min-width: 0;

  font-size: 0.95rem;
  font-weight: 700;
  line-height: 1.2;
`;

export const ResultFullName = styled.span`
  font-size: 0.72rem;
  font-weight: 600;
  opacity: 0.6;
`;

export const Hint = styled.p`
  margin: 0;

  font-size: 0.8rem;
  font-weight: 700;
  text-align: center;
  text-shadow: #000 1px 0 10px;
  opacity: 0.85;

  /* As in the OST player's hint. */
  kbd {
    font-family: inherit;
    font-size: 0.7rem;
    font-weight: 700;

    padding: 1px 6px;
    border: 1px solid currentColor;
    border-radius: 4px;
    opacity: 0.9;
  }
`;

/**
 * The guesses, newest on top. On a phone the columns are wider than the
 * screen, so the table scrolls sideways inside its box, never the page.
 */
export const TableScroll = styled.div`
  width: 100%;
  overflow-x: auto;
  padding-bottom: 4px;
`;

/**
 * Columns share the width, down to a minimum that fits a short word; past
 * that, on a phone, the table overflows its box and scrolls.
 */
export const Table = styled.div<{ $columns: number }>`
  display: grid;
  grid-template-columns: 58px repeat(
      ${({ $columns }) => $columns},
      minmax(62px, 1fr)
    );
  gap: 4px;

  width: 100%;
`;

export const HeadCell = styled.div`
  padding: 0 2px 2px;

  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.4px;
  text-align: center;
  text-transform: uppercase;
  text-shadow: #000 1px 0 8px;

  border-bottom: 2px solid ${({ theme }) => theme.border};
`;

const flipIn = keyframes`
  from {
    opacity: 0;
    transform: rotateX(90deg);
  }
  to {
    opacity: 1;
    transform: rotateX(0);
  }
`;

/** Each cell of a new guess turns over in order, left to right. */
const reveal = ($delay: number) => css`
  animation: ${flipIn} 0.35s ease-out both;
  animation-delay: ${$delay}ms;
`;

export const StudentCell = styled.div<{ $delay?: number }>`
  position: relative;

  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;

  min-height: 60px;
  padding: 3px 2px;

  font-size: 0.62rem;
  font-weight: 800;
  line-height: 1.1;
  text-align: center;
  overflow-wrap: anywhere;

  background-color: ${({ theme }) => theme.background1};
  border: 1px solid ${({ theme }) => theme.border100};
  border-radius: 6px;

  ${({ $delay }) => $delay !== undefined && reveal($delay)}
`;

export const ClueCell = styled.div<{ $verdict: Verdict; $delay?: number }>`
  position: relative;

  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;

  min-height: 60px;
  padding: 4px 3px;

  font-size: 0.72rem;
  font-weight: 800;
  line-height: 1.15;
  text-align: center;
  text-shadow: rgba(0, 0, 0, 0.55) 0 1px 3px;
  overflow-wrap: anywhere;

  background-color: ${({ $verdict }) => VERDICT_COLOURS[$verdict]};
  border: 1px solid rgba(0, 0, 0, 0.35);
  border-radius: 6px;

  ${({ $delay }) => $delay !== undefined && reveal($delay)}
`;

/** Long gift names are smaller, to fit a phone's column. */
export const LongText = styled.span`
  font-size: 0.6rem;
`;

export const Arrow = styled.span`
  font-size: 0.95rem;
  line-height: 1;
`;

/** The cake by a student whose birthday it is today. */
export const Cake = styled.span`
  position: absolute;
  top: -6px;
  right: -4px;

  font-size: 0.85rem;
`;

export const Legend = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 6px 14px;

  font-size: 0.72rem;
  font-weight: 700;
  text-shadow: #000 1px 0 8px;
`;

export const LegendItem = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
`;

export const Swatch = styled.span<{ $verdict: Verdict }>`
  width: 11px;
  height: 11px;

  background-color: ${({ $verdict }) => VERDICT_COLOURS[$verdict]};
  border-radius: 3px;
`;

/** The answer, once the round is over. */
export const AnswerCard = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;

  width: 100%;
  max-width: 420px;
  padding: 12px 16px;

  background-color: ${({ theme }) => theme.surface};
  border: 1px solid rgba(241, 247, 237, 0.12);
  border-radius: 12px;
  backdrop-filter: blur(6px);
`;

export const AnswerText = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
`;

export const AnswerName = styled.span`
  font-size: 1.15rem;
  font-weight: 800;
`;

export const AnswerMeta = styled.span`
  font-size: 0.82rem;
  font-weight: 600;
  opacity: 0.75;
`;

/** A row of the table: its cells sit in the table's own grid. */
export const Row = styled.div`
  display: contents;
`;
