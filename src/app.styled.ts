import styled from "styled-components";
import "@fontsource-variable/nunito-sans";

export const Container = styled.main<{ $top?: boolean }>`
  font-family: "Nunito Sans Variable";

  /*
   * One rule for every screen: a share of the window would leave a
   * half-width or split-screen desktop window narrower than a phone.
   */
  width: min(600px, 90%);

  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;

  height: fit-content;
  /*
   * Auto margins centre the play area between the header and the footer;
   * equal padding keeps it off both, so it sits in the middle rather than
   * low. The student game's table grows with every guess, so it starts at
   * the top instead, where its search box stays put.
   */
  margin: ${({ $top }) => ($top ? "0 auto auto" : "auto")};
  padding: 24px 0;

  @media (max-width: 768px) {
    padding: 16px 0;
  }
`;

/**
 * The page's wrapper, exactly the window's height: the page itself never
 * scrolls, so the header, the switches and the footer stay put, and a play
 * area taller than the window scrolls inside PlayArea instead. The artwork
 * behind it is painted by Backdrop's fixed layers rather than by the
 * wrapper.
 */
export const BG = styled.div`
  position: relative;

  height: 100vh;
  height: 100dvh;
  width: 100%;
  overflow: hidden;

  display: flex;
  flex-direction: column;
`;

/**
 * Everything between the switches and the footer, the window's full width
 * so the wheel works anywhere beside the game. It scrolls only when the
 * game is taller than the room left, as on a small laptop, with a thin bar.
 */
export const PlayArea = styled.div`
  flex: 1 1 auto;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: thin;
  scrollbar-color: rgba(241, 247, 237, 0.3) transparent;

  display: flex;
  flex-direction: column;
`;

/**
 * Holds the game switch and the ways to play, in one row under the header.
 * The row is as wide whatever it holds, so both stay put. Inside its padding
 * it is as wide as the play area, which three games and three ways to play
 * need.
 */
export const StyleBar = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;

  width: 100%;
  max-width: 632px;
  margin: 0 auto;
  padding: 16px 16px 0;

  @media (max-width: 768px) {
    padding-top: 12px;
  }
`;

/**
 * The ways to play, beside the game switch. It takes the rest of the row
 * whatever is in it, even nothing (OST daily), so neither switch ever moves,
 * and each way-to-play switch fills it, all the same width.
 */
export const StyleRow = styled.div`
  flex: 1 1 0;
  min-width: 0;
  min-height: 32px;

  & > * {
    width: 100%;
  }
`;
