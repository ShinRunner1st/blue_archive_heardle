import styled from "styled-components";

import { PopUpCard } from "../PopUp";

/** A whole card that toggles its setting, switch on the right. */
export const Setting = styled(PopUpCard).attrs({ as: "button" })`
  align-items: center;

  font-family: inherit;
  text-align: left;
  color: ${({ theme }) => theme.text};

  cursor: pointer;

  &:hover {
    border-color: rgba(241, 247, 237, 0.22);
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.border};
    outline-offset: 2px;
  }
`;

/** A card with its options laid out under the text. */
export const Stack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
  flex: 1;
`;

/** Pick-one options, side by side. */
export const Choices = styled.div`
  display: flex;
  gap: 4px;
  padding: 3px;

  background-color: rgba(0, 0, 0, 0.18);
  border-radius: 10px;
`;

export const Choice = styled.button<{ $active: boolean }>`
  flex: 1;
  padding: 7px 8px;

  font-family: inherit;
  font-size: 0.82rem;
  font-weight: 700;
  color: ${({ theme }) => theme.text};
  white-space: nowrap;

  background-color: ${({ theme, $active }) =>
    $active ? theme.green : "transparent"};
  border: none;
  border-radius: 8px;
  cursor: pointer;

  transition: background-color 0.2s ease;

  &:hover {
    background-color: ${({ theme, $active }) =>
      $active ? theme.green : "rgba(241, 247, 237, 0.08)"};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.border};
    outline-offset: 1px;
  }
`;
