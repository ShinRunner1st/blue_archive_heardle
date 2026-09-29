import styled from "styled-components";
import "@fontsource-variable/nunito-sans";

export const Note = styled.p`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;

  width: fit-content;
  max-width: calc(100% - 32px);
  margin: 10px auto 0;
  padding: 4px 18px 4px 4px;

  font-family: "Nunito Sans Variable";
  font-size: 1rem;
  font-weight: 800;
  text-align: center;
  text-wrap: balance;

  background-color: rgba(0, 0, 0, 0.3);
  border: 1px solid ${({ theme }) => theme.border100};
  border-radius: 999px;

  @media (max-width: 480px) {
    font-size: 0.9rem;
  }
`;

export const Portraits = styled.span`
  display: flex;
  flex-shrink: 0;

  & > * + * {
    margin-left: -10px;
  }
`;

/** The portrait's face, in a circle: SchaleDB's are busts, face at the top. */
export const Portrait = styled.img`
  display: block;
  width: 40px;
  height: 40px;

  object-fit: cover;
  object-position: 50% 12%;

  background-color: rgba(241, 247, 237, 0.15);
  border: 2px solid ${({ theme }) => theme.border100};
  border-radius: 50%;
`;
