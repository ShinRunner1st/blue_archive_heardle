import {
  IoCheckmarkCircle,
  IoEllipseOutline,
  IoLockClosed,
} from "react-icons/io5";

import { PictureKind } from "../../constants/guessSheets";
import { KIND_NAMES, PictureHint } from "../../helpers/pictureRounds";
import { PICTURE_KINDS, PictureOptions } from "../../types/picture";
import { Student } from "../../types/student";

import { Chip } from "../SongListPopUp/index.styled";
import { ClueIcon, hasClueIcon, Silhouette } from "../StudentIcon";

import { GuessPicture } from "./GuessPicture";

import * as Styled from "./index.styled";

const HINT_LABELS: Record<PictureHint, string> = {
  school: "School",
  club: "Club",
  silhouette: "Silhouette",
  picture: "Picture",
};

/**
 * The hints, a card each, opened one per miss, as Voice mode's. A locked
 * card holds nothing of the answer: the school, club, silhouette or picture
 * only reach the page once they show.
 */
export function PictureHints({
  kind,
  answer,
  hints,
  shown,
}: {
  kind: PictureKind;
  answer: Student;
  hints: PictureHint[];
  shown: number;
}) {
  return (
    <Styled.Hints aria-label="Hints">
      {hints.map((hint, index) => {
        const open = index < shown;
        return (
          <Styled.HintCard key={hint} $open={open}>
            <Styled.HintLabel>{HINT_LABELS[hint]}</Styled.HintLabel>
            {open ? (
              <HintValue kind={kind} hint={hint} answer={answer} />
            ) : (
              <Styled.HintLocked>
                <IoLockClosed aria-hidden="true" />
                {index === 0 ? "After 1 miss" : `After ${index + 1} misses`}
              </Styled.HintLocked>
            )}
          </Styled.HintCard>
        );
      })}
    </Styled.Hints>
  );
}

function HintValue({
  kind,
  hint,
  answer,
}: {
  kind: PictureKind;
  hint: PictureHint;
  answer: Student;
}) {
  if (hint === "silhouette") return <Silhouette id={answer.id} size={48} />;
  if (hint === "picture") {
    return (
      <Styled.SmallStage>
        <GuessPicture
          kind={kind}
          id={answer.id}
          zoom={kind === "halo" ? 0.36 : 0.34}
        />
      </Styled.SmallStage>
    );
  }
  if (hint === "club") {
    return <Styled.HintValue>{answer.club}</Styled.HintValue>;
  }

  const icon = `school/${answer.school}`;
  return (
    <Styled.HintValue>
      {hasClueIcon(icon) && <ClueIcon iconKey={icon} size={28} />}
      {answer.school}
    </Styled.HintValue>
  );
}

/** A choice above the game that's on or off, with a tick when on. */
function Toggle({
  label,
  on,
  onChange,
}: {
  label: string;
  on: boolean;
  onChange: (on: boolean) => void;
}) {
  return (
    <Chip
      type="button"
      $active={on}
      aria-pressed={on}
      onClick={() => onChange(!on)}
    >
      {on ? (
        <IoCheckmarkCircle aria-hidden="true" />
      ) : (
        <IoEllipseOutline aria-hidden="true" />
      )}
      {label}
    </Chip>
  );
}

/**
 * Picks the kind, halo or weapon, above the game, and where the mode has
 * them, whether the picture shows as its silhouette and whether misses
 * open hints, as Voice mode's hints are turned on and off there. One row,
 * so the game keeps its height.
 */
export function KindRow({
  kind,
  onKindChange,
  options,
  toggles = [],
  onOptionsChange,
}: {
  kind: PictureKind;
  onKindChange: (kind: PictureKind) => void;
  options?: PictureOptions;
  /** The options this mode lets the player pick. */
  toggles?: Array<keyof PictureOptions>;
  onOptionsChange?: (options: PictureOptions) => void;
}) {
  return (
    <Styled.OptionRow>
      <Styled.HintSwitch role="group" aria-label="Name the student from">
        {PICTURE_KINDS.map((each) => (
          <Chip
            key={each}
            type="button"
            $active={kind === each}
            aria-pressed={kind === each}
            onClick={() => onKindChange(each)}
          >
            {KIND_NAMES[each]}
          </Chip>
        ))}
      </Styled.HintSwitch>
      {options && onOptionsChange && toggles.length > 0 && (
        <Styled.HintSwitch role="group" aria-label="Options">
          {toggles.includes("shape") && (
            <Toggle
              label="Silhouette"
              on={options.shape}
              onChange={(shape) => onOptionsChange({ ...options, shape })}
            />
          )}
          {toggles.includes("hints") && (
            <Toggle
              label="Hints"
              on={options.hints}
              onChange={(hints) => onOptionsChange({ ...options, hints })}
            />
          )}
        </Styled.HintSwitch>
      )}
    </Styled.OptionRow>
  );
}
