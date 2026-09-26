import styled from "styled-components";

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
