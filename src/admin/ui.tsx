/**
 * The admin tool's own parts: a plain working layout in the game's colours,
 * so the editor reads apart from the previews, which are the game itself.
 */
import React from "react";
import styled, { css } from "styled-components";

export const Shell = styled.div`
  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }

  display: grid;
  grid-template-rows: auto auto 1fr;
  height: 100vh;
  background: ${({ theme }) => theme.background1};
  color: ${({ theme }) => theme.text};
  font-family: "Nunito Sans Variable", sans-serif;
  font-size: 14px;
`;

export const TopBar = styled.header`
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 10px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
`;

export const Brand = styled.div`
  font-weight: 800;
  font-size: 16px;
  white-space: nowrap;

  span {
    font-weight: 600;
    opacity: 0.6;
    margin-left: 6px;
  }
`;

export const Tabs = styled.nav`
  display: flex;
  gap: 4px;
  flex: 1;
  overflow-x: auto;
`;

export const Tab = styled.button<{ $active: boolean }>`
  font: inherit;
  font-weight: 700;
  color: inherit;
  padding: 7px 12px;
  border-radius: 6px;
  border: none;
  background: ${({ $active, theme }) =>
    $active ? theme.background100 : "transparent"};
  opacity: ${({ $active }) => ($active ? 1 : 0.7)};
  cursor: pointer;
  white-space: nowrap;

  &:hover {
    opacity: 1;
  }
`;

export const Body = styled.div`
  display: grid;
  grid-template-columns: 300px minmax(380px, 1fr) minmax(420px, 1.15fr);
  min-height: 0;
`;

export const Column = styled.section`
  min-height: 0;
  overflow-y: auto;
  padding: 14px 16px 40px;
  border-right: 1px solid rgba(255, 255, 255, 0.12);

  &:last-child {
    border-right: none;
  }
`;

export const Heading = styled.h2`
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 14px 0 8px;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  opacity: 0.75;

  &:first-child {
    margin-top: 0;
  }

  > :last-child:not(:first-child) {
    margin-left: auto;
  }
`;

export const List = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 4px;
`;

export const Item = styled.li<{ $active?: boolean; $faded?: boolean }>`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 6px 6px 10px;
  border-radius: 6px;
  background: ${({ $active, theme }) =>
    $active ? theme.background100 : "rgba(255, 255, 255, 0.04)"};
  outline: ${({ $active, theme }) =>
    $active ? `1px solid ${theme.border}` : "none"};
  opacity: ${({ $faded }) => ($faded ? 0.6 : 1)};
`;

export const ItemButton = styled.button`
  flex: 1;
  min-width: 0;
  font: inherit;
  color: inherit;
  text-align: left;
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;

  strong,
  small {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  small {
    opacity: 0.6;
    font-size: 12px;
  }
`;

const buttonLook = css<{ $variant?: "primary" | "danger" | "plain" }>`
  font: inherit;
  font-weight: 700;
  color: ${({ theme }) => theme.text};
  border: none;
  border-radius: 6px;
  padding: 7px 12px;
  cursor: pointer;
  white-space: nowrap;
  background: ${({ $variant, theme }) =>
    $variant === "primary"
      ? theme.green
      : $variant === "danger"
      ? "#c0392b"
      : "rgba(255, 255, 255, 0.1)"};

  &:hover:not(:disabled) {
    filter: brightness(1.12);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.border};
    outline-offset: 2px;
  }
`;

export const Button = styled.button.attrs({ type: "button" })<{
  $variant?: "primary" | "danger" | "plain";
}>`
  ${buttonLook}
`;

/** A small square button for a list's ↑ ↓ ✕. */
export const IconButton = styled.button.attrs({ type: "button" })<{
  $variant?: "primary" | "danger" | "plain";
}>`
  ${buttonLook}
  padding: 3px 7px;
  font-size: 12px;
  line-height: 1.4;
`;

export const Badge = styled.span<{ $tone?: "new" | "kept" | "retired" }>`
  font-size: 11px;
  font-weight: 800;
  padding: 1px 6px;
  border-radius: 4px;
  white-space: nowrap;
  background: ${({ $tone, theme }) =>
    $tone === "new"
      ? theme.blue
      : $tone === "retired"
      ? "rgba(255, 255, 255, 0.18)"
      : "rgba(77, 187, 96, 0.35)"};
`;

const FieldBox = styled.label`
  display: grid;
  gap: 4px;
  margin-bottom: 12px;

  > span:first-child {
    font-weight: 700;
    font-size: 13px;
  }
`;

export const Hint = styled.small`
  display: block;
  opacity: 0.65;
  font-size: 12px;
  line-height: 1.4;
`;

/** A labelled field, with a line of help under it. */
export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <FieldBox>
      <span>{label}</span>
      {children}
      {hint && <Hint>{hint}</Hint>}
    </FieldBox>
  );
}

const inputLook = css`
  font: inherit;
  color: ${({ theme }) => theme.text};
  background: rgba(0, 0, 0, 0.28);
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 6px;
  padding: 7px 9px;
  width: 100%;

  &:focus {
    outline: 2px solid ${({ theme }) => theme.blue};
    outline-offset: 0;
  }

  &:read-only {
    opacity: 0.65;
  }
`;

export const Input = styled.input`
  ${inputLook}
`;

export const TextArea = styled.textarea`
  ${inputLook}
  resize: vertical;
  min-height: 64px;
  line-height: 1.4;
`;

export const Select = styled.select`
  ${inputLook}

  option {
    background: ${({ theme }) => theme.background1};
  }
`;

export const Check = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  font-weight: 700;
`;

export const Row = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
`;

export const Note = styled.div<{ $tone?: "warn" | "bad" | "good" }>`
  margin: 0 0 12px;
  padding: 8px 10px;
  border-radius: 6px;
  line-height: 1.45;
  background: ${({ $tone }) =>
    $tone === "bad"
      ? "rgba(255, 77, 77, 0.2)"
      : $tone === "warn"
      ? "rgba(255, 165, 0, 0.18)"
      : $tone === "good"
      ? "rgba(77, 187, 96, 0.22)"
      : "rgba(255, 255, 255, 0.07)"};
`;

export const Card = styled.div`
  padding: 10px;
  margin-bottom: 10px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
`;

export const Empty = styled.p`
  opacity: 0.6;
  margin: 24px 0;
  text-align: center;
`;

/** Problems the checks found, worded as what to do. */
export function Problems({ messages }: { messages: string[] }) {
  if (messages.length === 0) return null;
  return (
    <Note $tone="bad" role="alert">
      {messages.map((message) => (
        <span key={message} style={{ display: "block" }}>
          {message}
        </span>
      ))}
    </Note>
  );
}
