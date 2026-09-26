import styled, { keyframes } from "styled-components";

const fadeIn = keyframes`
  from {
    opacity: 0;
  }
`;

/**
 * One picture filling the window behind the page. Fixed rather than on the
 * page itself: a fixed page would take everything out of flow.
 */
export const Layer = styled.div<{ $src: string; $fade: boolean }>`
  position: fixed;
  inset: 0;
  z-index: -1;

  background-image: url(${({ $src }) => $src});
  background-position: center;
  background-repeat: no-repeat;
  background-size: cover;

  animation: ${({ $fade }) => ($fade ? fadeIn : "none")} 0.9s ease both;
`;
