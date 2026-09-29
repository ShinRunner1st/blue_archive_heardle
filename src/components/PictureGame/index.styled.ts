import styled from "styled-components";

export {
  BrowseButton,
  CardHeading,
  CardIcon,
  ChoiceSub,
  GuessName,
  GuessRow,
  HintCard,
  HintLabel,
  HintLocked,
  Hints,
  HintSwitch,
  HintValue,
  RunRow,
  SearchRow,
  Skipped,
  Wrapper,
} from "../VoiceGame/index.styled";

/**
 * The picture to name, on a slate tile: halos run from pale yellow to dark
 * navy and weapons from white to black, and a mid tone shows them all, in
 * light mode or dark.
 */
export const Stage = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;

  box-sizing: border-box;
  width: 100%;
  max-width: 320px;
  min-height: 176px;
  margin: 4px auto 10px;
  padding: 16px;

  background: radial-gradient(circle at 50% 40%, #7d8ea3, #56657a);
  border: 1px solid rgba(241, 247, 237, 0.3);
  border-radius: 14px;
  box-shadow: inset 0 0 24px rgba(0, 0, 0, 0.25);

  @media (max-width: 480px) {
    min-height: 150px;
  }
`;

/** A picture cut from its sheet; blank until the sheet has loaded. */
export const Picture = styled.div`
  flex-shrink: 0;
  background-repeat: no-repeat;
`;

/** The small version, in a hint card or on the result's card. */
export const SmallStage = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;

  padding: 4px 6px;

  background: radial-gradient(circle at 50% 40%, #7d8ea3, #56657a);
  border-radius: 8px;
`;

/** Under the picture: which kind, and the keys. */
export const Tip = styled.p`
  margin: 0 0 4px;

  font-size: 0.75rem;
  text-align: center;
  opacity: 0.8;

  & kbd {
    padding: 0 4px;

    font-family: inherit;
    font-size: 0.7rem;

    border: 1px solid ${({ theme }) => theme.border100};
    border-radius: 4px;
  }
`;

/** The result card's weapon name, under the student's. */
export const WeaponName = styled.span`
  font-style: italic;
`;

/** The picture on the result's card, the card's full width. */
export const CardPicture = styled(Stage)`
  max-width: none;
  min-height: 0;
  margin: 14px 0 0;
`;
