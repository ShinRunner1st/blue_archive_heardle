import { IoCalendarNumber, IoGrid, IoInfinite } from "react-icons/io5";

import { CHOICE_CLIP_SECONDS } from "../../constants/game";

import { Button } from "../Button";
import {
  PopUp,
  PopUpBody,
  PopUpCard,
  PopUpCardBody,
  PopUpCardIcon,
  PopUpCardText,
  PopUpCardTitle,
  PopUpChip,
  PopUpChips,
  PopUpGroupLabel,
  PopUpSpacer,
} from "../PopUp";

import * as Styled from "./index.styled";

interface Props {
  onClose: () => void;
}

const STEPS: Array<[string, string]> = [
  ["Listen", "Hit play to hear the opening seconds of the track."],
  ["Search", "Type in the box and pick a track from the results."],
  ["Guess", "Submit it, or skip to unlock more of the clip."],
];

const SEARCH_BY = ["Name", "OST number", "Artist"];

const SHORTCUTS: Array<[string, string]> = [
  ["A–Z", "Start typing anywhere to search"],
  ["Space", "Play or pause the clip, or the answer"],
  ["↑ ↓", "Move through search results"],
  ["Enter", "Pick a result, submit it, then go to the next song"],
  ["Shift+Enter", "Skip, or give up on the last try"],
  ["1–4", "Pick an answer in 4-Choice"],
  ["Esc", "Clear the search box"],
];

export function HowToPopUp({ onClose }: Props) {
  return (
    <PopUp
      title="How to play"
      subtitle="Name the track in as few tries as you can."
      onClose={onClose}
      actions={
        <Button variant="green" onClick={onClose}>
          Got it
        </Button>
      }
    >
      <PopUpBody>
        <Styled.Steps>
          {STEPS.map(([title, text]) => (
            <Styled.Step key={title}>
              <Styled.StepBody>
                <Styled.StepTitle>{title}</Styled.StepTitle>
                <Styled.StepText>{text}</Styled.StepText>
              </Styled.StepBody>
            </Styled.Step>
          ))}
        </Styled.Steps>

        <PopUpSpacer />

        <PopUpGroupLabel>Ways to play</PopUpGroupLabel>
        <PopUpCard>
          <PopUpCardIcon>
            <IoCalendarNumber aria-hidden="true" />
          </PopUpCardIcon>
          <PopUpCardBody>
            <PopUpCardTitle>Daily</PopUpCardTitle>
            <PopUpCardText>
              One track a day, the same for every Sensei — so a shared result
              means something.
            </PopUpCardText>
          </PopUpCardBody>
        </PopUpCard>
        <PopUpCard>
          <PopUpCardIcon>
            <IoInfinite aria-hidden="true" />
          </PopUpCardIcon>
          <PopUpCardBody>
            <PopUpCardTitle>Endless</PopUpCardTitle>
            <PopUpCardText>
              Play as long as you like. Each mode keeps its own score.
            </PopUpCardText>
          </PopUpCardBody>
        </PopUpCard>
        <PopUpCard>
          <PopUpCardIcon>
            <IoGrid aria-hidden="true" />
          </PopUpCardIcon>
          <PopUpCardBody>
            <PopUpCardTitle>4-Choice</PopUpCardTitle>
            <PopUpCardText>
              In Endless: hear {CHOICE_CLIP_SECONDS} seconds, then pick the song
              from four that sound alike. One try, its own streak, no badges.
            </PopUpCardText>
          </PopUpCardBody>
        </PopUpCard>

        <PopUpSpacer />

        <PopUpGroupLabel>You can search by</PopUpGroupLabel>
        <PopUpChips>
          {SEARCH_BY.map((option) => (
            <PopUpChip key={option}>{option}</PopUpChip>
          ))}
        </PopUpChips>

        <PopUpSpacer />

        <PopUpGroupLabel>Keyboard shortcuts</PopUpGroupLabel>
        <Styled.Shortcuts>
          {SHORTCUTS.map(([keys, description]) => (
            <div key={keys} style={{ display: "contents" }}>
              <dt>
                <Styled.Key>{keys}</Styled.Key>
              </dt>
              <dd>{description}</dd>
            </div>
          ))}
        </Styled.Shortcuts>
      </PopUpBody>
    </PopUp>
  );
}
