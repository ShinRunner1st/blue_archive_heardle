import styled from "styled-components";

/** One column, as wide as a game's play area, read top to bottom. */
export const Page = styled.article`
  display: flex;
  flex-direction: column;
  gap: 12px;
  box-sizing: border-box;
  width: 100%;
  max-width: 632px;
  padding: 16px 18px 20px;

  line-height: 1.55;

  background-color: ${({ theme }) => theme.background1}e6;
  border: 1px solid ${({ theme }) => theme.background100};
  border-radius: 12px;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.3);

  @media (max-width: 480px) {
    padding: 14px 14px 18px;
  }
`;

export const Title = styled.h1`
  margin: 0;

  font-size: 1.45rem;
  font-weight: 900;
`;

export const Updated = styled.p`
  margin: -6px 0 0;

  font-size: 0.8rem;
  opacity: 0.7;
`;

export const Section = styled.section`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

export const Heading = styled.h2`
  margin: 6px 0 0;

  font-size: 1.02rem;
  font-weight: 800;
  color: ${({ theme }) => theme.blue};
`;

export const Text = styled.p`
  margin: 0;
`;

export const List = styled.ul`
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 0;
  padding-left: 20px;
`;

export const Link = styled.a`
  font-weight: 700;
  color: inherit;
  text-decoration: underline;
  text-underline-offset: 2px;
`;
