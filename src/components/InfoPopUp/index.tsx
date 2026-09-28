import React from "react";
import {
  IoCalendarNumber,
  IoGrid,
  IoMusicalNotes,
  IoShuffle,
  IoStatsChart,
  IoCafe,
  IoShieldCheckmark,
  IoHeart,
  IoStopwatch,
  IoPeople,
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
import { KOFI_URL, LAST_UPDATED } from "../../constants/game";
import { songs } from "../../constants";
import { artists } from "../../helpers/searchSong";
import { Game, GameMode } from "../../types/mode";

const OFFICIAL_SITE = "https://bluearchive.nexon.com/";
const SCHALEDB = "https://schaledb.com/";

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
  /** Which game the welcome is about; the OST unless told. */
  game?: Game;
}

export function InfoPopUp({
  onClose,
  canReset,
  onReset,
  mode,
  game = "ost",
}: Props) {
  const isDaily = mode === "daily";
  const isStudents = game === "students";
  const handleReset = React.useCallback(() => {
    onReset();
    onClose();
  }, [onReset, onClose]);

  return (
    <PopUp
      title="Welcome, Sensei 👋"
      subtitle={
        isStudents
          ? "Guess the Blue Archive student from how they compare."
          : "Guess the Blue Archive OST from a few seconds of audio."
      }
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
        {isStudents ? (
          <PopUpCard>
            <PopUpCardIcon>
              <IoPeople aria-hidden="true" />
            </PopUpCardIcon>
            <PopUpCardBody>
              <PopUpCardTitle>Find the student</PopUpCardTitle>
              <PopUpCardText>
                Each guess shows how its school, role, birthday and more compare
                with the answer&apos;s. Arrows point higher or lower. Guess as
                often as you like.
              </PopUpCardText>
            </PopUpCardBody>
          </PopUpCard>
        ) : mode === "timeattack" ? (
          <PopUpCard>
            <PopUpCardIcon>
              <IoStopwatch aria-hidden="true" />
            </PopUpCardIcon>
            <PopUpCardBody>
              <PopUpCardTitle>Three minutes, go</PopUpCardTitle>
              <PopUpCardText>
                Name as many songs as you can, one try each. The clock stops
                while a song loads.
              </PopUpCardText>
            </PopUpCardBody>
          </PopUpCard>
        ) : mode === "choice" ? (
          <PopUpCard>
            <PopUpCardIcon>
              <IoGrid aria-hidden="true" />
            </PopUpCardIcon>
            <PopUpCardBody>
              <PopUpCardTitle>One pick from four</PopUpCardTitle>
              <PopUpCardText>
                Hear a short clip, as long as you like up to 7 seconds, then
                pick the song from four that sound alike.
              </PopUpCardText>
            </PopUpCardBody>
          </PopUpCard>
        ) : (
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
        )}

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
              {isDaily
                ? isStudents
                  ? "One student a day"
                  : "One track a day"
                : "No repeats"}
            </PopUpCardTitle>
            <PopUpCardText>
              {isDaily
                ? `Every Sensei gets the same ${
                    isStudents ? "student" : "song"
                  } today. Switch to Endless in the header to keep playing.`
                : isStudents
                ? "Every student comes up once before any comes round again."
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
            <IoShieldCheckmark aria-hidden="true" />
          </PopUpCardIcon>
          <PopUpCardBody>
            <PopUpCardTitle>Your privacy</PopUpCardTitle>
            <PopUpCardText>
              No accounts, cookies, ads or analytics, and nothing is tracked.
              Your score, streaks and settings are saved only in this browser
              and never sent anywhere.
            </PopUpCardText>
            <PopUpCardText>
              Like any website, the services that deliver it — Vercel for the
              game, Cloudflare for the music and pictures — see basic connection
              details, such as your IP address, to send you the pages.
            </PopUpCardText>
          </PopUpCardBody>
        </PopUpCard>

        <PopUpCard>
          <PopUpCardIcon>
            <IoHeart aria-hidden="true" />
          </PopUpCardIcon>
          <PopUpCardBody>
            <PopUpCardTitle>Support the game</PopUpCardTitle>
            <PopUpCardText>
              Blue Archive Heardle is free, with no ads or tracking. If you
              enjoy it, you can{" "}
              <a href={KOFI_URL} target="_blank" rel="noopener noreferrer">
                buy me a coffee on Ko-fi
              </a>{" "}
              ☕
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
              holders. Soundtrack by {composerCredit}. Student data and icons
              from{" "}
              <a href={SCHALEDB} target="_blank" rel="noopener noreferrer">
                SchaleDB
              </a>
              .
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
