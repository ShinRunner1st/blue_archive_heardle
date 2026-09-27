import styled from "styled-components";
import "@fontsource-variable/nunito-sans";

export const Buttons = styled.div`
  font-family: "Nunito Sans Variable";
  margin-top: 5%;
  display: flex;
  justify-content: space-between;
  width: 100%;
`;

/** The 4-Choice clip length, above the player. */
export const ClipRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 8px 12px;

  width: 100%;
  margin-bottom: 14px;

  font-family: "Nunito Sans Variable";
`;

export const ClipLabel = styled.span`
  font-size: 0.85rem;
  font-weight: 800;
  text-shadow: #000000 1px 0 10px;
`;
