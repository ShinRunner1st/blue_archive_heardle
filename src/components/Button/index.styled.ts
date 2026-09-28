import styled from "styled-components";
import { theme } from "../../constants";
import "@fontsource-variable/nunito-sans";

/** Transient ($) props: styled-components keeps them off the <button>. */
interface ButtonProps {
  $variant?: keyof typeof theme;
  disabled?: boolean;
  $stroke?: boolean;
}

export const Button = styled.button<ButtonProps>`
  font-family: "Nunito Sans Variable";
  background-color: ${({ theme, $variant }) =>
    $variant ? theme[$variant] : theme.background100};

  border-radius: 5px;
  border: ${({ theme, $stroke }) =>
    $stroke ? `1px solid ${theme.border}` : "none"};

  color: ${({ theme }) => theme.text};
  font-size: 1rem;
  font-weight: 800;

  width: max-content;
  padding: 12.5px 20px;

  opacity: ${({ disabled }) => (disabled ? 0.4 : 1)};
  cursor: ${({ disabled }) => (disabled ? "not-allowed" : "pointer")};

  transition: transform 0.15s ease, opacity 0.15s ease;
  &:hover {
    transform: scale(${({ disabled }) => (disabled ? 1 : 1.08)});
    opacity: 0.8;
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.border};
    outline-offset: 3px;
  }
`;
