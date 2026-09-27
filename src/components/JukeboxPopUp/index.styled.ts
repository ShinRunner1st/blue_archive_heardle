import styled from "styled-components";
import {
  IoRepeat,
  IoPlaySkipBack,
  IoPlaySkipForward,
  IoVolumeHigh,
} from "react-icons/io5";

import { slimScrollbar } from "../PopUp/scrollbar";

export {
  ArtistTag,
  Chip,
  ChipCount,
  Count,
  Empty,
  Filter,
  FilterIcon,
  FilterInput,
  NameCell,
  SongName,
  ThemeNo,
} from "../SongListPopUp/index.styled";
export {
  Art,
  Fill,
  NoteIcon,
  PauseIcon,
  PlayIcon,
  Seek,
  Thumb,
  Times,
  Track,
  Transport,
} from "../NowPlaying/index.styled";

/**
 * The player card. Every line is one line tall whatever the song, so the card
 * never changes height and the list below never moves under the pointer.
 */
export const Player = styled.section`
  box-sizing: border-box;
  width: 100%;
  margin-bottom: 12px;
  padding: 14px 16px 10px;

  background-color: ${({ theme }) => theme.background1};
  border: 1px solid ${({ theme }) => theme.background100};
  border-radius: 12px;
`;

export const PlayerHead = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

export const PlayerMeta = styled.div`
  flex: 1;
  min-width: 0;
`;

const oneLine = `
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

export const PlayerName = styled.p`
  margin: 0;

  font-size: 1.05rem;
  font-weight: 800;
  line-height: 1.35;
  color: lightblue;
  ${oneLine}
`;

export const PlayerArtist = styled.p`
  margin: 2px 0 0;

  font-size: 0.85rem;
  line-height: 1.35;
  opacity: 0.8;
  ${oneLine}
`;

/** The whole card's width, under the song. */
export const PlayerTimeline = styled.div`
  position: relative;
  margin-top: 12px;
`;

export const PlayerControls = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;

  margin-top: 4px;
`;

/** Turns auto-next on and off; green while on. */
export const AutoNext = styled.button<{ $on: boolean }>`
  flex-shrink: 0;

  display: inline-flex;
  align-items: center;
  gap: 4px;

  margin-left: 4px;
  padding: 4px 9px;

  font-family: inherit;
  font-size: 0.75rem;
  font-weight: 800;
  white-space: nowrap;
  color: ${({ theme }) => theme.text};

  background-color: ${({ theme, $on }) =>
    $on ? theme.green : "rgba(0, 0, 0, 0.25)"};
  border: 1px solid
    ${({ theme, $on }) => ($on ? theme.green : "rgba(255, 255, 255, 0.2)")};
  border-radius: 999px;
  cursor: pointer;

  transition: background-color 0.15s ease, border-color 0.15s ease;

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.border};
    outline-offset: 2px;
  }
`;

export const AutoNextIcon = IoRepeat;

/** The volume keeps to the right, away from the transport buttons. */
export const PlayerVolume = styled.div`
  margin-left: auto;
`;

export const Skip = styled.button`
  flex-shrink: 0;

  display: flex;
  padding: 4px;

  font-size: 20px;
  color: ${({ theme }) => theme.text};

  background: none;
  border: none;
  border-radius: 6px;
  cursor: pointer;

  &:disabled {
    opacity: 0.35;
    cursor: default;
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.border};
    outline-offset: 2px;
  }
`;

export const PreviousIcon = IoPlaySkipBack;
export const NextIcon = IoPlaySkipForward;

/** The album chips, which all fit on a line or two. */
export const Albums = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;

  width: 100%;
  margin-top: 10px;
  padding: 3px;
`;

/** Scrolls on its own, like the All OST list, so the player stays in view. */
export const List = styled.div`
  box-sizing: border-box;
  width: 100%;
  max-height: min(42vh, 400px);
  margin-top: 6px;
  overflow-y: auto;
  overscroll-behavior: contain;

  background-color: ${({ theme }) => theme.background1};
  border-radius: 8px;

  && {
    flex-shrink: 1;
    min-height: 160px;
  }

  ${slimScrollbar}
`;

/** One grid for every row, so the number and artist columns line up. */
export const Songs = styled.ul`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;

  margin: 0;
  padding: 4px;
  list-style: none;

  li {
    display: grid;
    grid-column: 1 / -1;
    grid-template-columns: subgrid;
  }
`;

/**
 * Songs guessed right stand out and the rest are dimmed. There is no third
 * look for songs missed: that would show what is left in the endless bag.
 * Hovering changes colour only, never size, so a pointer resting on the line
 * between two rows can't flick between them.
 */
export const SongButton = styled.button<{
  $bright: boolean;
  $selected: boolean;
}>`
  display: grid;
  grid-column: 1 / -1;
  grid-template-columns: subgrid;
  align-items: center;
  column-gap: 8px;

  width: 100%;
  padding: 9px 10px;

  font-family: inherit;
  font-size: 0.95rem;
  font-weight: ${({ $bright }) => ($bright ? 700 : 400)};
  text-align: left;
  color: ${({ theme }) => theme.text};

  background-color: ${({ theme, $selected }) =>
    $selected ? theme.background100 : "transparent"};
  border: none;
  border-radius: 5px;
  cursor: pointer;

  opacity: ${({ $bright, $selected }) => ($bright || $selected ? 1 : 0.5)};

  &:hover {
    opacity: 1;
    background-color: ${({ theme }) => theme.background100};
  }

  &:focus-visible {
    opacity: 1;
    outline: 2px solid ${({ theme }) => theme.border};
    outline-offset: -2px;
  }
`;

export const NowIcon = styled(IoVolumeHigh)`
  flex-shrink: 0;
  font-size: 16px;
  color: ${({ theme }) => theme.green};
`;
