import { IoLockClosed } from "react-icons/io5";

import { PictureKind } from "../../constants/guessSheets";
import { KIND_NAMES, PictureHint } from "../../helpers/pictureRounds";
import { PICTURE_KINDS } from "../../types/picture";
import { Student } from "../../types/student";

import * as GameStyled from "../Game/index.styled";
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
  if (hint === "silhouette") return <Silhouette id={answer.id} size={60} />;
  if (hint === "picture") {
    return (
      <Styled.SmallStage>
        <GuessPicture
          kind={kind}
          id={answer.id}
          zoom={kind === "halo" ? 0.42 : 0.4}
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

/**
 * Picks the kind, halo or weapon, above the game, and in Classic whether the
 * picture shows as it is or as its silhouette, as Voice mode's hints are
 * turned on and off there.
 */
export function KindRow({
  kind,
  onKindChange,
  silhouette,
  onSilhouetteChange,
}: {
  kind: PictureKind;
  onKindChange: (kind: PictureKind) => void;
  /** Left out where the mode has no choice of it. */
  silhouette?: boolean;
  onSilhouetteChange?: (on: boolean) => void;
}) {
  return (
    <GameStyled.ClipRow>
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
      {silhouette !== undefined && onSilhouetteChange && (
        <>
          <GameStyled.ClipLabel>Silhouette</GameStyled.ClipLabel>
          <Styled.HintSwitch role="group" aria-label="Silhouette">
            {[true, false].map((on) => (
              <Chip
                key={String(on)}
                type="button"
                $active={silhouette === on}
                aria-pressed={silhouette === on}
                onClick={() => onSilhouetteChange(on)}
              >
                {on ? "On" : "Off"}
              </Chip>
            ))}
          </Styled.HintSwitch>
        </>
      )}
    </GameStyled.ClipRow>
  );
}
