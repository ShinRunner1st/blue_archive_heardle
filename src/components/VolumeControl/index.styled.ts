import styled, { css } from "styled-components";
import { IoVolumeHigh, IoVolumeLow, IoVolumeMute } from "react-icons/io5";

export const Wrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`;

export const MuteButton = styled.button`
  display: flex;
  padding: 4px;

  color: ${({ theme }) => theme.text};
  background: none;
  border: none;
  border-radius: 4px;
  cursor: pointer;

  transition: opacity 0.15s ease;

  &:hover {
    opacity: 0.8;
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.border};
    outline-offset: 2px;
  }
`;

const icon = css`
  font-size: 22px;
`;

export const HighIcon = styled(IoVolumeHigh)`
  ${icon}
`;

export const LowIcon = styled(IoVolumeLow)`
  ${icon}
`;

export const MuteIcon = styled(IoVolumeMute)`
  ${icon}
`;

const track = css`
  height: 6px;
  border-radius: 3px;
  background: linear-gradient(
    to right,
    ${({ theme }) => theme.green} var(--fill),
    rgba(255, 255, 255, 0.25) var(--fill)
  );
`;

const thumb = css`
  width: 14px;
  height: 14px;

  background-color: ${({ theme }) => theme.text};
  border: none;
  border-radius: 50%;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
`;

/** A native range input, restyled so it matches the song timeline. */
export const Slider = styled.input`
  appearance: none;
  width: 96px;
  height: 20px;
  margin: 0;

  background: none;
  cursor: pointer;

  &::-webkit-slider-runnable-track {
    ${track}
  }

  &::-moz-range-track {
    ${track}
  }

  &::-webkit-slider-thumb {
    appearance: none;
    margin-top: -4px;
    ${thumb}
  }

  &::-moz-range-thumb {
    ${thumb}
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.border};
    outline-offset: 2px;
    border-radius: 4px;
  }

  @media (max-width: 768px) {
    width: 72px;
  }

  /* Leaves room between the play button and the percentage on phones. */
  @media (max-width: 480px) {
    width: 60px;
  }
`;

/**
 * The level as a number, in a pill like the header's streak chip. Sized for
 * "100%" so the slider doesn't shift as the number changes.
 */
export const Value = styled.span<{ $muted: boolean }>`
  flex-shrink: 0;
  box-sizing: border-box;
  min-width: 46px;
  padding: 3px 7px;

  font-family: "Nunito Sans Variable";
  font-size: 0.75rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  line-height: 1;
  text-align: center;
  color: ${({ theme }) => theme.text};
  opacity: ${({ $muted }) => ($muted ? 0.55 : 1)};

  background-color: rgba(0, 0, 0, 0.22);
  border: 1px solid ${({ theme }) => theme.border100};
  border-radius: 999px;

  transition: opacity 0.15s ease;

  @media (max-width: 768px) {
    min-width: 42px;
    padding: 3px 5px;
    font-size: 0.7rem;
  }
`;
