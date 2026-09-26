import styled from "styled-components";
import "@fontsource-variable/nunito-sans";

export const Container = styled.header`
  font-family: "Nunito Sans Variable";
  display: flex;
  align-items: center;
  justify-content: center;

  width: 100%;

  background-color: ${({ theme }) => theme.background100};
  /* Partly see-through, like the footer, so the place behind shows. */
  background-color: color-mix(
    in srgb,
    ${({ theme }) => theme.background100} 60%,
    transparent
  );
  -webkit-backdrop-filter: blur(6px);
  backdrop-filter: blur(6px);
`;

/**
 * The wordmark holds the centre and the two control groups take a corner each:
 * modes on the left, tools on the right, all on one line so the logo sits
 * level with the buttons - on phones too. The side columns are equal
 * fractions so the logo stays centred as the streak chip comes and goes.
 *
 * The tagline gets its own row underneath: inside the logo's column it would
 * make that column taller and push the logo above the buttons' line.
 */
export const Content = styled.div`
  font-family: "Nunito Sans Variable";
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  grid-template-areas:
    "modes brand tools"
    "tagline tagline tagline";
  align-items: center;
  gap: 2px 8px;

  width: 100%;
  max-width: 650px;
  padding: 8px 16px;

  a {
    color: ${({ theme }) => theme.text};
  }

  @media (max-width: 768px) {
    gap: 2px 6px;
    padding: 8px 10px 6px;
  }
`;

export const Heading = styled.h1`
  grid-area: brand;
  justify-self: center;

  /* The image is the heading, so there is no text box to reserve. */
  margin: 0;
  line-height: 0;
`;

export const Tagline = styled.p`
  grid-area: tagline;
  justify-self: center;

  font-family: "Nunito Sans Variable";
  font-size: 14px;
  font-weight: 600;
  line-height: 1.2;
  text-align: center;
  margin: 0;
  color: ${({ theme }) => theme.text};
  opacity: 0.8;

  @media (max-width: 768px) {
    font-size: 12px;
  }
`;

export const Logo = styled.img`
  height: 52px;
  width: auto;
  user-select: none;
  -webkit-touch-callout: none;

  /* Three stacked white shadows - one pass is too faint to read on the brown. */
  filter: drop-shadow(0 0 2px white) drop-shadow(0 0 2px white)
    drop-shadow(0 0 2px white);

  @media (max-width: 768px) {
    height: 36px;
  }

  @media (max-width: 360px) {
    height: 30px;
  }
`;

/**
 * Segmented switch between the daily puzzle and endless play.
 */
export const Modes = styled.div`
  grid-area: modes;
  justify-self: start;

  position: relative;
  display: grid;
  /* Equal columns so the sliding pill is the same width in both positions. */
  grid-template-columns: 1fr 1fr;

  padding: 3px;

  background-color: rgba(0, 0, 0, 0.22);
  border: 1px solid ${({ theme }) => theme.border100};
  border-radius: 999px;
`;

/**
 * The active marker. Animating one element between two places reads as a switch
 * being thrown; recolouring two separate backgrounds just blinks.
 */
export const ModeThumb = styled.div<{ $index: number }>`
  position: absolute;
  top: 3px;
  bottom: 3px;
  left: 3px;

  width: calc(50% - 3px);

  background-color: ${({ theme }) => theme.green};
  border-radius: 999px;

  transform: translateX(${({ $index }) => $index * 100}%);
  transition: transform 0.32s cubic-bezier(0.34, 1.35, 0.5, 1);
`;

export const ModeButton = styled.button<{ $active: boolean }>`
  /* Above the sliding pill, which shares this space. */
  position: relative;
  z-index: 1;

  padding: 5px 14px;

  font-family: "Nunito Sans Variable";
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  white-space: nowrap;
  color: ${({ theme }) => theme.text};
  opacity: ${({ $active }) => ($active ? 1 : 0.62)};

  background: none;
  border: none;
  border-radius: 999px;
  cursor: pointer;

  transition: opacity 0.2s ease, transform 0.12s ease;

  &:hover {
    opacity: 1;
  }

  /* Follows the finger, so the pill is not the only thing that responds. */
  &:active {
    transform: scale(0.94);
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.border};
    outline-offset: 2px;
  }

  @media (max-width: 768px) {
    padding: 5px 11px;
    font-size: 0.72rem;
  }

  /* Small phones: the logo shares this line, so the switch gives a little. */
  @media (max-width: 360px) {
    padding: 5px 8px;
  }
`;

export const Tools = styled.div`
  grid-area: tools;
  justify-self: end;

  display: flex;
  align-items: center;
  gap: 4px;

  font-size: 30px;

  @media (max-width: 768px) {
    font-size: 25px;
  }

  @media (max-width: 360px) {
    font-size: 22px;
  }
`;

/** Daily streak, kept beside the stats button it belongs to. */
export const Streak = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 3px;

  margin-right: 4px;
  padding: 3px 9px;

  font-family: "Nunito Sans Variable";
  font-size: 0.8rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  line-height: 1;
  color: ${({ theme }) => theme.text};
  white-space: nowrap;

  background-color: rgba(0, 0, 0, 0.22);
  border: 1px solid ${({ theme }) => theme.border100};
  border-radius: 999px;

  @media (max-width: 768px) {
    font-size: 0.72rem;
    padding: 3px 7px;
  }
`;

/**
 * The header controls were bare <svg onClick> elements, so they could not be
 * focused or activated from the keyboard. They are real buttons now; the icon
 * inherits the surrounding font-size so the existing sizing still applies.
 */
export const IconButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;

  padding: 4px;
  margin: 0;

  font-size: inherit;
  color: ${({ theme }) => theme.text};
  background: none;
  border: none;
  border-radius: 6px;
  cursor: pointer;

  transition: transform 0.15s ease, opacity 0.15s ease;

  &:hover {
    opacity: 0.8;
    transform: scale(1.08);
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.border};
    outline-offset: 2px;
  }
`;
