import styled from "styled-components";
import "@fontsource-variable/nunito-sans";

export const Container = styled.main`
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
   * low.
   */
  margin: auto;
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
 * Holds the game switch, and the ways to play it, in one place under the
 * header. The two sit side by side, or one above the other on a phone.
 */
export const StyleBar = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px 10px;

  padding: 16px 16px 0;

  @media (max-width: 768px) {
    padding-top: 12px;
  }
`;
