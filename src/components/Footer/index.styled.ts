import styled from "styled-components";
import "@fontsource-variable/nunito-sans";

/**
 * Sits in normal flow at the end of the page's flex column. It used to be
 * absolutely positioned with `z-index: -1`, which took it out of flow so the
 * main container overlapped it and, being behind, swallowed every click on the
 * link.
 */
export const Text = styled.footer`
  width: 100%;
  margin: 0;
  padding: 12px 0;

  font-family: "Nunito Sans Variable";
  text-align: center;

  color: ${({ theme }) => theme.text};
  background-color: ${({ theme }) => theme.background100};

  svg {
    vertical-align: -2px;
  }
`;

export const Link = styled.a`
  font-family: "Nunito Sans Variable";
  color: ${({ theme }) => theme.text};

  display: inline-flex;
  align-items: center;
  gap: 4px;

  text-underline-offset: 2px;

  &:hover {
    text-decoration: underline;
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.border};
    outline-offset: 3px;
    border-radius: 3px;
  }
`;
