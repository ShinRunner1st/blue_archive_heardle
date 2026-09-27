import styled, { css } from "styled-components";
import "@fontsource-variable/nunito-sans";

import { slimScrollbar } from "../PopUp/scrollbar";

const shadowText = css`
  text-shadow: #000000 1px 0 10px;
`;

export const Title = styled.h1`
  margin: 0 0 6px;

  font-family: "Nunito Sans Variable";
  text-align: center;
  text-wrap: balance;
  ${shadowText}
`;

export const Lead = styled.p`
  margin: 0 0 18px;

  font-family: "Nunito Sans Variable";
  font-size: 0.95rem;
  font-weight: 700;
  text-align: center;
  text-wrap: balance;
  ${shadowText}
`;

/** The start screen's settings, on a card like the now-playing one. */
export const Card = styled.section`
  box-sizing: border-box;
  width: min(560px, 100%);
  padding: 16px 18px;

  font-family: "Nunito Sans Variable";
  color: ${({ theme }) => theme.text};

  background-color: ${({ theme }) => theme.background1}e6;
  border: 1px solid ${({ theme }) => theme.background100};
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
`;

export const Setting = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px 12px;

  & + & {
    margin-top: 14px;
    padding-top: 14px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
  }
`;

export const SettingText = styled.div`
  display: flex;
  flex-direction: column;
  min-width: 0;
`;

export const SettingName = styled.span`
  font-size: 0.95rem;
  font-weight: 800;
`;

export const SettingHint = styled.span`
  font-size: 0.8rem;
  opacity: 0.7;
`;

export const Options = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`;

/** A switch that is a whole row's control, like the header menu's. */
export const Toggle = styled.button`
  display: flex;
  padding: 4px;

  background: none;
  border: none;
  border-radius: 999px;
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.border};
    outline-offset: 2px;
  }
`;

export const Note = styled.p`
  margin: 14px 0 0;

  font-family: "Nunito Sans Variable";
  font-size: 0.85rem;
  font-weight: 700;
  text-align: center;
  text-wrap: balance;
  opacity: 0.9;
  ${shadowText}
`;

export const Buttons = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 12px 16px;

  width: 100%;
  margin-top: 18px;
`;

/** The clock and the score, above the player during a run. */
export const Status = styled.div`
  display: grid;
  grid-template-columns: auto 1fr auto auto;
  align-items: center;
  gap: 12px;

  width: 100%;
  margin-bottom: 10px;

  font-family: "Nunito Sans Variable";
  font-weight: 800;
  font-variant-numeric: tabular-nums;
`;

export const Clock = styled.span<{ $low: boolean; $paused: boolean }>`
  min-width: 3.2em;

  font-size: 1.6rem;
  color: ${({ theme, $low }) => ($low ? theme.red : theme.text)};
  opacity: ${({ $paused }) => ($paused ? 0.6 : 1)};
  ${shadowText}
`;

export const TimeTrack = styled.div`
  height: 10px;
  overflow: hidden;

  background-color: rgba(0, 0, 0, 0.3);
  border: 1px solid ${({ theme }) => theme.border100};
  border-radius: 999px;
`;

export const TimeFill = styled.div<{ $low: boolean }>`
  height: 100%;

  background-color: ${({ theme, $low }) => ($low ? theme.red : theme.blue)};
  border-radius: inherit;
`;

export const Score = styled.span`
  font-size: 1.3rem;
  color: lightgreen;
  ${shadowText}
`;

/** Ends the run early, straight to how it went. */
export const Quit = styled.button`
  padding: 4px 12px;

  font-family: inherit;
  font-size: 0.8rem;
  font-weight: 800;
  color: ${({ theme }) => theme.text};

  background-color: rgba(0, 0, 0, 0.25);
  border: 1px solid ${({ theme }) => theme.red};
  border-radius: 999px;
  cursor: pointer;

  transition: background-color 0.15s ease;

  &:hover {
    background-color: ${({ theme }) => theme.red};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.border};
    outline-offset: 2px;
  }
`;

/** How the last answer went: a line that changes with every song. */
export const Feedback = styled.p<{ $right: boolean | null }>`
  min-height: 1.4em;
  margin: 0 0 10px;

  font-family: "Nunito Sans Variable";
  font-size: 0.95rem;
  font-weight: 800;
  text-align: center;
  color: ${({ $right, theme }) =>
    $right === null ? theme.text : $right ? "lightgreen" : "#ff8a8a"};
  ${shadowText}
`;

export const PlayButtons = styled.div`
  display: flex;
  justify-content: space-between;

  width: 100%;
  margin-top: 5%;
`;

/** The songs of the run just played, right and wrong. */
export const Songs = styled.ol`
  box-sizing: border-box;
  width: min(560px, 100%);
  max-height: 260px;
  margin: 16px 0 0;
  padding: 6px;
  overflow-y: auto;
  overscroll-behavior: contain;

  font-family: "Nunito Sans Variable";
  list-style: none;

  background-color: ${({ theme }) => theme.background1}e6;
  border: 1px solid ${({ theme }) => theme.background100};
  border-radius: 12px;

  ${slimScrollbar}
`;

export const SongRow = styled.li`
  display: grid;
  grid-template-columns: 1.5em minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;

  padding: 6px 8px;
  font-size: 0.9rem;

  & + & {
    border-top: 1px solid rgba(255, 255, 255, 0.06);
  }
`;

export const Mark = styled.span<{ $right: boolean }>`
  font-weight: 800;
  text-align: center;
  color: ${({ $right }) => ($right ? "lightgreen" : "#ff8a8a")};
`;

export const SongName = styled.span`
  min-width: 0;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

export const SongArtist = styled.span`
  font-size: 0.75rem;
  font-weight: 700;
  color: lightblue;
  white-space: nowrap;
`;
