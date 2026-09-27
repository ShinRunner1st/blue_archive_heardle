import styled from "styled-components";

import { Theme } from "../../constants/theme";

export const Rows = styled.div`
  display: flex;
  flex-direction: column;
  gap: 7px;

  width: 100%;
`;

export const Row = styled.div`
  display: grid;
  grid-template-columns: 14px 1fr 26px;
  gap: 10px;
  align-items: center;

  width: 100%;
`;

export const RowLabel = styled.span`
  font-size: 0.82rem;
  font-weight: 800;
  text-align: center;
  opacity: 0.75;
`;

export const RowCount = styled.span`
  font-size: 0.82rem;
  font-weight: 700;
  text-align: right;
  font-variant-numeric: tabular-nums;
`;

/** Track the bar grows along, so empty rows still read as a row. */
export const Track = styled.div`
  width: 100%;
  height: 16px;

  background-color: rgba(241, 247, 237, 0.08);
  border-radius: 4px;
  overflow: hidden;
`;

export const Progress = styled.div<{
  $value: number;
  $maxValue: number;
  $animate: boolean;
}>`
  /* maxValue is 0 until the first round finishes; without the guard the square
     root of 0/0 renders as "NaN%". */
  width: ${({ $animate, $value, $maxValue }) =>
    $animate && $maxValue > 0
      ? `${Math.max(Math.sqrt($value / $maxValue) * 100, $value > 0 ? 6 : 0)}%`
      : "0%"};

  height: 100%;

  background-color: ${({ theme }) => theme.green};
  border-radius: 4px;

  transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
`;

export const BadProgress = styled(Progress)`
  background-color: ${({ theme }) => theme.red};
`;

export const Tiles = styled.div<{ $columns: number }>`
  display: grid;
  grid-template-columns: repeat(${({ $columns }) => $columns}, 1fr);
  gap: 10px;

  width: 100%;
`;

export const Tile = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;

  padding: 12px 10px;

  background-color: ${({ theme }) => theme.surface};
  border: 1px solid rgba(241, 247, 237, 0.09);
  border-radius: 11px;
`;

export const TileValue = styled.span`
  font-size: 1.25rem;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
`;

export const TileLabel = styled.span`
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.9px;
  text-transform: uppercase;
  opacity: 0.55;
`;

export const Calendar = styled.div`
  width: 100%;
`;

export const CalendarHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;

  margin-bottom: 8px;
`;

export const MonthName = styled.span`
  font-size: 0.92rem;
  font-weight: 800;
`;

export const MonthButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;

  width: 30px;
  height: 30px;

  font-size: 16px;
  color: ${({ theme }) => theme.text};

  background-color: rgba(241, 247, 237, 0.08);
  border: none;
  border-radius: 8px;
  cursor: pointer;

  &:hover:not(:disabled) {
    background-color: rgba(241, 247, 237, 0.16);
  }

  &:disabled {
    opacity: 0.3;
    cursor: default;
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.border};
    outline-offset: 2px;
  }
`;

export const Grid = styled.table`
  width: 100%;
  border-collapse: separate;
  border-spacing: 4px;
  table-layout: fixed;

  td {
    padding: 0;
  }
`;

export const Weekday = styled.th`
  padding-bottom: 2px;

  font-size: 0.68rem;
  font-weight: 700;
  opacity: 0.55;
`;

export type DayTone =
  | "best"
  | "good"
  | "close"
  | "lost"
  | "missed"
  | "open"
  | "none";

/** The day's colour. Hex alpha on the theme colours keeps both schemes right. */
const fill = (theme: Theme, tone: DayTone): string => {
  switch (tone) {
    case "best":
      return theme.green;
    case "good":
      return `${theme.green}a6`;
    case "close":
      return `${theme.green}59`;
    case "lost":
      return `${theme.red}b3`;
    case "missed":
      return "rgba(241, 247, 237, 0.07)";
    default:
      return "transparent";
  }
};

export const Day = styled.span<{ $tone: DayTone; $today?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;

  aspect-ratio: 1;
  max-height: 40px;
  margin: 0 auto;

  font-size: 0.78rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;

  background-color: ${({ theme, $tone }) => fill(theme, $tone)};
  border: 2px solid
    ${({ theme, $today }) => ($today ? theme.border : "transparent")};
  border-radius: 8px;
  opacity: ${({ $tone }) => ($tone === "none" ? 0.3 : 1)};
`;

/** Read out by screen readers, never shown. */
export const Hidden = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
`;

export const Legend = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 6px 12px;

  margin-top: 8px;

  font-size: 0.72rem;
  opacity: 0.75;
`;

export const LegendItem = styled.span`
  display: flex;
  align-items: center;
  gap: 5px;
`;

export const Swatch = styled.span<{ $tone: DayTone }>`
  width: 11px;
  height: 11px;

  background-color: ${({ theme, $tone }) => fill(theme, $tone)};
  border-radius: 3px;
`;
