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

/** The eight albums, four to a row. */
export const Badges = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
`;

export const Badge = styled.div<{ $done: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 5px;

  padding: 6px;

  background-color: ${({ theme }) => theme.surface};
  border: 1px solid
    ${({ $done }) => ($done ? "#f5c542" : "rgba(241, 247, 237, 0.09)")};
  border-radius: 10px;
  box-shadow: ${({ $done }) =>
    $done ? "0 0 12px rgba(245, 197, 66, 0.45)" : "none"};
`;

/** Grey and dim until earned, in full colour after. */
export const Cover = styled.img<{ $done: boolean }>`
  display: block;
  width: 100%;
  aspect-ratio: 1;

  border-radius: 6px;
  filter: ${({ $done }) => ($done ? "none" : "grayscale(1) brightness(0.55)")};
`;

export const BadgeLabel = styled.span`
  display: flex;
  justify-content: space-between;
  align-items: baseline;

  font-size: 0.78rem;
  font-weight: 700;
`;

export const BadgeCount = styled.span`
  font-size: 0.72rem;
  font-weight: 600;
  opacity: 0.8;
  font-variant-numeric: tabular-nums;
`;

export const BadgeTrack = styled.div`
  height: 4px;
  overflow: hidden;

  background-color: rgba(241, 247, 237, 0.12);
  border-radius: 999px;
`;

export const BadgeFill = styled.div`
  height: 100%;

  background-color: ${({ theme }) => theme.green};
  border-radius: 999px;

  transition: width 0.4s ease;
`;

export const BadgeHint = styled.p`
  margin: 8px 0 0;

  font-size: 0.78rem;
  text-align: center;
  opacity: 0.7;
`;
