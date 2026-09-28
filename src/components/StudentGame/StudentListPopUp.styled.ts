import styled from "styled-components";

export const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(76px, 1fr));
  gap: 8px;

  width: 100%;
`;

export const Tile = styled.button`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;

  min-width: 0;
  padding: 6px 2px;

  font-family: inherit;
  color: inherit;

  background: none;
  border: 1px solid transparent;
  border-radius: 10px;
  cursor: pointer;

  transition: background-color 0.15s ease, transform 0.12s ease;

  &:hover:not(:disabled) {
    background-color: rgba(241, 247, 237, 0.08);
    border-color: rgba(241, 247, 237, 0.15);
  }

  &:active:not(:disabled) {
    transform: scale(0.95);
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.border};
    outline-offset: 1px;
  }

  /* Guessed already: there, so the grid doesn't shift, but faded. */
  &:disabled {
    opacity: 0.3;
    cursor: default;
  }
`;

/** Two lines at most, for costumes' longer names. */
export const Name = styled.span`
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;

  max-width: 100%;

  font-size: 0.7rem;
  font-weight: 700;
  line-height: 1.2;
  text-align: center;
  overflow-wrap: anywhere;
`;
