import styled from "styled-components";
import "@fontsource-variable/nunito-sans";

export const Container = styled.div`
  font-family: "Nunito Sans Variable";

  min-height: 100vh;
  padding: 24px;

  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;

  color: ${({ theme }) => theme.text};
  background-color: ${({ theme }) => theme.background1};
`;

export const Detail = styled.pre`
  max-width: 90vw;
  overflow-x: auto;

  padding: 12px;
  margin: 16px 0;

  font-size: 0.8rem;
  text-align: left;
  opacity: 0.7;

  background-color: rgba(0, 0, 0, 0.35);
  border-radius: 6px;
`;

export const Buttons = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  justify-content: center;

  margin-top: 8px;
`;
