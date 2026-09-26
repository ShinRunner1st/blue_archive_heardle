import styled from "styled-components";

const GOLD = "#f5c542";

/** One album to a row: cover, name and how far along it is. */
export const Shelf = styled.ul`
  display: flex;
  flex-direction: column;
  gap: 8px;

  width: 100%;
  margin: 0;
  padding: 0;

  list-style: none;
`;

export const Badge = styled.li<{ $done: boolean }>`
  display: flex;
  gap: 12px;
  align-items: center;

  padding: 8px 12px 8px 8px;

  background-color: ${({ theme }) => theme.surface};
  border: 1px solid
    ${({ $done }) => ($done ? GOLD : "rgba(241, 247, 237, 0.09)")};
  border-radius: 11px;
  box-shadow: ${({ $done }) =>
    $done ? "0 0 12px rgba(245, 197, 66, 0.35)" : "none"};
`;

/** Grey and dim until earned, in full colour after. */
export const Cover = styled.img<{ $done: boolean }>`
  display: block;
  flex-shrink: 0;
  width: 56px;
  height: 56px;

  object-fit: cover;
  border-radius: 7px;
  filter: ${({ $done }) => ($done ? "none" : "grayscale(1) brightness(0.55)")};
`;

export const Info = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;

  flex: 1;
  min-width: 0;
`;

export const Name = styled.span`
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 8px;

  font-size: 0.92rem;
  font-weight: 800;
`;

export const Count = styled.span<{ $done: boolean }>`
  font-size: 0.78rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: ${({ $done, theme }) => ($done ? GOLD : theme.text)};
  opacity: ${({ $done }) => ($done ? 1 : 0.75)};
`;

/** The album's subtitle, cut short rather than wrapped on narrow screens. */
export const Album = styled.span`
  overflow: hidden;

  font-size: 0.74rem;
  font-style: italic;
  white-space: nowrap;
  text-overflow: ellipsis;
  opacity: 0.65;
`;

export const Track = styled.div`
  height: 5px;
  overflow: hidden;

  background-color: rgba(241, 247, 237, 0.12);
  border-radius: 999px;
`;

export const Fill = styled.div<{ $done: boolean }>`
  height: 100%;

  background-color: ${({ $done, theme }) => ($done ? GOLD : theme.green)};
  border-radius: 999px;

  transition: width 0.4s ease;
`;
