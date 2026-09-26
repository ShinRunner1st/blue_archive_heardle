import { css } from "styled-components";

/**
 * A slim rounded thumb instead of the browser's stock bar, for anything in a
 * pop-up that scrolls. The transparent border insets it from the edge, and the
 * track margin keeps it off rounded corners.
 */
export const slimScrollbar = css`
  &::-webkit-scrollbar {
    width: 12px;
  }

  &::-webkit-scrollbar-track {
    margin: 6px 0;
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    /* A long list would shrink the thumb to a dot otherwise. */
    min-height: 48px;
    background-color: rgba(255, 255, 255, 0.22);
    background-clip: padding-box;
    border: 3px solid transparent;
    border-radius: 999px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background-color: rgba(255, 255, 255, 0.38);
  }

  &::-webkit-scrollbar-thumb:active {
    background-color: ${({ theme }) => theme.green};
  }

  /* Firefox has no scrollbar pseudo-elements; this is its nearest match. */
  @supports not selector(::-webkit-scrollbar) {
    scrollbar-width: thin;
    scrollbar-color: rgba(255, 255, 255, 0.3) transparent;
  }
`;
