import styled from "styled-components";
import "@fontsource-variable/nunito-sans";
import { IoPauseCircle, IoPlayCircle } from "react-icons/io5";

export const ProgressBackground = styled.div`
  position: relative;
  overflow: hidden;

  width: 100%;
  height: 20px;

  @media (max-width: 768px) {
    height: 16px;
  }

  background-color: ${({ theme }) => theme.gray};
  border-radius: 2px;

  margin-top: 5%;
`;

export const Progress = styled.div<{ $value: number; $max: number }>`
  width: ${({ $value, $max }) =>
    $max > 0 ? `${Math.min(($value / $max) * 100, 100)}%` : "0%"};
  height: 100%;

  background-color: ${({ theme }) => theme.green};

  border-radius: 2px;

  transition: width 0.25s linear;
`;

export const Separator = styled.div`
  position: absolute;
  top: 0;

  width: 0.8px;
  height: 100%;

  background-color: ${({ theme }) => theme.border100};
`;

/**
 * Labels are absolutely positioned at the same proportion as their separator,
 * so each one sits on the mark it describes.
 */
export const TimeStamps = styled.div`
  position: relative;

  width: 100%;
  height: 1.4rem;

  text-shadow: #000000 1px 0 10px;
`;

export const TimeStamp = styled.span`
  position: absolute;
  top: 0;

  transform: translateX(-50%);

  font-family: "Nunito Sans Variable";
  font-size: 0.9rem;
  color: ${({ theme }) => theme.text};

  @media (max-width: 768px) {
    font-size: 0.75rem;
  }
`;

export const PlayIcon = styled(IoPlayCircle)`
  cursor: pointer;
  transition: transform 0.15s ease, opacity 0.15s ease;
  position: relative;
  font-size: 70px;
  flex-shrink: 0;

  @media (max-width: 768px) {
    font-size: 50px;
  }

  &:hover {
    transform: scale(1.08);
    opacity: 0.8;
  }
`;

export const PauseIcon = styled(IoPauseCircle)`
  cursor: pointer;
  transition: transform 0.15s ease, opacity 0.15s ease;
  position: relative;
  font-size: 70px;
  flex-shrink: 0;

  @media (max-width: 768px) {
    font-size: 50px;
  }

  &:hover {
    transform: scale(1.08);
    opacity: 0.8;
  }
`;

/**
 * Stands in for the progress bar and transport button while the audio file
 * loads, so the controls fade in rather than popping the layout down.
 */
export const LoadingState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;

  width: 100%;

  font-family: "Nunito Sans Variable";
  color: ${({ theme }) => theme.text};
  text-shadow: #000000 1px 0 10px;

  animation: fade 1.2s ease-in-out infinite;

  @keyframes fade {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.6;
    }
  }
`;

export const LoadingBar = styled.div`
  width: 100%;
  height: 20px;

  @media (max-width: 768px) {
    height: 16px;
  }

  margin-top: 5%;

  background-color: ${({ theme }) => theme.gray};
  border-radius: 2px;
  opacity: 0.4;
`;

export const LoadingLabel = styled.p`
  font-size: 0.9rem;
  margin: 12px 0;
`;

/** Discoverability hint for the Space shortcut; hidden on touch-first widths. */
export const Hint = styled.p`
  margin: 4px 0 0;

  font-family: "Nunito Sans Variable";
  font-size: 0.75rem;
  color: ${({ theme }) => theme.text};
  opacity: 0.65;
  text-shadow: #000000 1px 0 10px;

  kbd {
    font-family: inherit;
    font-size: 0.7rem;
    font-weight: 700;

    padding: 1px 6px;
    border: 1px solid currentColor;
    border-radius: 4px;
    opacity: 0.9;
  }

  @media (max-width: 768px) {
    display: none;
  }
`;

/**
 * Keeps the play button centred under the progress bar with the volume control
 * off to the right, lined up with the bar's end.
 */
export const TransportRow = styled.div`
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;

  width: 100%;

  & > :first-child {
    grid-column: 2;
  }
`;

export const VolumeSlot = styled.div`
  grid-column: 3;
  justify-self: end;
  margin-top: 8px;
`;

/** Real button wrapper so the transport control is focusable and labelled. */
export const TransportButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;

  margin-top: 8px;
  padding: 0;

  color: inherit;
  background: none;
  border: none;
  border-radius: 50%;
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.border};
    outline-offset: 4px;
  }
`;

/**
 * Shown when the clip cannot be heard - a removed, private, region-locked or
 * embedding-disabled video, or a load that never finished. Every control used
 * to be gated on the player becoming ready, so these cases produced a silent
 * progress bar and no explanation at all.
 */
export const ErrorState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;

  width: 100%;
  margin-top: 5%;
  padding: 16px;

  font-family: "Nunito Sans Variable";
  text-align: center;

  background-color: rgba(0, 0, 0, 0.28);
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 12px;
`;

export const ErrorTitle = styled.p`
  margin: 0 0 6px;

  font-size: 1rem;
  font-weight: 700;
  color: ${({ theme }) => theme.orange};
`;

export const ErrorText = styled.p`
  max-width: 44ch;
  margin: 0;

  font-size: 0.85rem;
  line-height: 1.45;
  color: ${({ theme }) => theme.text};
  opacity: 0.85;
`;

export const ErrorActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 12px;

  margin-top: 14px;
`;

export const ErrorNote = styled(ErrorText)`
  margin-top: 12px;
  font-size: 0.8rem;
  opacity: 0.7;
`;
