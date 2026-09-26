import styled from "styled-components";

/** The header above her, and the footer she stands on. */
const HEADER = "88px";
const FOOTER = "30px";

/**
 * Stands on the footer in the middle of the space left of the play area, her
 * whole figure as tall as the room there allows. `--ratio` is her width over
 * her height.
 */
export const Stage = styled.div<{ $ready: boolean; $hidden: boolean }>`
  position: fixed;
  bottom: ${FOOTER};
  left: calc(25vw - 150px);
  z-index: 1;
  transform: translateX(-50%);

  display: ${({ $hidden }) => ($hidden ? "none" : "block")};
  height: min(
    calc(100vh - ${HEADER} - ${FOOTER} - 12px),
    calc((50vw - 332px) / var(--ratio))
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
