import styled from "styled-components";

/**
 * Stands in the middle of the space left of the play area, as tall as the
 * window allows without spilling into it. `--ratio` is the character's
 * width over her height.
 */
export const Stage = styled.div<{ $ready: boolean }>`
  position: fixed;
  bottom: 0;
  left: calc(25vw - 150px);
  z-index: 1;
  transform: translateX(-50%);

  /* 88% of the room there is: she reads as company, not a centrepiece. */
  height: calc(
    0.88 * min(calc(100vh - 88px), calc((50vw - 332px) / var(--ratio)))
  );
  aspect-ratio: var(--ratio);

  /* Fades in once her files are in, rather than popping. */
  opacity: ${({ $ready }) => ($ready ? 1 : 0)};
  transition: opacity 0.4s ease;

  canvas {
    display: block;
    width: 100%;
    height: 100%;
    /* Drags pat and look; they must not scroll the page on touch. */
    touch-action: none;
  }
`;
