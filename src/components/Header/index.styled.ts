import styled from "styled-components";
import "@fontsource-variable/nunito-sans";

export const Container = styled.header`
  font-family: "Nunito Sans Variable";
  display: flex;
  align-items: center;
  justify-content: center;

  width: 100%;

  border-bottom: 0.5px solid ${({ theme }) => theme.border};
  background-color: ${({ theme }) => theme.background100};

  margin-bottom: 15px;
`;

export const Content = styled.div`
  font-family: "Nunito Sans Variable";
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;

  width: 100%;
  max-width: 650px;
  padding: 0 16px;

  transition: transform 0.15s ease, opacity 0.15s ease;

  svg:hover {
    cursor: pointer;
    opacity: 0.8;
    transform: scale(1.08);
  }

  a {
    color: ${({ theme }) => theme.text};
  }

  .left-icons {
    display: flex;
    gap: 6px;
    justify-self: start;
    align-items: center;
    font-size: 40px;
  }

  .right-icon {
    display: flex;
    align-items: center;
    justify-self: end;
    font-size: 34px;
  }

  @media (max-width: 768px) {
    .left-icons {
      display: flex;
      gap: 6px;
      justify-self: start;
      align-items: center;
      font-size: 32px;
    }

    .right-icon {
      display: flex;
      align-items: center;
      justify-self: end;
      font-size: 26px;
    }
  }
`;

export const Logo = styled.img`
  height: 70px;
  width: auto;
  user-select: none;
  -webkit-touch-callout: none;

  filter: drop-shadow(0 0 2px white) drop-shadow(0 0 2px white)
    drop-shadow(0 0 2px white);

  @media (max-width: 768px) {
    height: 60px;
  }
`;

export const Title = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-self: center;
  text-align: center;
`;

export const Tagline = styled.h1`
  font-family: "Nunito Sans Variable";
  font-size: 14px;
  font-weight: 600;
  line-height: 1.2;
  margin: -4px 0 6px;
  color: ${({ theme }) => theme.text};
  opacity: 0.8;

  @media (max-width: 768px) {
    font-size: 12px;
  }
`;