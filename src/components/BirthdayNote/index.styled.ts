import styled from "styled-components";
import "@fontsource-variable/nunito-sans";

/** As tall as the switches above it (33 px), so the rows line up. */
export const Note = styled.p`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;

  flex-shrink: 0;
  box-sizing: border-box;
  width: fit-content;
  max-width: calc(100% - 32px);
  height: 33px;
  margin: 10px auto 0;
  padding: 0 14px 0 3px;

  font-family: "Nunito Sans Variable";
  font-size: 0.9rem;
  font-weight: 800;
  line-height: 1.2;
  text-align: center;
  white-space: nowrap;

  background-color: rgba(0, 0, 0, 0.3);
  border: 1px solid ${({ theme }) => theme.border100};
  border-radius: 999px;

  @media (max-width: 480px) {
    font-size: 0.8rem;
  }
`;

/** One line, cut short with "…" when several birthdays meet a phone. */
export const Text = styled.span`
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const Portraits = styled.span`
  display: flex;
  flex-shrink: 0;

  & > * + * {
    margin-left: -8px;
  }
`;

/** The portrait's face, in a circle: SchaleDB's are busts, face at the top. */
export const Portrait = styled.img`
  display: block;
  box-sizing: border-box;
  width: 27px;
  height: 27px;

  object-fit: cover;
  object-position: 50% 12%;

  background-color: rgba(241, 247, 237, 0.15);
  border: 1px solid ${({ theme }) => theme.border100};
  border-radius: 50%;
`;
