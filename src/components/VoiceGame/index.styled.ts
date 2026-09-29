import styled, { keyframes } from "styled-components";
import "@fontsource-variable/nunito-sans";

import { Heading as NowHeading } from "../NowPlaying/index.styled";
import { SongRow } from "../TimeAttack/index.styled";

export { BrowseButton } from "../StudentGame/index.styled";

export const Wrapper = styled.div`
  font-family: "Nunito Sans Variable";

  display: flex;
  flex-direction: column;
  align-items: center;

  width: 100%;
`;

/** Centred, as the OST's player is, keyboard tip and all. */
export const PlayerBox = styled.div`
  width: 100%;
  text-align: center;
`;

/**
 * The round's four tries, two to a row: a name fits in half the width, and
 * four full-width rows made the game taller than a laptop's window.
 */
export const Tries = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;

  width: 100%;
  margin: 4px 0;
`;

/** A try: the student guessed with their icon, a skip, or still to come. */
export const GuessRow = styled.div<{
  $active: boolean;
  $isCorrect: boolean | undefined;
}>`
  display: flex;
  align-items: center;
  gap: 10px;

  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  height: 42px;
  padding: 0 10px;

  font-size: 0.9rem;
  color: ${({ theme }) => theme.text};

  background-color: ${({ theme }) => theme.background100};
  border: 1px solid
    ${({ theme, $active, $isCorrect }) =>
      $isCorrect === true
        ? theme.green
        : $active
        ? theme.border
        : $isCorrect === false
        ? theme.red
        : theme.border100};
  border-radius: 5px;

  @media (max-width: 768px) {
    height: 38px;
  }
`;

/** Skip and Guess, closer under the search box than the OST's. */
export const Buttons = styled.div`
  display: flex;
  justify-content: space-between;

  width: 100%;
  margin-top: 12px;

  font-family: "Nunito Sans Variable";
`;

export const GuessName = styled.span`
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
`;

export const Skipped = styled.span`
  opacity: 0.7;
`;

/** The three hints, side by side, the same size open or locked. */
export const Hints = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;

  width: 100%;
  margin: 8px 0 0;
`;

const reveal = keyframes`
  from { transform: rotateY(90deg); opacity: 0; }
  to { transform: rotateY(0); opacity: 1; }
`;

export const HintCard = styled.div<{ $open: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;

  box-sizing: border-box;
  min-height: 80px;
  padding: 6px;

  text-align: center;
  color: ${({ theme }) => theme.text};

  background-color: ${({ theme }) => theme.surface};
  border: 1px ${({ $open }) => ($open ? "solid" : "dashed")}
    rgba(241, 247, 237, ${({ $open }) => ($open ? 0.3 : 0.18)});
  border-radius: 10px;
  backdrop-filter: blur(6px);

  animation: ${({ $open }) => ($open ? reveal : "none")} 0.35s ease-out;

  @media (max-width: 480px) {
    min-height: 72px;
  }
`;

export const HintLabel = styled.span`
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  opacity: 0.7;
`;

export const HintValue = styled.span`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;

  font-size: 0.85rem;
  font-weight: 800;
  line-height: 1.2;
  overflow-wrap: anywhere;
`;

export const HintLocked = styled.span`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;

  font-size: 0.75rem;
  font-weight: 700;
  opacity: 0.6;
`;

export const HintSwitch = styled.div`
  display: flex;
  gap: 6px;
`;

/** The search box, the list of every student and Skip, in one row. */
export const SearchRow = styled.div`
  display: flex;
  gap: 8px;

  width: 100%;
  margin-top: 12px;

  & > :first-child {
    flex: 1 1 auto;
    min-width: 0;
  }
`;

/** The four answers of a one-pick round. */
export const ChoiceSub = styled.span`
  margin-top: 2px;

  font-size: 0.78rem;
  font-weight: 700;
  color: lightblue;
`;

/** What the line says, under the answer. */
export const Quote = styled.blockquote`
  box-sizing: border-box;
  width: 100%;
  max-width: 420px;
  margin: 10px 0 0;
  padding: 10px 14px;

  font-size: 0.9rem;
  font-style: italic;
  font-weight: 600;
  line-height: 1.4;
  white-space: pre-line;

  background-color: ${({ theme }) => theme.surface};
  border-left: 3px solid ${({ theme }) => theme.blue};
  border-radius: 6px;
  backdrop-filter: blur(6px);
`;

export const QuoteNote = styled.span`
  display: block;
  margin-top: 4px;

  font-size: 0.75rem;
  font-style: normal;
  opacity: 0.7;
`;

/** A line of the run just played: the mark, the student's icon and name. */
export const RunRow = styled(SongRow)`
  grid-template-columns: 1.5em 28px minmax(0, 1fr) auto;
`;

/**
 * The card's heading, as the OST's, but a school and club are longer than an
 * artist: on a phone the volume drops to its own line rather than squeeze
 * them into a column.
 */
export const CardHeading = styled(NowHeading)`
  flex-wrap: wrap;
  row-gap: 10px;

  & > :nth-child(2) {
    flex: 1 1 200px;
  }

  & > :nth-child(3) {
    margin-left: auto;
  }
`;

/** The speaker's icon, where the OST's card has its album art. */
export const CardIcon = styled.div`
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

    & > * {
      transform: scale(0.82);
    }
  }
`;

/** What the line says, the card's full width. */
export const CardQuote = styled(Quote)`
  max-width: none;
  margin-top: 14px;
`;
