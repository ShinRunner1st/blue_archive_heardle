import styled from "styled-components";
import "@fontsource-variable/nunito-sans";

export const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;

  width: 100%;
  margin-top: 5%;

  @media (max-width: 480px) {
    grid-template-columns: minmax(0, 1fr);
    gap: 8px;
  }
`;

export type ChoiceTone = "open" | "right" | "wrong" | "other";

export const Choice = styled.button<{ $tone: ChoiceTone }>`
  display: flex;
  align-items: center;
  gap: 10px;

  box-sizing: border-box;
  width: 100%;
  min-height: 64px;
  padding: 10px 12px;

  font-family: "Nunito Sans Variable";
  text-align: left;
  color: ${({ theme }) => theme.text};

  background-color: ${({ theme }) => theme.background100};
  border: 1px solid
    ${({ theme, $tone }) =>
      $tone === "right"
        ? theme.green
        : $tone === "wrong"
        ? theme.red
        : theme.border};
  border-width: ${({ $tone }) =>
    $tone === "right" || $tone === "wrong" ? "2px" : "1px"};
  border-radius: 8px;
  cursor: pointer;

  opacity: ${({ $tone }) => ($tone === "other" ? 0.55 : 1)};
  transition: transform 0.12s ease, background-color 0.15s ease;

  &:hover:not(:disabled) {
    background-color: ${({ theme }) => theme.background1};
    transform: scale(1.02);
  }

  &:active:not(:disabled) {
    transform: scale(0.98);
  }

  &:disabled {
    cursor: default;
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.border};
    outline-offset: 2px;
  }

  @media (max-width: 480px) {
    min-height: 54px;
  }
`;

/** The key that picks it, 1 to 4. */
export const Key = styled.kbd`
  flex-shrink: 0;

  display: inline-flex;
  align-items: center;
  justify-content: center;

  width: 24px;
  height: 24px;

  font-family: inherit;
  font-size: 0.8rem;
  font-weight: 800;

  background-color: rgba(0, 0, 0, 0.25);
  border-radius: 6px;
`;

export const Text = styled.span`
  display: flex;
  flex-direction: column;
  min-width: 0;
`;

export const Name = styled.span`
  font-size: 0.95rem;
  font-weight: 800;
  line-height: 1.25;
  overflow-wrap: anywhere;
`;

export const Artist = styled.span`
  margin-top: 2px;

  font-size: 0.78rem;
  font-weight: 700;
  color: lightblue;
`;
