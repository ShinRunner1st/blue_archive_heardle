import {
  IoCalendarNumber,
  IoGrid,
  IoInfinite,
  IoMic,
  IoPeople,
  IoSparkles,
  IoStopwatch,
} from "react-icons/io5";

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
  [
    "Shift+Enter",
    "Skip (in Voice, for a hint), give up on the last try, or pass in Time Attack",
  ],
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
              In Endless: hear a short clip, 1 to 7 seconds as you like, then
              pick the song from four that sound alike. One try, its own streak,
              no badges.
            </PopUpCardText>
          </PopUpCardBody>
        </PopUpCard>
        <PopUpCard>
          <PopUpCardIcon>
            <IoStopwatch aria-hidden="true" />
          </PopUpCardIcon>
          <PopUpCardBody>
            <PopUpCardTitle>Time Attack</PopUpCardTitle>
            <PopUpCardText>
              In Endless: name as many songs as you can in three minutes, typed
              or from four. A miss or a pass costs two seconds. No badges.
            </PopUpCardText>
          </PopUpCardBody>
        </PopUpCard>
        <PopUpCard>
          <PopUpCardIcon>
            <IoMic aria-hidden="true" />
          </PopUpCardIcon>
          <PopUpCardBody>
            <PopUpCardTitle>Voice</PopUpCardTitle>
            <PopUpCardText>
              Switch to Voice under the header and name the student from a line
              they say: their title call or one from the lobby. Each costume is
              its own answer. You get four tries, and each miss or skip shows a
              hint: their school, then their club, then their silhouette. Pick a
              name, then press Enter or Guess. In Endless, Classic can turn its
              hints off, 4-Choice is one pick from four, and Time Attack is as
              many as you can in three minutes, every line or title calls only.
            </PopUpCardText>
          </PopUpCardBody>
        </PopUpCard>
        <PopUpCard>
          <PopUpCardIcon>
            <IoSparkles aria-hidden="true" />
          </PopUpCardIcon>
          <PopUpCardBody>
            <PopUpCardTitle>Picture</PopUpCardTitle>
            <PopUpCardText>
              Switch to Picture under the header and name the student from their
              halo or their weapon, picked above the game. Costumes share a halo
              and most share a gun, so naming any student it belongs to is
              right. You get four tries, and each miss or skip shows a hint:
              their school, then their club, then their silhouette. In Endless,
              Classic can turn the hints off, 4-Choice is one pick from four,
              and Time Attack is as many as you can in three minutes. Classic,
              4-Choice and Time Attack can show only the picture&apos;s
              silhouette.
            </PopUpCardText>
          </PopUpCardBody>
        </PopUpCard>
        <PopUpCard>
          <PopUpCardIcon>
            <IoPeople aria-hidden="true" />
          </PopUpCardIcon>
          <PopUpCardBody>
            <PopUpCardTitle>Students</PopUpCardTitle>
            <PopUpCardText>
              Switch to Students under the header and find the student, daily or
              endless. Each guess shows how it compares with the answer: green
              is right, yellow is close, red is wrong, and arrows point higher
              or lower. Gameplay compares school, role, damage, defense, weapon,
              EX cost and release; each costume is its own answer. Lore compares
              height, birthday, school year, club, favourite gift and more. Pick
              a name, then press Enter or Guess; Random first guess picks one to
              start with.
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
