import styled from "styled-components";

/** Below the header. */
const HEADER = "88px";

/**
 * Stands in the middle of the space left of the play area, 88% as tall as
 * the room there allows: company, not a centrepiece. Centred in the height
 * under the header, so she stands high rather than sunk to the bottom; the
 * cut at her knees fades away. `--ratio` is her width over her height.
 */
export const Stage = styled.div<{ $ready: boolean; $hidden: boolean }>`
  --height: calc(
    0.88 * min(calc(100vh - ${HEADER}), calc((50vw - 332px) / var(--ratio)))
  );

  position: fixed;
  top: calc(${HEADER} + (100vh - ${HEADER} - var(--height)) / 2);
  left: calc(25vw - 150px);
  z-index: 1;
  transform: translateX(-50%);

  display: ${({ $hidden }) => ($hidden ? "none" : "block")};
  height: var(--height);
  aspect-ratio: var(--ratio);

  mask-image: linear-gradient(to bottom, black 82%, transparent);

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
