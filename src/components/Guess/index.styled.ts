import styled from "styled-components";
import "@fontsource-variable/nunito-sans";

export const Container = styled.div<{
  $active: boolean;
  $isCorrect: boolean | undefined;
  $closeHint: boolean;
}>`
  font-family: "Nunito Sans Variable";
  width: 100%;
  height: 45px;

  @media (max-width: 768px) {
    height: 36px;
  }

  margin: 5px auto;

  display: flex;
  align-items: center;

  border-color: ${({ theme, $active, $isCorrect, $closeHint }) => {
    if ($isCorrect === true) return theme.green;
    if ($active) return theme.border;
    if ($isCorrect === false && $closeHint) return theme.orange;
    if ($isCorrect === false) return theme.red;
    return theme.border100;
  }};
  border-width: 1px;
  border-radius: 5px;
  border-style: solid;
  background-color: ${({ theme }) => theme.background100};

  color: ${({ theme }) => theme.text};
`;

export const Text = styled.p`
  font-family: "Nunito Sans Variable";
  width: 100%;
  height: max-content;

  padding: 0px 10px;
  white-space: nowrap;
  overflow: hidden;
  font-size: 0.9rem;
  color: ${({ theme }) => theme.text};
`;

/** Keeps the theme tag off the row's right edge. */
export const TagSlot = styled.span`
  display: flex;
  padding-right: 10px;
`;
