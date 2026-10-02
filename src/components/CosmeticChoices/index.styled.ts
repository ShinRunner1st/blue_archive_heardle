import styled from "styled-components";

export const Choice = styled.button<{ $active: boolean; $locked: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;

  padding: 5px 11px;

  font: inherit;
  font-size: 0.8rem;
  font-weight: 800;
  color: ${({ $active, theme }) => ($active ? "#fff" : theme.text)};

  background-color: ${({ $active, theme }) =>
    $active ? theme.blue : theme.surface};
  border: 1px solid
    ${({ $active, theme }) =>
      $active ? theme.blue : "rgba(241, 247, 237, 0.18)"};
  border-radius: 999px;
  opacity: ${({ $locked }) => ($locked ? 0.5 : 1)};
  cursor: ${({ $locked }) => ($locked ? "not-allowed" : "pointer")};

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.border};
    outline-offset: 2px;
  }
`;

export const Swatch = styled.span`
  width: 12px;
  height: 12px;
  border-radius: 50%;
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.6);
`;
