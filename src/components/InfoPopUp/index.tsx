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
import { artists } from "../../helpers/searchSong";
import { GameMode } from "../../types/mode";

const OFFICIAL_SITE = "https://bluearchive.nexon.com/";

/**
 * The composers behind most of the soundtrack, read from the song list so the
 * credit keeps up as songs are added. Uncredited tracks are left out.
 */
const COMPOSERS = artists
  .filter((entry) => entry.artist !== "Unknown")
  .map((entry) => entry.artist);
const TOP_COMPOSERS = COMPOSERS.slice(0, 4);
const composerCredit =
  COMPOSERS.length > TOP_COMPOSERS.length
    ? `${TOP_COMPOSERS.join(", ")} and more`
    : TOP_COMPOSERS.join(", ");

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
      actions={
        <>
          <Button variant="green" onClick={onClose}>
            Let&apos;s play
          </Button>
          {canReset && (
            <Button variant="red" onClick={handleReset}>
              {isDaily ? "Reset daily stats" : "Reset Score"}
            </Button>
          )}
        </>
      }
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
              <a href={OFFICIAL_SITE} target="_blank" rel="noopener noreferrer">
                Blue Archive
              </a>{" "}
              is developed by NEXON Games and published by NEXON and Yostar. Its
              music, characters, artwork and cursor belong to their rights
              holders. Soundtrack by {composerCredit}.
            </PopUpCardText>
            <PopUpCardText>
              This is an unofficial fan game, not affiliated with or endorsed by
              NEXON Games, NEXON or Yostar.
            </PopUpCardText>
          </PopUpCardBody>
        </PopUpCard>
      </PopUpBody>

      {LAST_UPDATED && <PopUpMeta>Last updated {LAST_UPDATED}</PopUpMeta>}
    </PopUp>
  );
}
