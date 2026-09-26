import styled from "styled-components";
import "@fontsource-variable/nunito-sans";

/**
 * Sits in normal flow at the end of the page's flex column. It used to be
 * absolutely positioned with `z-index: -1`, which took it out of flow so the
 * main container overlapped it and, being behind, swallowed every click on the
 * link.
 */
export const Text = styled.footer`
  /* Over the character, who stands at the bottom of the window. */
  position: relative;
  z-index: 2;

  width: 100%;
  margin: 0;
  padding: 6px 0;

  font-family: "Nunito Sans Variable";
  font-size: 0.85rem;
  line-height: 1.3;
  text-align: center;

  color: ${({ theme }) => theme.text};
  background-color: ${({ theme }) => theme.background100};
  /* See-through, so she shows behind it, blurred enough to keep it legible. */
  background-color: color-mix(
    in srgb,
    ${({ theme }) => theme.background100} 50%,
    transparent
  );
  -webkit-backdrop-filter: blur(6px);
  backdrop-filter: blur(6px);

  svg {
    vertical-align: -2px;
  }
`;

/**
 * Inline like the words around it, so it sits on the same line of text; a
 * flex box would centre it on its own box instead and ride a little high.
 */
export const Link = styled.a`
  font-family: "Nunito Sans Variable";
  color: ${({ theme }) => theme.text};

  text-underline-offset: 2px;

  svg {
    margin-right: 4px;
  }

  &:hover {
    text-decoration: underline;
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.border};
    outline-offset: 3px;
    border-radius: 3px;
  }
`;
