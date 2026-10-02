import { IoLockClosed } from "react-icons/io5";

import { MISSIONS } from "../../constants/missions";
import { isUnlocked, offered } from "../../helpers/cosmetics";
import { loadClearedMissions } from "../../helpers/missions";
import { useMissionsVersion } from "../../hooks/useMissions";

import { FoldingRow } from "../FoldingRow";

import * as Styled from "./index.styled";

interface Choice {
  id: string;
  name: string;
  mission?: string;
  /** A colour (or gradient) to show beside the name. */
  swatch?: string;
}

interface Props {
  /** Names the group for screen readers. */
  labelledBy: string;
  choices: Choice[];
  selected: string;
  onPick: (id: string) => void;
  /** The missions cleared: this browser's, or the admin tool's pick. */
  cleared?: string[];
  /** A mission's title by id: the game's, or the admin tool's draft's. */
  titleOf?: (missionId: string | undefined) => string;
}

const missionTitle = (id: string | undefined) =>
  MISSIONS.find((mission) => mission.id === id)?.title ?? "";

/**
 * What missions unlock, as a row of choices: the ones still locked show a
 * lock and say which mission opens them.
 */
export function CosmeticChoices({
  labelledBy,
  choices,
  selected,
  onPick,
  titleOf = missionTitle,
  cleared: given,
}: Props) {
  // Shows a choice unlocked the moment its mission is cleared.
  useMissionsVersion();
  const cleared = given ?? loadClearedMissions();

  return (
    <FoldingRow role="radiogroup" aria-labelledby={labelledBy}>
      {offered(choices, cleared).map((choice) => {
        const open = isUnlocked(choice, cleared);
        return (
          <Styled.Choice
            key={choice.id}
            type="button"
            role="radio"
            aria-checked={selected === choice.id}
            aria-disabled={!open}
            $active={selected === choice.id}
            $locked={!open}
            title={
              open
                ? choice.name
                : `Clear "${titleOf(choice.mission)}" to unlock`
            }
            onClick={() => open && onPick(choice.id)}
          >
            {open ? (
              choice.swatch && (
                <Styled.Swatch
                  aria-hidden="true"
                  style={{ background: choice.swatch }}
                />
              )
            ) : (
              <IoLockClosed aria-hidden="true" />
            )}
            {choice.name}
          </Styled.Choice>
        );
      })}
    </FoldingRow>
  );
}
