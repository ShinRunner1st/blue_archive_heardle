import styled from "styled-components";

const GOLD = "#f5c542";

/** The games as tabs, wrapping onto a second row on a phone. */
export const Tabs = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 6px;

  width: 100%;
  margin-bottom: 10px;
`;

export const Tab = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;

  padding: 5px 11px;

  font: inherit;
  font-size: 0.82rem;
  font-weight: 800;
  color: ${({ $active, theme }) => ($active ? "#fff" : theme.text)};

  background-color: ${({ $active, theme }) =>
    $active ? theme.blue : theme.surface};
  border: 1px solid
    ${({ $active, theme }) =>
      $active ? theme.blue : "rgba(241, 247, 237, 0.12)"};
  border-radius: 999px;

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.border};
    outline-offset: 2px;
  }
`;

export const TabCount = styled.span<{ $all: boolean }>`
  font-size: 0.72rem;
  font-variant-numeric: tabular-nums;
  color: ${({ $all }) => ($all ? GOLD : "inherit")};
  opacity: ${({ $all }) => ($all ? 1 : 0.75)};
`;

export const List = styled.ul`
  display: flex;
  flex-direction: column;
  gap: 8px;

  width: 100%;
  margin: 0;
  padding: 0;

  list-style: none;
`;

/** A mission card: a blue edge while it's to do, gold once cleared. */
export const Mission = styled.li<{ $done: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 5px;

  padding: 10px 12px;

  background-color: ${({ theme }) => theme.surface};
  border: 1px solid
    ${({ $done }) => ($done ? GOLD : "rgba(241, 247, 237, 0.09)")};
  border-left: 4px solid ${({ $done, theme }) => ($done ? GOLD : theme.blue)};
  border-radius: 11px;
`;

export const Head = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 8px;
`;

export const Title = styled.span`
  font-size: 0.95rem;
  font-weight: 800;
`;

/** Slanted like the game's own stamps. */
export const Stamp = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;

  padding: 1px 8px;

  font-size: 0.72rem;
  font-weight: 900;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #2b2000;

  background-color: ${GOLD};
  border-radius: 4px;
  transform: skewX(-10deg);
`;

export const Count = styled.span`
  flex-shrink: 0;

  font-size: 0.78rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  opacity: 0.75;
`;

export const Text = styled.span`
  font-size: 0.82rem;
  line-height: 1.35;
  opacity: 0.85;
`;

export const Track = styled.div`
  height: 6px;
  overflow: hidden;

  background-color: rgba(255, 255, 255, 0.15);
  border-radius: 999px;
`;

export const Fill = styled.div`
  height: 100%;

  background-color: ${({ theme }) => theme.blue};
  border-radius: inherit;
`;

export const Unlock = styled.span<{ $done: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;

  font-size: 0.76rem;
  font-weight: 700;
  color: ${({ $done }) => ($done ? GOLD : "inherit")};
  opacity: ${({ $done }) => ($done ? 1 : 0.7)};
`;
