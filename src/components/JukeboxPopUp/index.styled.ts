import styled from "styled-components";
import { IoPlaySkipBack, IoPlaySkipForward } from "react-icons/io5";
import { MdRepeat, MdRepeatOne } from "react-icons/md";

import { slimScrollbar } from "../PopUp/scrollbar";

export {
  Chip,
  ChipCount,
  Count,
  Empty,
  Filter,
  FilterClear,
  FilterIcon,
  FilterInput,
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

/** An album cover, filling the art's square. */
export const Cover = styled.img`
  display: block;
  width: 100%;
  height: 100%;

  object-fit: cover;
  border-radius: inherit;
`;

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

/**
 * Off, next song, this song: an icon the size of the skip buttons, so the
 * row keeps its layout, green while on and with a 1 for this song.
 */
export const Repeat = styled.button<{ $on: boolean }>`
  flex-shrink: 0;

  display: flex;
  padding: 4px;

  font-size: 20px;
  color: ${({ theme, $on }) => ($on ? theme.green : theme.text)};
  opacity: ${({ $on }) => ($on ? 1 : 0.45)};

  background: none;
  border: none;
  border-radius: 6px;
  cursor: pointer;

  transition: color 0.15s ease, opacity 0.15s ease;

  &:hover {
    opacity: 1;
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.border};
    outline-offset: 2px;
  }
`;

export const RepeatIcon = MdRepeat;
export const RepeatOneIcon = MdRepeatOne;

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
