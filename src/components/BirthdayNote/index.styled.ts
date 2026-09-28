import styled from "styled-components";
import "@fontsource-variable/nunito-sans";

export const Note = styled.p`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;

  width: fit-content;
  max-width: calc(100% - 32px);
  margin: 12px auto 0;
  padding: 4px 14px;

  font-family: "Nunito Sans Variable";
  font-size: 0.85rem;
  font-weight: 800;
  text-align: center;
  text-wrap: balance;

  background-color: rgba(0, 0, 0, 0.3);
  border: 1px solid ${({ theme }) => theme.border100};
  border-radius: 999px;
`;

export const Icons = styled.span`
  display: flex;
  flex-shrink: 0;

  & > * + * {
    margin-left: -6px;
  }

  & > * {
    border: 1px solid ${({ theme }) => theme.border100};
    border-radius: 50%;
  }
`;
