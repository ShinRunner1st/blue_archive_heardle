import styled from "styled-components";
import "@fontsource-variable/nunito-sans";
import {
  IoMusicalNotes,
  IoPauseCircle,
  IoPlayCircle,
  IoRefresh,
} from "react-icons/io5";

export const Card = styled.section`
  box-sizing: border-box;
  width: min(560px, 100%);
  margin: 5% 0;
  padding: 18px 20px 16px;

  font-family: "Nunito Sans Variable";
  color: ${({ theme }) => theme.text};

  /* The page artwork stays faintly visible behind the card. */
  background-color: ${({ theme }) => theme.background1}e6;
  border: 1px solid ${({ theme }) => theme.background100};
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);

  @media (max-width: 768px) {
    padding: 14px 14px 12px;
  }
`;

export const Heading = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
`;

export const Art = styled.div`
  flex-shrink: 0;

  display: flex;
  align-items: center;
  justify-content: center;

  width: 56px;
  height: 56px;

  background-color: ${({ theme }) => theme.background100};
  border-radius: 8px;

  @media (max-width: 768px) {
    width: 46px;
    height: 46px;
  }
`;

export const NoteIcon = styled(IoMusicalNotes)`
  font-size: 28px;
  color: lightblue;
`;

export const Name = styled.h2`
  margin: 0;

  font-size: 1.3rem;
  font-weight: 800;
  line-height: 1.25;
  color: lightblue;

  @media (max-width: 768px) {
    font-size: 1.1rem;
  }
`;

export const Artist = styled.p`
  margin: 2px 0 0;

  font-size: 0.95rem;
  opacity: 0.8;
`;

export const Controls = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;

  margin-top: 16px;
`;

export const Transport = styled.button`
  flex-shrink: 0;

  display: flex;
  padding: 0;

  color: ${({ theme }) => theme.text};
  background: none;
  border: none;
  border-radius: 50%;
  cursor: pointer;

  transition: transform 0.15s ease, opacity 0.15s ease;

  &:hover:not(:disabled) {
    transform: scale(1.08);
    opacity: 0.8;
  }

  &:disabled {
    opacity: 0.4;
    cursor: default;
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.border};
    outline-offset: 3px;
  }
`;

export const PlayIcon = styled(IoPlayCircle)`
  font-size: 52px;

  @media (max-width: 768px) {
    font-size: 44px;
  }
`;

export const PauseIcon = styled(IoPauseCircle)`
  font-size: 52px;

  @media (max-width: 768px) {
    font-size: 44px;
  }
`;

export const Timeline = styled.div`
  position: relative;
  flex: 1;
  min-width: 0;
`;

export const Track = styled.div`
  position: relative;

  height: 8px;
  margin-top: 12px;

  background-color: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
`;

/**
 * The real control is a native range input laid over the drawn track, so it
 * keeps keyboard and screen-reader support while the track is styled freely.
 * It is transparent, so its focus ring is drawn on the track instead.
 */
export const Seek = styled.input`
  position: absolute;
  top: 0;
  left: 0;
  z-index: 2;

  width: 100%;
  height: 32px;
  margin: 0;

  opacity: 0;
  cursor: pointer;

  &:disabled {
    cursor: default;
  }

  &:focus-visible ~ ${Track} {
    outline: 2px solid ${({ theme }) => theme.border};
    outline-offset: 4px;
  }
`;

export const Fill = styled.div`
  position: absolute;
  inset: 0 auto 0 0;

  background-color: ${({ theme }) => theme.green};
  border-radius: 4px;
`;

/**
 * Marks the stretch of the song that was the round's clip. It sits just above
 * the track rather than on it: an early clip is only a few pixels wide, and on
 * the track the playhead would cover it exactly while the clip plays.
 */
export const ClipBand = styled.div`
  position: absolute;
  top: -9px;
  height: 4px;
  min-width: 6px;

  background-color: ${({ theme }) => theme.orange};
  border-radius: 2px;
`;

export const Thumb = styled.div`
  position: absolute;
  top: 50%;

  width: 14px;
  height: 14px;

  background-color: ${({ theme }) => theme.text};
  border-radius: 50%;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.5);

  transform: translate(-50%, -50%);
  pointer-events: none;
`;

export const Times = styled.div`
  display: flex;
  justify-content: space-between;

  margin-top: 8px;

  font-size: 0.8rem;
  font-variant-numeric: tabular-nums;
  opacity: 0.8;
`;

export const ClipRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px 12px;

  margin-top: 14px;
  padding-top: 12px;

  border-top: 1px solid ${({ theme }) => theme.background100};
`;

export const ClipLabel = styled.p`
  display: flex;
  align-items: center;
  gap: 8px;

  margin: 0;

  font-size: 0.9rem;
  font-variant-numeric: tabular-nums;
`;

export const ClipSwatch = styled.span`
  width: 14px;
  height: 8px;

  background-color: ${({ theme }) => theme.orange};
  border-radius: 2px;
`;

export const ReplayButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;

  padding: 8px 14px;

  font-family: inherit;
  font-size: 0.9rem;
  font-weight: 800;
  color: ${({ theme }) => theme.text};

  background-color: ${({ theme }) => theme.background100};
  border: none;
  border-radius: 5px;
  cursor: pointer;

  transition: opacity 0.15s ease;

  &:hover:not(:disabled) {
    opacity: 0.8;
  }

  &:disabled {
    opacity: 0.4;
    cursor: default;
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.border};
    outline-offset: 3px;
  }
`;

export const ReplayIcon = styled(IoRefresh)`
  font-size: 1rem;
`;

/**
 * Replaces the player when the file refuses to play, so the reveal says why
 * instead of showing controls that do nothing.
 */
export const Fallback = styled.p`
  margin: 16px 0 0;
  padding: 12px;

  font-size: 0.9rem;
  line-height: 1.4;
  text-align: center;

  background-color: ${({ theme }) => theme.background100};
  border-radius: 6px;
`;
