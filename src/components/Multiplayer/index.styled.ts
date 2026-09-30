import styled, { css, keyframes } from "styled-components";
import "@fontsource-variable/nunito-sans";

export {
  Buttons,
  Card,
  Lead,
  Note,
  Options,
  PlayButtons,
  Setting,
  SettingHint,
  SettingName,
  SettingText,
  Title,
} from "../TimeAttack/index.styled";

const shadowText = css`
  text-shadow: #000000 1px 0 10px;
`;

const panel = css`
  box-sizing: border-box;
  width: 100%;

  font-family: "Nunito Sans Variable";

  background-color: ${({ theme }) => theme.background1}e6;
  border: 1px solid ${({ theme }) => theme.background100};
  border-radius: 12px;
`;

export const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
`;

export const Label = styled.label`
  font-size: 0.95rem;
  font-weight: 800;
`;

export const Input = styled.input<{ $code?: boolean }>`
  box-sizing: border-box;
  width: 100%;
  height: 40px;
  padding: 0 12px;

  font-family: inherit;
  font-size: ${({ $code }) => ($code ? "1.2rem" : "0.95rem")};
  font-weight: ${({ $code }) => ($code ? 800 : 400)};
  letter-spacing: ${({ $code }) => ($code ? "0.3em" : "normal")};
  text-transform: ${({ $code }) => ($code ? "uppercase" : "none")};
  color: ${({ theme }) => theme.text};

  background-color: rgba(0, 0, 0, 0.18);
  border: 1px solid rgba(241, 247, 237, 0.22);
  border-radius: 8px;

  &::placeholder {
    color: ${({ theme }) => theme.text};
    letter-spacing: normal;
    text-transform: none;
    opacity: 0.5;
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.border};
    outline-offset: 2px;
  }
`;

export const JoinRow = styled.div`
  display: flex;
  gap: 10px;
  align-items: center;

  & > input {
    flex: 1;
    min-width: 0;
  }
`;

export const Divider = styled.p`
  margin: 16px 0;

  font-size: 0.85rem;
  font-weight: 800;
  text-align: center;
  opacity: 0.7;
`;

/** Marks the top of the screen, to scroll back to; takes no room. */
export const ScrollTop = styled.span`
  display: block;
  height: 0;
`;

/**
 * Where alerts show: over the top of the screen, taking no room, so
 * nothing under them moves as they come and go, and still in sight once
 * the play area scrolls.
 */
export const Toasts = styled.div`
  position: sticky;
  top: 8px;
  z-index: 5;

  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;

  align-self: stretch;
  height: 0;
  overflow: visible;
`;

/** Why the page couldn't get in, was sent out, or didn't do something. */
export const Problem = styled.p`
  box-sizing: border-box;
  flex-shrink: 0;
  width: 100%;
  margin: 0;
  padding: 10px 14px;

  font-family: "Nunito Sans Variable";
  font-size: 0.9rem;
  font-weight: 700;
  text-align: center;
  text-wrap: balance;

  /* Solid enough to read over whatever it covers. */
  background: linear-gradient(rgba(255, 77, 77, 0.25), rgba(255, 77, 77, 0.25)),
    ${({ theme }) => theme.background1};
  border: 1px solid ${({ theme }) => theme.red};
  border-radius: 10px;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.4);
`;

export const Small = styled.button<{ $strong?: boolean }>`
  flex-shrink: 0;
  padding: 6px 14px;

  font-family: inherit;
  font-size: 0.8rem;
  font-weight: 800;
  white-space: nowrap;
  color: ${({ theme }) => theme.text};

  background-color: ${({ theme, $strong }) =>
    $strong ? theme.blue : "rgba(0, 0, 0, 0.25)"};
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 999px;
  cursor: pointer;

  transition: background-color 0.15s ease;

  &:hover:not(:disabled) {
    background-color: ${({ theme }) => theme.blue};
  }

  &:disabled {
    cursor: default;
    opacity: 0.5;
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.border};
    outline-offset: 2px;
  }
`;

/**
 * A button that is only its icon, as the settings' gear: round, the height
 * of the Small buttons, or of the big ones beside them with $big.
 */
export const IconButton = styled.button<{ $big?: boolean; $small?: boolean }>`
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;

  width: ${({ $big, $small }) => ($big ? "48px" : $small ? "26px" : "34px")};
  height: ${({ $big, $small }) => ($big ? "48px" : $small ? "26px" : "34px")};
  padding: 0;

  font-size: ${({ $big, $small }) =>
    $big ? "1.35rem" : $small ? "0.9rem" : "1.05rem"};
  color: ${({ theme }) => theme.text};

  background-color: rgba(0, 0, 0, 0.25);
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: ${({ $big }) => ($big ? "10px" : "50%")};
  cursor: pointer;

  transition: background-color 0.15s ease;

  &:hover:not(:disabled) {
    background-color: ${({ theme }) => theme.blue};
  }

  &:disabled {
    cursor: default;
    opacity: 0.5;
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.border};
    outline-offset: 2px;
  }

  svg {
    display: block;
  }
`;

/** A player's picture: a student's icon, or their name's first letter. */
export const Letter = styled.span<{ $size: number; $hue: number }>`
  flex-shrink: 0;

  display: inline-flex;
  align-items: center;
  justify-content: center;

  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;

  font-size: ${({ $size }) => Math.round($size * 0.45)}px;
  font-weight: 900;
  color: #fff;

  background-color: ${({ $hue }) => `hsl(${$hue} 45% 42%)`};
  border-radius: 50%;
`;

export const AvatarBox = styled.span<{ $size: number }>`
  flex-shrink: 0;
  display: inline-flex;
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  overflow: hidden;
  border-radius: 50%;
  background-color: rgba(0, 0, 0, 0.2);
`;

/** The picture picker before joining: the picture, and its buttons. */
export const IconRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
`;

/** The room's code, big enough to read out across a table, and its buttons. */
export const CodeCard = styled.section`
  ${panel}
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px 16px;
  padding: 12px 16px;

  @media (max-width: 480px) {
    flex-direction: column;
  }
`;

export const CodeBlock = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;

  @media (max-width: 480px) {
    align-items: center;
  }
`;

export const CodeLabel = styled.span`
  font-size: 0.75rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  opacity: 0.7;
`;

export const CodeText = styled.span`
  font-size: 2.2rem;
  font-weight: 900;
  line-height: 1.1;
  letter-spacing: 0.25em;
  ${shadowText}
`;

/** Copy code and Copy link, kept on one row even on a phone. */
export const CopyRow = styled.div`
  display: flex;
  flex-wrap: nowrap;
  gap: 8px;
`;

/** The settings in a few words, with the host's gear to change them. */
export const Summary = styled.section`
  ${panel}
  display: flex;
  align-items: flex-start;
  gap: 10px 12px;
  margin-top: 10px;
  padding: 12px 14px;
`;

export const Pills = styled.ul`
  display: flex;
  flex: 1;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  /* The host's gear's height, so their panel and a guest's match. */
  min-height: 26px;
  margin: 0;
  padding: 0;
  list-style: none;
`;

export const Pill = styled.li<{ $lead?: boolean }>`
  padding: 3px 10px;

  font-size: 0.8rem;
  font-weight: 800;
  white-space: nowrap;

  background-color: ${({ theme, $lead }) =>
    $lead ? theme.blue : "rgba(255, 255, 255, 0.08)"};
  border-radius: 999px;
`;

/** Everyone in the room, as cards that keep their place all game. */
export const PlayerGrid = styled.ol`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;

  box-sizing: border-box;
  width: 100%;
  margin: 10px 0 0;
  padding: 0;

  font-family: "Nunito Sans Variable";
  list-style: none;

  @media (min-width: 600px) {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
`;

export const PlayerCard = styled.li<{
  $you?: boolean;
  $away?: boolean;
  $empty?: boolean;
  $right?: boolean | null;
}>`
  position: relative;

  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  grid-template-rows: auto auto;
  column-gap: 6px;
  align-items: center;

  box-sizing: border-box;
  height: 50px;
  padding: 6px 7px;

  background-color: ${({ theme, $empty }) =>
    $empty ? "transparent" : `${theme.background1}e6`};
  border: 1px ${({ $empty }) => ($empty ? "dashed" : "solid")}
    ${({ theme, $you, $right }) =>
      $right === true
        ? theme.green
        : $right === false
        ? theme.red
        : $you
        ? theme.blue
        : theme.background100};
  border-radius: 10px;
  opacity: ${({ $away, $empty }) => ($empty ? 0.45 : $away ? 0.55 : 1)};

  & > :first-child {
    grid-row: 1 / 3;
  }
`;

export const CardName = styled.span`
  grid-column: 2;
  min-width: 0;
  font-size: 0.85rem;
  font-weight: 800;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

export const CardLine = styled.span<{ $right?: boolean | null }>`
  grid-column: 2;
  min-width: 0;

  font-size: 0.75rem;
  font-weight: 800;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: ${({ $right }) =>
    $right === true ? "lightgreen" : $right === false ? "#ff8a8a" : "inherit"};
`;

/**
 * The host's Kick, on another player's card in the lobby: a small ✕, so
 * the name keeps its room, and "Kick?" for the second press.
 */
export const Kick = styled.button<{ $armed: boolean }>`
  grid-row: 1 / 3;
  grid-column: 3;
  min-width: 22px;
  height: 22px;
  padding: 0 ${({ $armed }) => ($armed ? "8px" : "0")};

  font-family: "Nunito Sans Variable";
  font-size: 0.7rem;
  font-weight: 800;
  color: ${({ theme }) => theme.text};

  background-color: ${({ $armed }) =>
    $armed ? "rgba(255, 77, 77, 0.35)" : "transparent"};
  border: 1px solid
    ${({ theme, $armed }) => ($armed ? theme.red : "rgba(255, 255, 255, 0.2)")};
  border-radius: 999px;
  opacity: ${({ $armed }) => ($armed ? 1 : 0.7)};
  cursor: pointer;

  &:hover {
    opacity: 1;
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.border};
    outline-offset: 2px;
  }
`;

/** A player's score, big enough to read across the room at a glance. */
export const CardScore = styled.span<{ $some: boolean }>`
  grid-row: 1 / 3;
  grid-column: 3;

  min-width: 24px;
  padding: 2px 4px;

  font-size: 1.1rem;
  font-weight: 900;
  line-height: 1.4;
  font-variant-numeric: tabular-nums;
  text-align: center;
  color: ${({ $some }) => ($some ? "lightgreen" : "inherit")};

  background-color: ${({ $some }) =>
    $some ? "rgba(76, 175, 80, 0.2)" : "rgba(255, 255, 255, 0.06)"};
  border-radius: 8px;
  opacity: ${({ $some }) => ($some ? 1 : 0.6)};
`;

/** The top three's medal, or the host's crown, on the card's corner. */
export const Badge = styled.span<{ $medal?: boolean }>`
  position: absolute;
  top: -7px;
  left: -5px;

  min-width: 18px;
  padding: 0 4px;

  font-size: ${({ $medal }) => ($medal ? "0.9rem" : "0.7rem")};
  font-weight: 900;
  line-height: 18px;
  text-align: center;

  background-color: ${({ theme, $medal }) =>
    $medal ? "transparent" : theme.background100};
  border-radius: 999px;
`;

/** The round's number and its clock, above the stage. */
export const Status = styled.div`
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 12px;

  width: 100%;
  height: 34px;
  margin-bottom: 8px;

  font-family: "Nunito Sans Variable";
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  ${shadowText}
`;

export const RoundNo = styled.span`
  font-size: 1rem;
  white-space: nowrap;
`;

export const Clock = styled.span<{ $low: boolean }>`
  min-width: 2.4em;
  font-size: 1.4rem;
  text-align: right;
  color: ${({ theme, $low }) => ($low ? theme.red : theme.text)};
`;

/**
 * What the round plays or shows, then its answer, with the volume in a row
 * at its foot. One height in every phase and game, so nothing below it
 * moves as a round loads, plays and is revealed; at the reveal, its border
 * says whether the player named it.
 */
export const Stage = styled.section<{ $right?: boolean | null }>`
  ${panel}
  position: relative;
  border-color: ${({ theme, $right }) =>
    $right === true ? theme.green : $right === false ? theme.red : undefined};

  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;

  height: 150px;
  padding: 10px;
  overflow: hidden;
`;

/** The stage's own part: the bars, the picture, or the answer. */
export const StageMain = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  min-height: 0;
`;

/** The volume, and a voice line's Play again, in the same place always. */
/**
 * The volume in the stage's middle in every game, with Play again to its
 * left: centred together, a voice line's volume sat off to one side of a
 * song's. Tap to hear, wider and there only until tapped, is centred with
 * the volume instead, as a phone has no room for it on both sides.
 */
export const StageControls = styled.div<{ $tap: boolean }>`
  flex-shrink: 0;
  display: grid;
  grid-template-columns: ${({ $tap }) =>
    $tap ? "auto auto" : "minmax(0, 1fr) auto minmax(0, 1fr)"};
  justify-content: center;
  align-items: center;
  gap: 12px;
  height: 34px;
`;

export const StageSide = styled.div`
  display: flex;
  justify-content: flex-end;
  min-width: 0;
`;

const pop = keyframes`
  from { transform: scale(1.6); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
`;

/** 3, 2, 1 before the first round, over the stage. */
export const Countdown = styled.span`
  font-size: 3.4rem;
  font-weight: 900;
  line-height: 1;
  animation: ${pop} 0.35s ease-out;
  ${shadowText}
`;

const bounce = keyframes`
  0%, 100% { transform: scaleY(0.25); }
  50% { transform: scaleY(1); }
`;

/** Bars that move while a song plays: there's nothing to press. */
export const Bars = styled.span<{ $on: boolean }>`
  display: flex;
  align-items: flex-end;
  gap: 5px;
  height: 40px;

  & > span {
    width: 8px;
    height: 100%;
    background-color: ${({ theme }) => theme.blue};
    border-radius: 3px;
    transform-origin: bottom;
    transform: scaleY(0.25);
    animation: ${bounce} 0.9s ease-in-out infinite;
    animation-play-state: ${({ $on }) => ($on ? "running" : "paused")};
  }

  & > span:nth-child(2n) {
    animation-duration: 0.7s;
  }

  & > span:nth-child(3n) {
    animation-duration: 1.1s;
  }
`;

export const StageText = styled.span`
  font-size: 0.85rem;
  font-weight: 800;
  text-align: center;
  opacity: 0.85;
`;

/** The answer, in the stage: its picture, and its name beside it. */
export const Reveal = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  max-width: 520px;
  min-width: 0;
`;

/** A song's album cover, or the student's icon. */
export const RevealArt = styled.div<{ $round?: boolean }>`
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;

  width: 76px;
  height: 76px;
  overflow: hidden;

  font-size: 2rem;
  color: lightblue;

  background-color: ${({ theme }) => theme.background100};
  border-radius: ${({ $round }) => ($round ? "50%" : "10px")};

  svg {
    font-size: inherit;
  }
`;

/** The halo or weapon itself, a silhouette's too, left of its name. */
export const RevealPicture = styled.div<{ $kind: string }>`
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: ${({ $kind }) => ($kind === "halo" ? "110px" : "150px")};

  @media (max-width: 480px) {
    width: ${({ $kind }) => ($kind === "halo" ? "84px" : "110px")};
    & > [role="img"] {
      zoom: 0.75;
    }
  }
`;

export const RevealText = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 1px;
  min-width: 0;
  flex: 1;
`;

export const AnswerLabel = styled.span`
  font-size: 0.7rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  opacity: 0.7;
`;

export const AnswerName = styled.span`
  max-width: 100%;
  font-size: 1.1rem;
  font-weight: 900;
  color: ${({ theme }) => theme.text};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

export const AnswerMeta = styled.span`
  display: flex;
  align-items: center;
  gap: 8px;
  max-width: 100%;
  overflow: hidden;
  white-space: nowrap;

  font-size: 0.78rem;
  font-weight: 700;
  color: lightblue;
`;

/** The ways to answer; the same height from the first round to the last. */
export const Answers = styled.div<{ $choices: boolean }>`
  width: 100%;
  margin-top: 10px;
  /*
   * Typed answers are a fixed height: the search box and the answer sent in
   * its place differ by a few pixels, which moved the whole column. The four
   * can grow, if a name takes two lines.
   */
  ${({ $choices }) => ($choices ? "min-height: 206px;" : "height: 108px;")}

  & > div:first-child {
    margin-top: 0;
  }

  @media (max-width: 480px) {
    ${({ $choices }) => ($choices ? "min-height: 300px;" : "")}
  }
`;

/**
 * An answer's place, empty until the four show as the song starts: a
 * name's and a second line's bars, the height of the two lines, and a
 * student's icon, so the four keep their size as they come.
 */
export const ChoiceWait = styled.span`
  display: flex;
  flex-direction: column;
  justify-content: space-around;
  flex: 1;
  height: 36px;

  & > span {
    width: 70%;
    height: 11px;

    background-color: ${({ theme }) => theme.border};
    border-radius: 6px;
    opacity: 0.35;
  }

  & > span + span {
    width: 45%;
    height: 8px;
  }
`;

export const ChoiceWaitIcon = styled.span`
  flex-shrink: 0;
  width: 40px;
  height: 40px;

  background-color: ${({ theme }) => theme.border};
  border-radius: 6px;
  opacity: 0.2;
`;

/** The answer sent, in the search box's place once the round is over. */
export const Sent = styled.div<{ $right?: boolean | null }>`
  ${panel}
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  height: 48px;
  padding: 0 14px;

  font-size: 0.9rem;
  font-weight: 700;
  color: ${({ $right }) =>
    $right === true ? "lightgreen" : $right === false ? "#ff8a8a" : "inherit"};
`;

export const SearchRow = styled.div`
  display: flex;
  gap: 8px;
  align-items: flex-start;
  width: 100%;

  & > :first-child {
    flex: 1;
    min-width: 0;
  }
`;

/** Leave and End game in a round: small, and at either end of the row. */
export const QuitRow = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  margin-top: 14px;
`;

export const Quiet = styled.button<{ $armed: boolean }>`
  padding: 4px 10px;

  font-family: "Nunito Sans Variable";
  font-size: 0.75rem;
  font-weight: 800;
  color: ${({ theme }) => theme.text};

  background-color: ${({ $armed }) =>
    $armed ? "rgba(255, 77, 77, 0.35)" : "transparent"};
  border: 1px solid
    ${({ theme, $armed }) => ($armed ? theme.red : "rgba(255, 255, 255, 0.2)")};
  border-radius: 999px;
  opacity: ${({ $armed }) => ($armed ? 1 : 0.7)};
  cursor: pointer;

  &:hover {
    opacity: 1;
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.border};
    outline-offset: 2px;
  }
`;

/**
 * The host's ask to end the game, in the middle of the Leave row, with
 * everyone else's Yes and No.
 */
export const Vote = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;

  font-family: "Nunito Sans Variable";
  font-size: 0.75rem;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  ${shadowText}
`;

/** Submit and Quick answer, kept in place (hidden, not gone) when not answering. */
export const SubmitRow = styled.div<{ $hidden?: boolean }>`
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-top: 10px;
  visibility: ${({ $hidden }) => ($hidden ? "hidden" : "visible")};
`;

/** The settings pop-up's fields: two columns where there's room. */
export const SettingsGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 14px 20px;

  font-family: "Nunito Sans Variable";

  @media (min-width: 640px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`;

export const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
`;

/** A field's name, with a button on the right. */
export const FieldTop = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
`;

export const FieldName = styled.span`
  font-size: 0.9rem;
  font-weight: 800;
`;

export const FieldHint = styled.span`
  font-size: 0.75rem;
  opacity: 0.7;
`;

export const Chips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;

  /* A little narrower than the lists' chips: two fit a column's width. */
  & > button {
    padding: 0 9px;
  }
`;

export const RangeRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;

  & > input[type="range"] {
    flex: 1;
    min-width: 0;
  }
`;

export const NumberBox = styled.input`
  box-sizing: border-box;
  width: 64px;
  height: 32px;
  padding: 0 8px;

  font-family: inherit;
  font-size: 0.9rem;
  font-weight: 800;
  text-align: center;
  color: ${({ theme }) => theme.text};

  background-color: rgba(0, 0, 0, 0.18);
  border: 1px solid rgba(241, 247, 237, 0.22);
  border-radius: 8px;

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.border};
    outline-offset: 2px;
  }
`;

/** A field across both of the settings' columns. */
export const Wide = styled.div`
  grid-column: 1 / -1;
`;

/**
 * The presets, a row each: about three and a half show, and the rest
 * scroll, so a long list never pushes the settings down.
 */
export const PresetList = styled.ul`
  display: flex;
  flex-direction: column;
  gap: 4px;

  max-height: 158px;
  margin: 0;
  padding: 4px;
  overflow-y: auto;
  overscroll-behavior: contain;
  list-style: none;

  background-color: rgba(0, 0, 0, 0.18);
  border: 1px solid rgba(241, 247, 237, 0.16);
  border-radius: 10px;
`;

export const PresetItem = styled.li<{ $active: boolean }>`
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 2px;
  padding-right: 4px;

  background-color: ${({ theme, $active }) =>
    $active ? `${theme.green}40` : "transparent"};
  border: 1px solid
    ${({ theme, $active }) => ($active ? theme.green : "transparent")};
  border-radius: 8px;
`;

export const PresetUse = styled.button`
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: flex-start;
  min-width: 0;
  padding: 5px 8px;

  font-family: inherit;
  text-align: left;
  color: ${({ theme }) => theme.text};

  background: none;
  border: none;
  border-radius: 7px;
  cursor: pointer;

  &:hover {
    background-color: rgba(255, 255, 255, 0.06);
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.border};
  }
`;

export const PresetName = styled.span`
  max-width: 100%;
  font-size: 0.85rem;
  font-weight: 800;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

export const PresetMeta = styled.span`
  max-width: 100%;
  font-size: 0.72rem;
  font-weight: 600;
  opacity: 0.7;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

/** A preset's copy and delete buttons. */
export const PresetIcon = styled.button<{ $danger?: boolean }>`
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;

  font-size: 1rem;
  color: ${({ theme }) => theme.text};

  background: none;
  border: none;
  border-radius: 50%;
  opacity: 0.65;
  cursor: pointer;

  &:hover {
    opacity: 1;
    background-color: ${({ $danger }) =>
      $danger ? "rgba(255, 77, 77, 0.35)" : "rgba(255, 255, 255, 0.12)"};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.border};
  }

  svg {
    display: block;
  }
`;

export const PresetRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;

  & > input {
    flex: 1;
    min-width: 0;
    height: 32px;
  }
`;

/** The settings a new room starts with, on the page before it's made. */
export const NewRoom = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;

  & > ul {
    justify-content: center;
  }
`;

/** The warning in a lobby about to close for want of anything happening. */
export const IdleNote = styled.div`
  ${panel}
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 8px 12px;
  padding: 10px 14px;

  font-size: 0.9rem;
  font-weight: 800;
  text-align: center;

  background-color: ${({ theme }) => theme.background1};
  border-color: ${({ theme }) => theme.red};
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.4);
`;

const rise = keyframes`
  from { transform: translateY(24px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
`;

/** The top three, second and third either side of the winner. */
export const Podium = styled.ol`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  align-items: end;
  gap: 8px;

  box-sizing: border-box;
  width: 100%;
  max-width: 460px;
  margin: 14px auto 0;
  padding: 0;

  font-family: "Nunito Sans Variable";
  list-style: none;
`;

const PODIUM_HEIGHTS = [0, 76, 54, 38];
/**
 * Gold, silver and bronze, by place, light to dark down each block: solid,
 * so they read the same on the day library's browns and the night's blues.
 */
const MEDAL_COLOURS: Record<number, [string, string]> = {
  1: ["#ffe27a", "#d9a21f"],
  2: ["#f1f4f9", "#a9b3c4"],
  3: ["#f3b98a", "#b56e36"],
};
const PODIUM_DELAYS = [0, 0.5, 0.25, 0];

export const PodiumSpot = styled.li<{
  $place: number;
  $column: number;
  $you: boolean;
}>`
  grid-row: 1;
  grid-column: ${({ $column }) => $column};
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  min-width: 0;

  /* Third rises first, the winner last. */
  animation: ${rise} 0.45s ease-out both;
  animation-delay: ${({ $place }) => PODIUM_DELAYS[$place] ?? 0}s;

  & > :last-child {
    border-color: ${({ theme, $you }) => ($you ? theme.blue : "transparent")};
  }
`;

export const PodiumFace = styled.span`
  position: relative;
  display: inline-flex;
  margin-bottom: 4px;
`;

export const PodiumMedal = styled.span`
  position: absolute;
  right: -8px;
  bottom: -6px;
  font-size: 1.3rem;
  line-height: 1;
`;

export const PodiumName = styled.span`
  max-width: 100%;
  font-size: 0.95rem;
  font-weight: 900;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  ${shadowText}
`;

export const PodiumScore = styled.span`
  font-size: 0.75rem;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  color: lightgreen;
  ${shadowText}
`;

export const PodiumBlock = styled.span<{ $place: number }>`
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: ${({ $place }) => PODIUM_HEIGHTS[$place] ?? 30}px;
  margin-top: 6px;

  font-family: "Nunito Sans Variable";
  font-size: 1.6rem;
  font-weight: 900;
  color: rgba(48, 32, 6, 0.8);

  background-image: linear-gradient(
    to bottom,
    ${({ $place }) =>
      (MEDAL_COLOURS[$place] ?? ["#ffffff", "#bbbbbb"]).join(", ")}
  );
  border: 2px solid transparent;
  border-radius: 10px 10px 4px 4px;
  box-shadow: inset 0 2px 0 rgba(255, 255, 255, 0.55),
    0 4px 12px rgba(0, 0, 0, 0.35);
`;

/** Fourth place and after, one row each. */
export const Places = styled.ol`
  ${panel}
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin: 12px 0 0;
  padding: 6px;
  list-style: none;
`;

export const PlaceRow = styled.li<{ $you?: boolean }>`
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 38px;
  padding: 2px 8px;

  border: 1px solid ${({ theme, $you }) => ($you ? theme.blue : "transparent")};
  border-radius: 8px;
`;

export const PlaceNo = styled.span<{ $right?: boolean }>`
  min-width: 1.4em;
  font-weight: 900;
  font-variant-numeric: tabular-nums;
  text-align: center;
  color: ${({ $right }) =>
    $right === true ? "lightgreen" : $right === false ? "#ff8a8a" : "inherit"};
`;

export const PlaceName = styled.span`
  flex: 1;
  min-width: 0;
  font-size: 0.9rem;
  font-weight: 800;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

export const PlaceScore = styled.span`
  font-size: 0.8rem;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  color: lightblue;
`;

/** How long until everyone is back in the lobby. */
export const BackBar = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  width: 100%;
  margin-top: 14px;

  font-family: "Nunito Sans Variable";
  font-size: 0.85rem;
  font-weight: 800;
  text-align: center;
  ${shadowText}
`;

export const BackTrack = styled.span`
  display: block;
  width: min(260px, 100%);
  height: 4px;
  overflow: hidden;
  background-color: rgba(255, 255, 255, 0.15);
  border-radius: 999px;

  & > span {
    display: block;
    height: 100%;
    background-color: ${({ theme }) => theme.blue};
    border-radius: inherit;
    transition: width 0.2s linear;
  }
`;

/** Every answer of a game, with who named it. */
export const Rounds = styled(Places)`
  margin-top: 14px;
`;

export const RoundRow = styled(PlaceRow)`
  min-height: 34px;
`;

export const WhoNamed = styled.span`
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 3px;
  max-width: 50%;
`;

export const Nobody = styled.span`
  font-size: 0.75rem;
  font-weight: 800;
  opacity: 0.6;
`;
