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

/**
 * Everyone in the room, as cards that keep their place all game: as wide
 * as the lobby, a little wider than the stage, so four fit to a row.
 */
export const PlayerGrid = styled.ol`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px 8px;
  align-self: center;

  box-sizing: border-box;
  width: min(720px, calc(100vw - 32px));
  margin: 10px 0 0;
  padding: 0;

  font-family: "Nunito Sans Variable";
  list-style: none;

  @media (min-width: 600px) {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
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
  display: block;
  min-width: 22px;
  padding: 1px 5px;

  font-size: 1rem;
  font-weight: 900;
  line-height: 1.35;
  font-variant-numeric: tabular-nums;
  text-align: center;
  color: ${({ $some }) => ($some ? "lightgreen" : "inherit")};

  background-color: ${({ $some }) =>
    $some ? "rgba(76, 175, 80, 0.25)" : "rgba(14, 12, 30, 0.55)"};
  border-radius: 8px;
`;

/** The top three's medal, on the corner of their picture. */
export const FaceMedal = styled.span`
  position: absolute;
  right: -6px;
  bottom: -5px;
  font-size: 0.8rem;
  line-height: 1;
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
  /* Under the players' cards, as wide. */
  align-self: center;
  width: min(720px, calc(100vw - 32px));
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
}>`
  grid-row: 1;
  grid-column: ${({ $column }) => $column};
  display: flex;
  flex-direction: column;
  align-items: stretch;
  min-width: 0;

  /* Third rises first, the winner last. */
  animation: ${rise} 0.45s ease-out both;
  animation-delay: ${({ $place }) => PODIUM_DELAYS[$place] ?? 0}s;
`;

/** The card on its block: the winner's a little taller. */
export const PodiumCard = styled.div<{ $place: number }>`
  --card-tall: ${({ $place }) => ($place === 1 ? 140 : 124)}px;
`;

export const PodiumMedal = styled.span`
  position: absolute;
  right: -8px;
  bottom: -6px;
  font-size: 1.3rem;
  line-height: 1;
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

/** Fourth place and after, a row each. */
export const Places = styled.ol`
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 6px 8px;
  box-sizing: border-box;
  width: 100%;
  margin: 10px 0 0;
  padding: 0;
  list-style: none;

  /* Two to a row where there's room, so eight players' standings keep
     Back to the lobby on a 1080p screen. */
  @media (min-width: 640px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
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
export const Rounds = styled.ol`
  ${panel}
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin: 14px 0 0;
  padding: 6px;
  list-style: none;
`;

export const RoundRow = styled.li`
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 34px;
  padding: 2px 8px;
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

/**
 * The lobby: the room's ticket, the players two to a row and the buttons,
 * in the page's middle column. Where the character stands left of it
 * (1100 px up, see Character), it stays clear of her and leaves the right
 * of the page free, for a chat later.
 */
export const LobbyLayout = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
  align-self: center;

  box-sizing: border-box;
  width: min(720px, calc(100vw - 32px));

  font-family: "Nunito Sans Variable";

  @media (max-width: 600px) {
    gap: 10px;
  }
`;

export const Ticket = styled.section`
  ${panel}
  overflow: hidden;
  border-radius: 14px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
`;

/**
 * The ticket's head: a blue strip across its whole top, with faint slanted
 * stripes at its end like the banners'.
 */
export const TicketStrip = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px 10px 18px;

  color: #ffffff;
  background: repeating-linear-gradient(
        115deg,
        rgba(255, 255, 255, 0.09) 0 5px,
        transparent 5px 12px
      )
      right / 180px 100% no-repeat,
    linear-gradient(100deg, #1f5fd6, #128afa);

  @media (max-width: 600px) {
    gap: 10px;
    padding: 8px 12px 8px 14px;
  }
`;

export const TicketLabel = styled.span`
  font-size: 0.75rem;
  font-weight: 900;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #cfe6ff;
`;

export const TicketCode = styled.span`
  font-size: 2.5rem;
  font-weight: 900;
  line-height: 1;
  letter-spacing: 0.2em;
  text-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);

  @media (max-width: 600px) {
    font-size: 1.7rem;
  }
`;

export const TicketCopies = styled.div`
  display: flex;
  gap: 8px;
  margin-left: auto;
`;

/** The ticket's round buttons: Copy code, Copy link, the host's gear. */
export const TicketButton = styled.button<{ $done?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  padding: 0;

  font-size: 18px;
  color: #ffffff;

  background-color: ${({ $done }) =>
    $done ? "rgba(76, 175, 80, 0.85)" : "rgba(14, 12, 30, 0.35)"};
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  cursor: pointer;

  &:hover:not(:disabled) {
    background-color: ${({ $done }) =>
      $done ? "rgba(76, 175, 80, 0.85)" : "rgba(14, 12, 30, 0.55)"};
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

export const TicketChips = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;

  @media (max-width: 600px) {
    padding: 0 12px 12px;
  }
`;

export const ChipRow = styled.ul`
  display: flex;
  flex: 1 1 auto;
  flex-wrap: wrap;
  gap: 5px;
  margin: 0;
  padding: 0;
  list-style: none;
`;

/** A setting as a chip: its icon and value, its name for a pointer. */
export const SettingChip = styled.li`
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px 4px 8px;

  font-size: 0.8rem;
  font-weight: 800;
  white-space: nowrap;

  background-color: rgba(255, 255, 255, 0.08);
  border-radius: 999px;

  & > svg {
    flex-shrink: 0;
    color: #8ab8ff;
  }

  &:first-child {
    background-color: ${({ theme }) => theme.blue};

    & > svg {
      color: #ffffff;
    }
  }
`;

/** The setting's name, for screen readers: the chip shows the value. */
export const ChipLabel = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
`;

/** On a phone: the settings in a line, Details opening the chips. */
export const TicketDetails = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 2px 12px 2px 4px;
`;

export const DetailsToggle = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1 1 auto;
  min-width: 0;
  min-height: 44px;
  padding: 0 8px;

  font-family: inherit;
  text-align: left;
  color: ${({ theme }) => theme.text};

  background: transparent;
  border: none;
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.border};
    outline-offset: -2px;
  }
`;

export const DetailsLine = styled.span`
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  font-size: 0.82rem;
  font-weight: 800;
`;

export const DetailsWord = styled.span`
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;

  font-size: 0.75rem;
  font-weight: 800;
  opacity: 0.75;
`;

/**
 * Leave and Start under the players; on a phone pinned to the foot of the
 * play area, so Start is in reach however many have joined.
 */
export const LobbyButtons = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
  margin-top: 4px;

  & > button {
    min-width: 120px;
  }

  & > button:last-child:not(:first-child) {
    min-width: 220px;
  }

  @media (max-width: 600px) {
    position: sticky;
    bottom: 0;
    z-index: 3;
    margin: 0 -16px;
    padding: 18px 16px 10px;
    background: linear-gradient(
      ${({ theme }) => theme.background1}00,
      ${({ theme }) => theme.background1}f2 35%
    );

    & > button {
      min-width: 100px;
    }

    & > button:last-child:not(:first-child) {
      flex: 1 1 auto;
      min-width: 0;
    }
  }
`;

export const LobbyPlayers = styled.section`
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
`;

export const PlayersHead = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  padding: 0 4px;
`;

export const PlayersTitle = styled.h2`
  margin: 0;
  font-size: 1.3rem;
  font-weight: 900;
  ${shadowText}

  & > span {
    font-weight: 700;
    opacity: 0.7;
  }

  @media (max-width: 600px) {
    font-size: 1.05rem;
  }
`;

export const PlayersHint = styled.span<{ $start?: boolean }>`
  margin: 0;

  font-size: 0.85rem;
  font-weight: 700;
  opacity: 0.85;
  text-align: ${({ $start }) => ($start ? "left" : "right")};
  ${shadowText}

  @media (max-width: 600px) {
    font-size: 0.75rem;
  }
`;

/** The page before a room: its name and a line on what it is. */
export const EntryHead = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 4px 16px;
  flex-wrap: wrap;
  padding: 0 4px;
`;

export const EntryTitle = styled.h1`
  margin: 0;
  font-size: 1.8rem;
  font-weight: 900;
  ${shadowText}

  @media (max-width: 600px) {
    font-size: 1.4rem;
  }
`;

/** Picture and Edit profile, on the player's card. */
export const YouActions = styled.div`
  display: flex;
  gap: 6px;
`;

/** A round chip on the card; only its icon on a phone. */
export const YouButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 12px;

  font-family: inherit;
  font-size: 0.8rem;
  font-weight: 800;
  white-space: nowrap;
  color: #ffffff;

  background-color: rgba(14, 12, 30, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 999px;
  cursor: pointer;

  &:hover {
    background-color: ${({ theme }) => theme.blue};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.border};
    outline-offset: 2px;
  }

  svg {
    flex-shrink: 0;
    font-size: 1rem;
  }

  @media (max-width: 600px) {
    padding: 7px;

    span {
      display: none;
    }
  }
`;

export const YouNote = styled.p`
  margin: 6px 4px 0;
  font-size: 0.82rem;
  font-weight: 700;
  opacity: 0.85;
  ${shadowText}
`;

/** Join a room and Make a room, side by side, stacked on a phone. */
export const EntryCards = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;

  @media (max-width: 600px) {
    grid-template-columns: minmax(0, 1fr);
    gap: 10px;
  }
`;

export const BigCard = styled.section`
  ${panel}
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: 16px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
`;

/** The card's scene, its title over the foot of it, fading into the card. */
export const BigScene = styled.div`
  position: relative;
  isolation: isolate;
  flex-shrink: 0;
  height: 132px;
  overflow: hidden;

  &::after {
    content: "";
    position: absolute;
    inset: 0;
    z-index: -1;
    background: linear-gradient(
      180deg,
      transparent 30%,
      ${({ theme }) => theme.background1}e6 100%
    );
  }

  @media (max-width: 600px) {
    height: 96px;
  }
`;

export const BigTitle = styled.h2`
  position: absolute;
  left: 16px;
  bottom: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;

  font-size: 1.4rem;
  font-weight: 900;
  color: #ffffff;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.7);

  svg {
    color: #8ab8ff;
  }

  @media (max-width: 600px) {
    font-size: 1.2rem;
  }
`;

export const BigBody = styled.div`
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 12px;
  padding: 8px 16px 16px;

  @media (max-width: 600px) {
    gap: 10px;
    padding: 6px 12px 12px;
  }
`;

export const BigText = styled.p`
  margin: 0;
  font-size: 0.85rem;
  font-weight: 700;
  opacity: 0.85;
`;

/** The code box and Paste, on one row. */
export const CodeField = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

/** The code typed in the code's own big letters. */
export const CodeBox = styled.input`
  box-sizing: border-box;
  flex: 1 1 auto;
  min-width: 0;
  height: 48px;
  padding: 0 12px;

  font-family: inherit;
  font-size: 1.9rem;
  font-weight: 900;
  letter-spacing: 0.3em;
  text-align: center;
  text-transform: uppercase;
  color: ${({ theme }) => theme.text};

  background-color: rgba(0, 0, 0, 0.22);
  border: 1px solid ${({ theme }) => theme.background100};
  border-radius: 10px;

  &::placeholder {
    color: ${({ theme }) => theme.text};
    opacity: 0.3;
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.border};
    outline-offset: 2px;
  }
`;

/** The card's buttons at its foot, the main one filling the row. */
export const BigFoot = styled.div`
  display: flex;
  gap: 10px;
  margin-top: auto;

  & > button:last-child {
    flex: 1 1 auto;
  }
`;

/** A button that reads as a link, inside a line of text. */
export const TextButton = styled.button`
  padding: 0;

  font-family: inherit;
  font-size: inherit;
  font-weight: 800;
  color: inherit;
  text-decoration: underline;

  background: none;
  border: none;
  cursor: pointer;
`;

/** The players two to a row, on a phone too. */
export const LobbyGrid = styled.ol`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin: 0;
  padding: 0;
  list-style: none;

  @media (max-width: 600px) {
    gap: 8px;
  }
`;

/** Host, Ready, Away: a small chip in the card's top corner. */
export const LobbyState = styled.span<{ $host?: boolean; $ready?: boolean }>`
  display: block;
  padding: 2px 9px;

  font-size: 0.72rem;
  font-weight: 800;
  white-space: nowrap;
  color: ${({ $host, $ready }) =>
    $host ? "#f2c14e" : $ready ? "lightgreen" : "inherit"};

  background-color: rgba(14, 12, 30, 0.72);
  border-radius: 999px;

  @media (max-width: 600px) {
    padding: 1px 6px;
    font-size: 0.62rem;
  }
`;

/** The host's Kick on a lobby card, beside its state in the corner. */
export const CardKick = styled(Kick)`
  height: 20px;
  min-width: 20px;
  background-color: ${({ $armed }) =>
    $armed ? "rgba(255, 77, 77, 0.6)" : "rgba(14, 12, 30, 0.72)"};
`;

/** A place still free: a dashed card, as tall as a player's. */
export const FreePlace = styled.li`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  box-sizing: border-box;
  min-height: 106px;

  font-size: 0.9rem;
  font-weight: 800;
  opacity: 0.6;

  border: 2px dashed rgba(255, 255, 255, 0.25);
  border-radius: 16px;

  & > span {
    font-size: 1.4rem;
    font-weight: 300;
  }

  @media (max-width: 600px) {
    min-height: 82px;
    font-size: 0.8rem;
  }
`;

/** A guest's note where the host's Start would be. */
export const Waiting = styled.span`
  font-size: 0.85rem;
  font-weight: 700;
  opacity: 0.8;
`;
