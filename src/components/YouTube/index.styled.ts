import styled from "styled-components";
import "@fontsource-variable/nunito-sans";

export const Frame = styled.div`
  position: relative;

  margin: 5% 0;

  /* Reserves the player's box so the layout doesn't jump when it loads. */
  line-height: 0;
`;

/**
 * A YouTube iframe paints black until its player boots. This sits ON TOP of it
 * until onReady fires - deliberately an overlay rather than styling the iframe,
 * because hiding the iframe itself (opacity, display, visibility, zero size)
 * makes YouTube refuse to load it.
 */
export const Placeholder = styled.div`
  position: absolute;
  inset: 0;
  z-index: 1;

  display: flex;
  align-items: center;
  justify-content: center;

  font-family: "Nunito Sans Variable";
  font-size: 0.9rem;
  line-height: 1.4;
  color: ${({ theme }) => theme.text};

  background-color: ${({ theme }) => theme.background100};
  border-radius: 4px;

  animation: pulse 1.2s ease-in-out infinite;

  @keyframes pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.75;
    }
  }
`;

/**
 * Replaces the reveal when the video refuses to play, so the answer still has a
 * way to be heard instead of a black box that never resolves.
 */
export const Fallback = styled.div`
  position: absolute;
  inset: 0;
  z-index: 1;

  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;

  padding: 12px;

  font-family: "Nunito Sans Variable";
  font-size: 0.9rem;
  line-height: 1.4;
  text-align: center;
  color: ${({ theme }) => theme.text};

  background-color: ${({ theme }) => theme.background100};
  border-radius: 4px;

  p {
    margin: 0;
  }

  a {
    color: ${({ theme }) => theme.text};
    font-weight: 700;
  }
`;
