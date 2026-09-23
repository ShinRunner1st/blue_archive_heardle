import styled from "styled-components";
import "@fontsource-variable/nunito-sans";

export const Frame = styled.div`
  width: min(560px, 100%);
  margin: 5% 0;

  audio {
    display: block;
    width: 100%;
  }
`;

/**
 * Replaces the player when the file refuses to play, so the reveal says why
 * instead of showing controls that do nothing.
 */
export const Fallback = styled.p`
  margin: 0;
  padding: 12px;

  font-family: "Nunito Sans Variable";
  font-size: 0.9rem;
  line-height: 1.4;
  text-align: center;
  color: ${({ theme }) => theme.text};

  background-color: ${({ theme }) => theme.background100};
  border-radius: 4px;
`;
