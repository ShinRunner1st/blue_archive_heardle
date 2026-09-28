import styled, { css } from "styled-components";

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

/** Buttons side by side under a card's text. */
export const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const action = css<{ $tone?: "red" }>`
  flex: 1;
  padding: 8px 12px;

  font-family: inherit;
  font-size: 0.85rem;
  font-weight: 700;
  color: ${({ theme }) => theme.text};
  text-align: center;
  white-space: nowrap;

  background-color: ${({ theme, $tone }) =>
    $tone ? theme[$tone] : "rgba(241, 247, 237, 0.1)"};
  border: none;
  border-radius: 8px;
  cursor: pointer;

  transition: opacity 0.2s ease;

  &:hover {
    opacity: 0.8;
  }
`;

export const Action = styled.button<{ $tone?: "red" }>`
  ${action}

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.border};
    outline-offset: 2px;
  }
`;

/**
 * A label that opens the file picker. The input inside is hidden from sight
 * but not from the keyboard, so Tab reaches it and the ring shows here.
 */
export const FileAction = styled.label<{ $tone?: "red" }>`
  ${action}

  position: relative;

  input {
    position: absolute;
    width: 1px;
    height: 1px;
    opacity: 0;
    overflow: hidden;
    clip-path: inset(50%);
  }

  &:has(input:focus-visible) {
    outline: 2px solid ${({ theme }) => theme.border};
    outline-offset: 2px;
  }
`;

export const Notice = styled.p`
  margin: 0;

  font-size: 0.82rem;
  line-height: 1.45;
`;

/** The name for shared pictures. */
export const NameInput = styled.input`
  box-sizing: border-box;
  width: 100%;
  height: 38px;
  padding: 0 12px;

  font-family: inherit;
  font-size: 0.95rem;
  color: ${({ theme }) => theme.text};

  background-color: rgba(0, 0, 0, 0.18);
  border: 1px solid rgba(241, 247, 237, 0.22);
  border-radius: 8px;

  &::placeholder {
    color: ${({ theme }) => theme.text};
    opacity: 0.5;
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.border};
    outline-offset: 2px;
  }
`;

/** Turns the "Sensei" before the name on pictures on or off. */
export const NameToggle = styled.button`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;

  width: 100%;
  padding: 4px 0 0;

  font-family: inherit;
  font-size: 0.85rem;
  font-weight: 700;
  text-align: left;
  color: inherit;

  background: none;
  border: none;
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.border};
    outline-offset: 2px;
    border-radius: 6px;
  }
`;

/** How the name will read, under the switch's label. */
export const NameExample = styled.span`
  display: block;

  font-size: 0.75rem;
  font-weight: 600;
  opacity: 0.6;
`;
