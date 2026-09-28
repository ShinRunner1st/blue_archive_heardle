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
 * The page's wrapper. The artwork behind it is painted by Backdrop's fixed
 * layers rather than by the wrapper: a `position: fixed` wrapper would take
 * the whole page out of flow and make anything past the first viewport
 * unreachable.
 */
export const BG = styled.div`
  position: relative;

  min-height: 100vh;
  width: 100%;

  display: flex;
  flex-direction: column;
`;

/**
 * Holds the game switch and the ways to play, in one row under the header.
 * The row is as wide whatever it holds, so both stay put.
 */
export const StyleBar = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;

  width: 100%;
  max-width: 540px;
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
