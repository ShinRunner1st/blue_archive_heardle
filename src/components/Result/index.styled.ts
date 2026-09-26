import styled from "styled-components";
import "@fontsource-variable/nunito-sans";

export const CorrectResultTitle = styled.h1`
  font-family: "Nunito Sans Variable";
  color: lightgreen;
  text-shadow: #000000 1px 0 10px;
  text-align: center;
  text-wrap: balance;
  width: 100%;
  margin-top: 0;
`;

export const FailResultTitle = styled.h1`
  font-family: "Nunito Sans Variable";
  color: red;
  text-shadow: #000000 1px 0 10px;
  text-align: center;
  text-wrap: balance;
  width: 100%;
  margin-top: 0;
`;

export const Tries = styled.h4`
  font-family: "Nunito Sans Variable";
  text-shadow: #000000 1px 0 10px;
  text-align: center;
  text-wrap: balance;
  width: 100%;

  margin-top: 0;
`;

export const Score = styled.h2`
  font-family: "Nunito Sans Variable";
  text-shadow: #000000 1px 0 10px;
  text-align: center;
  text-wrap: balance;
  width: 100%;

  margin-top: 0;
  margin-bottom: 0;
`;

/** The endless win streak: a place unlocked, or the way to the next. */
export const Streak = styled.p`
  font-family: "Nunito Sans Variable";
  font-size: 0.95rem;
  font-weight: 700;
  text-shadow: #000000 1px 0 10px;
  text-align: center;
  text-wrap: balance;
  width: 100%;

  margin: 6px 0 0;
`;

export const Buttons = styled.div`
  font-family: "Nunito Sans Variable";

  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 16px;

  width: 100%;
  text-align: center;
  position: relative;
`;

/** Time until the next daily puzzle, standing in for the Next Song button. */
export const NextIn = styled.p`
  font-family: "Nunito Sans Variable";
  font-size: 0.95rem;
  font-weight: 700;
  color: ${({ theme }) => theme.text};
  opacity: 0.85;
  text-shadow: #000000 1px 0 10px;

  margin: 0 0 18px;
  text-align: center;
`;
