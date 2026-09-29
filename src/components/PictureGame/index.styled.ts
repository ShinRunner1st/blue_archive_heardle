import styled from "styled-components";

export {
  BrowseButton,
  Buttons,
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
  min-height: 160px;
  margin: 0 auto 6px;
  padding: 12px;

  background: radial-gradient(circle at 50% 40%, #7d8ea3, #56657a);
  border: 1px solid rgba(241, 247, 237, 0.3);
  border-radius: 14px;
  box-shadow: inset 0 0 24px rgba(0, 0, 0, 0.25);

  /* A little smaller on a short window, so the game fits without a scroll. */
  @media (max-height: 820px), (max-width: 480px) {
    min-height: 128px;

    & > [role="img"] {
      zoom: 0.8;
    }
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

/** Under the picture: the keys, on a screen with a keyboard. */
export const Tip = styled.p`
  margin: 0 0 4px;

  font-size: 0.75rem;
  text-align: center;
  opacity: 0.8;

  @media (hover: none) {
    display: none;
  }

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

/**
 * The picture on the result's card, the card's full width and smaller than
 * in the round, so the result fits beside the buttons on a laptop.
 */
export const CardPicture = styled(Stage)`
  max-width: none;
  min-height: 0;
  margin: 10px 0 0;
  padding: 8px;

  & > [role="img"] {
    zoom: 0.6;
  }

  /* Past the round's own smaller size on a short window, above. */
  @media (max-height: 820px), (max-width: 480px) {
    & > [role="img"] {
      zoom: 0.6;
    }
  }
`;

/**
 * Halo or Weapon, then the silhouette and hints where the mode has them, in
 * one row that wraps only on a narrow phone.
 */
export const OptionRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 6px 14px;

  width: 100%;
  margin-bottom: 8px;

  font-family: "Nunito Sans Variable";
`;
