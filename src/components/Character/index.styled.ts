import styled from "styled-components";

/**
 * The whole column left of the play area, from under the header to the
 * bottom of the window: she is framed inside it (see FRAME), her face high
 * and her legs running on behind the footer.
 */
export const Stage = styled.div<{ $ready: boolean; $hidden: boolean }>`
  position: fixed;
  top: 88px;
  bottom: 0;
  left: 0;
  z-index: 1;

  display: ${({ $hidden }) => ($hidden ? "none" : "block")};
  /* Up to the play area (600px wide, centred), less a small gap. */
  width: calc(50vw - 316px);

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
