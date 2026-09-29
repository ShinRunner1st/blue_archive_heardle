import styled from "styled-components";
import { IoPause, IoPlay, IoPlaySkipForward } from "react-icons/io5";
import "@fontsource-variable/nunito-sans";

/**
 * A bar at the bottom right, above the footer, clear of the character, who
 * stands on the left; on a phone it spans the bottom. It sits in the page's
 * column, so the play area ends above it and nothing goes under it. Only
 * where it fits beside the play area (632 px, centred) does it float in the
 * corner instead, taking no room from the game.
 */
export const Mini = styled.section`
  position: relative;
  flex-shrink: 0;
  align-self: flex-end;
  margin: 4px 16px 8px 0;
  z-index: 4;

  @media (min-width: 1344px) {
    position: fixed;
    right: 16px;
    bottom: 44px;
    margin: 0;
  }

  display: flex;
  align-items: center;
  gap: 6px;

  width: min(340px, calc(100vw - 32px));
  padding: 8px 8px 11px 10px;
  overflow: hidden;

  font-family: "Nunito Sans Variable";
  color: ${({ theme }) => theme.text};

  background-color: ${({ theme }) => theme.background1};
  border: 1px solid ${({ theme }) => theme.border100};
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
`;

const round = `
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  padding: 0;

  color: inherit;
  background: none;
  border: none;
  border-radius: 50%;
  cursor: pointer;

  &:disabled {
    opacity: 0.35;
    cursor: default;
  }
`;

export const Button = styled.button`
  ${round}
  width: 38px;
  height: 38px;

  font-size: 1.2rem;
  background-color: ${({ theme }) => theme.blue};

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.border};
    outline-offset: 2px;
  }
`;

export const Small = styled.button`
  ${round}
  width: 30px;
  height: 30px;

  font-size: 1.05rem;
  opacity: 0.85;

  &:hover:not(:disabled) {
    opacity: 1;
    background-color: ${({ theme }) => theme.background100};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.border};
  }
`;

/** The album cover, or a note, after the play button. */
export const Art = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  width: 40px;
  height: 40px;
  overflow: hidden;

  font-size: 1.2rem;
  color: lightblue;

  background-color: ${({ theme }) => theme.background100};
  border-radius: 8px;

  svg {
    font-size: inherit;
  }
`;

export const Meta = styled.div`
  flex: 1;
  min-width: 0;
  margin-left: 4px;
`;

export const Name = styled.p`
  margin: 0;

  font-size: 0.85rem;
  font-weight: 800;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const Artist = styled.p`
  margin: 0;

  font-size: 0.7rem;
  font-weight: 600;
  opacity: 0.65;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

/** How far into the song, along the bottom edge. */
export const Progress = styled.div`
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;

  height: 3px;
  background-color: rgba(255, 255, 255, 0.12);
`;

export const Fill = styled.div`
  height: 100%;
  background-color: ${({ theme }) => theme.blue};
`;

export const PlayIcon = styled(IoPlay)`
  margin-left: 2px;
`;
export const PauseIcon = IoPause;
export const NextIcon = IoPlaySkipForward;
