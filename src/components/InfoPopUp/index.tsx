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
  IoMic,
  IoSparkles,
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
import { PAGES } from "../../constants/pages";
import { songs } from "../../constants";
import { artists } from "../../helpers/searchSong";
import { Game, GameMode } from "../../types/mode";
import { PictureKind } from "../../types/picture";

const OFFICIAL_SITE = "https://bluearchive.nexon.com/";
const SCHALEDB = "https://schaledb.com/";
const FANDOM_WIKI = "https://blue-archive.fandom.com/";

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
  mode: GameMode;
  /** Which game the welcome is about; the OST unless told. */
  game?: Game;
  /** The picture game's kind, halo or weapon. */
  pictureKind?: PictureKind;
}

export function InfoPopUp({
  onClose,
  mode,
  game = "ost",
  pictureKind = "halo",
}: Props) {
  const isDaily = mode === "daily";
  const isStudents = game === "students";
  const isVoice = game === "voice";
  const isPicture = game === "picture";
  const answer = isStudents || isVoice || isPicture ? "student" : "song";

  return (
    <PopUp
      title="Welcome, Sensei 👋"
      subtitle={
        isStudents
          ? "Guess the Blue Archive student from how they compare."
          : isVoice
          ? "Guess the Blue Archive student from their voice."
          : isPicture
          ? `Guess the Blue Archive student from their ${pictureKind}.`
          : "Guess the Blue Archive OST from a few seconds of audio."
      }
      onClose={onClose}
      actions={
        <Button variant="green" onClick={onClose}>
          Let&apos;s play
        </Button>
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
        ) : isPicture ? (
          <PopUpCard>
            <PopUpCardIcon>
              {mode === "timeattack" ? (
                <IoStopwatch aria-hidden="true" />
              ) : mode === "choice" ? (
                <IoGrid aria-hidden="true" />
              ) : (
                <IoSparkles aria-hidden="true" />
              )}
            </PopUpCardIcon>
            <PopUpCardBody>
              <PopUpCardTitle>
                {mode === "timeattack"
                  ? "Three minutes, go"
                  : mode === "choice"
                  ? "One pick from four"
                  : `Four tries, one ${pictureKind}`}
              </PopUpCardTitle>
              <PopUpCardText>
                {mode === "timeattack"
                  ? `Name as many students as you can by their ${pictureKind}, one try each. Pick pictures or silhouettes before you start.`
                  : mode === "choice"
                  ? `See a ${pictureKind}, then pick whose it is from four students.`
                  : `See a ${pictureKind}, and name any student it belongs to. Each miss shows a hint: their school, then their club, then their silhouette. In Endless, Classic can turn the hints off, and Classic and 4-Choice can show only the ${pictureKind}'s silhouette.`}
              </PopUpCardText>
            </PopUpCardBody>
          </PopUpCard>
        ) : isVoice ? (
          <PopUpCard>
            <PopUpCardIcon>
              {mode === "timeattack" ? (
                <IoStopwatch aria-hidden="true" />
              ) : mode === "choice" ? (
                <IoGrid aria-hidden="true" />
              ) : (
                <IoMic aria-hidden="true" />
              )}
            </PopUpCardIcon>
            <PopUpCardBody>
              <PopUpCardTitle>
                {mode === "timeattack"
                  ? "Three minutes, go"
                  : mode === "choice"
                  ? "One pick from four"
                  : "Four tries, one voice"}
              </PopUpCardTitle>
              <PopUpCardText>
                {mode === "timeattack"
                  ? "Name as many students as you can by their voice, one try each. The clock stops while a line loads."
                  : mode === "choice"
                  ? "Hear a line, then pick who said it from four students."
                  : "Hear a line, their title call or one from the lobby. Each miss shows a hint: their school, then their club, then their silhouette. In Endless you can turn the hints off."}
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
                  : isVoice
                  ? "One voice a day"
                  : isPicture
                  ? `One ${pictureKind} a day`
                  : "One track a day"
                : "No repeats"}
            </PopUpCardTitle>
            <PopUpCardText>
              {isDaily
                ? `Every Sensei gets the same ${
                    isVoice ? "voice" : isPicture ? pictureKind : answer
                  } today. Switch to Endless in the header to keep playing.`
                : isPicture
                ? `Every ${pictureKind} comes up once before any comes round again.`
                : isStudents || isVoice
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
              No cookies, ads or analytics, and nothing is tracked. Without an
              account, your score, streaks, missions and settings are saved only
              in this browser and never sent anywhere.
            </PopUpCardText>
            <PopUpCardText>
              Signing in with Google or Discord is optional. An account keeps
              your Google or Discord id (not your email or name), your profile,
              progress and missions, so they follow you to other devices. You
              can download or delete it all at any time, and one unused for two
              years is deleted.
            </PopUpCardText>
            <PopUpCardText>
              Signed in, your dailies are also kept as verified results: the
              server notes each daily as it starts, then judges your guesses
              itself and keeps the result, guesses and time, with your daily
              time zone (such as Asia/Bangkok) to know which day is yours, and
              your results from finished room games. Only you see them, on your
              profile. Verified means the server started and judged it, not that
              nobody cheated: answers can still be looked up. Dailies played as
              a guest or offline stay in this browser, and are never made
              verified. They&apos;re kept with your account, in Download my
              data, and go with Delete account.
            </PopUpCardText>
            <PopUpCardText>
              In Multiplayer, the room gets the name and picture from your
              profile (or the student you pick for it), the title, banner, frame
              and background you picked, and your answers, and shows them to the
              others in it. It keeps them only while it&apos;s open: when it
              closes, everything about it is deleted. This browser keeps a
              random key for each room you were in, for a few hours, so a tab
              closed by mistake can go back in as you. To stop anyone making
              rooms or signing in by the hundred, Cloudflare&apos;s rate limiter
              counts requests from each address in one-minute windows, given a
              hashed form of the address rather than the address itself. The
              site never stores your IP address, in its database, the rooms or
              logs; Cloudflare doesn&apos;t say how long its limiter keeps a
              count.
            </PopUpCardText>
            <PopUpCardText>
              Like any website, the service that delivers it — Cloudflare, for
              the game, its music, voices, pictures, what&apos;s on in Global
              and the multiplayer rooms — sees basic connection details, such as
              your IP address, to send you the pages.
            </PopUpCardText>
            <PopUpCardText>
              The whole{" "}
              <a
                href={PAGES.privacy.path}
                target="_blank"
                rel="noopener noreferrer"
              >
                privacy policy
              </a>{" "}
              says what&apos;s kept and for how long.
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
              holders. Soundtrack by {composerCredit}. Student pictures,
              weapons, voice lines and music from the game&apos;s own files;
              student data, the lines&apos; text and what&apos;s on in Global
              from{" "}
              <a href={SCHALEDB} target="_blank" rel="noopener noreferrer">
                SchaleDB
              </a>
              ; halos from the{" "}
              <a href={FANDOM_WIKI} target="_blank" rel="noopener noreferrer">
                Blue Archive Wiki
              </a>{" "}
              on Fandom.
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
