import React from "react";
import {
  IoCalendarNumber,
  IoMusicalNotes,
  IoShuffle,
  IoStatsChart,
  IoCafe,
} from "react-icons/io5";

import { Button } from "../Button";
import {
  PopUp,
  PopUpActions,
  PopUpBody,
  PopUpCard,
  PopUpCardBody,
  PopUpCardIcon,
  PopUpCardText,
  PopUpCardTitle,
  PopUpMeta,
} from "../PopUp";
import { LAST_UPDATED } from "../../constants/game";
import { songs } from "../../constants";
import { GameMode } from "../../types/mode";

interface Props {
  onClose: () => void;
  canReset: boolean;
  onReset: () => void;
  mode: GameMode;
}

export function InfoPopUp({ onClose, canReset, onReset, mode }: Props) {
  const isDaily = mode === "daily";
  const handleReset = React.useCallback(() => {
    onReset();
    onClose();
  }, [onReset, onClose]);

  return (
    <PopUp
      title="Welcome, Sensei 👋"
      subtitle="Guess the Blue Archive OST from a few seconds of audio."
      onClose={onClose}
    >
      <PopUpBody>
        <PopUpCard>
          <PopUpCardIcon>
            <IoMusicalNotes aria-hidden="true" />
          </PopUpCardIcon>
          <PopUpCardBody>
            <PopUpCardTitle>Six tries, one track</PopUpCardTitle>
            <PopUpCardText>
              Each skip or wrong guess unlocks a little more of the clip.
            </PopUpCardText>
          </PopUpCardBody>
        </PopUpCard>

        <PopUpCard>
          <PopUpCardIcon>
            {isDaily ? (
              <IoCalendarNumber aria-hidden="true" />
            ) : (
              <IoShuffle aria-hidden="true" />
            )}
          </PopUpCardIcon>
          <PopUpCardBody>
            <PopUpCardTitle>
              {isDaily ? "One track a day" : "No repeats"}
            </PopUpCardTitle>
            <PopUpCardText>
              {isDaily
                ? "Every Sensei gets the same song today. Switch to Endless in the header to keep playing."
                : `All ${songs.length} tracks play once before any comes round again.`}
            </PopUpCardText>
          </PopUpCardBody>
        </PopUpCard>

        <PopUpCard>
          <PopUpCardIcon>
            <IoStatsChart aria-hidden="true" />
          </PopUpCardIcon>
          <PopUpCardBody>
            <PopUpCardTitle>Your run is saved</PopUpCardTitle>
            <PopUpCardText>
              Close the tab whenever — your score and progress are kept.
            </PopUpCardText>
          </PopUpCardBody>
        </PopUpCard>

        <PopUpCard>
          <PopUpCardIcon>
            <IoCafe aria-hidden="true" />
          </PopUpCardIcon>
          <PopUpCardBody>
            <PopUpCardTitle>Credit</PopUpCardTitle>
            <PopUpCardText>
              Most tracks come from{" "}
              <a
                href="https://www.youtube.com/@mo2bluearchive"
                target="_blank"
                rel="noopener noreferrer"
              >
                MO2 Channel
              </a>
              .
            </PopUpCardText>
          </PopUpCardBody>
        </PopUpCard>
      </PopUpBody>

      {LAST_UPDATED && <PopUpMeta>Last updated {LAST_UPDATED}</PopUpMeta>}

      <PopUpActions>
        <Button variant="green" onClick={onClose}>
          Let&apos;s play
        </Button>
        {canReset && (
          <Button variant="red" onClick={handleReset}>
            {isDaily ? "Reset daily stats" : "Reset Score"}
          </Button>
        )}
      </PopUpActions>
    </PopUp>
  );
}
