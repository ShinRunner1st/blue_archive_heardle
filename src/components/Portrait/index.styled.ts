import styled from "styled-components";

/** SchaleDB's portraits are busts, so the face is near the top. */
export const Portrait = styled.img`
  display: block;
  flex-shrink: 0;
  box-sizing: border-box;

  object-fit: cover;
  object-position: 50% 12%;

  background-color: rgba(241, 247, 237, 0.15);
  border: 1px solid ${({ theme }) => theme.border100};
  border-radius: 50%;
`;
