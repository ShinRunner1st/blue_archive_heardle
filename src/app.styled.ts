import styled from "styled-components";
import "@fontsource-variable/nunito-sans";

export const Container = styled.main`
  font-family: "Nunito Sans Variable";

  width: 40%;
  max-width: 600px;

  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;

  height: fit-content;
  margin: auto;
  padding: 20px 0;

  @media (max-width: 768px) {
    width: 90%;
    padding: 0 0;
  }
`;

/**
 * The artwork is painted by a fixed pseudo-element rather than by the wrapper
 * itself. A `position: fixed` wrapper would take the whole page out of flow and
 * make anything past the first viewport unreachable.
 */
export const BG = styled.div`
  position: relative;

  min-height: 100vh;
  width: 100%;

  display: flex;
  flex-direction: column;

  &::before {
    content: "";

    position: fixed;
    inset: 0;
    z-index: -1;

    background-image: url(${({ theme }) => theme.backgroundImage});
    background-position: center;
    background-repeat: no-repeat;
    background-size: cover;
  }
`;
