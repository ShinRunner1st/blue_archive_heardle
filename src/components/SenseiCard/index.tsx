import React from "react";

import { CARD_COLORS, CARD_TITLES } from "../../constants/cosmetics";
import { students } from "../../constants/students";
import {
  cardColors,
  cardTitle,
  setCardColors,
  setCardTitle,
} from "../../helpers/cosmetics";
import { downloadBlob } from "../../helpers/download";
import {
  makeSenseiCard,
  senseiCardName,
} from "../../helpers/picture/senseiCard";
import { sharePicture } from "../../helpers/picture/share";
import { senseiStats } from "../../helpers/senseiStats";
import { loadFavStudent, saveFavStudent } from "../../helpers/storage";
import { studentById } from "../../helpers/studentRounds";
import { SITE_URL } from "../../constants/game";
import { useBackdropSrc } from "../../hooks/useBackdropSrc";
import { useMissionsVersion } from "../../hooks/useMissions";
import { usePictureName } from "../../hooks/usePlayerName";
import logo from "../../image/BlueArchive-Heardle.png";

import { Button } from "../Button";
import { CosmeticChoices } from "../CosmeticChoices";
import { PopUp, PopUpBody, PopUpGroupLabel } from "../PopUp";
import { StudentIcon } from "../StudentIcon";
import { StudentSearch } from "../StudentGame/StudentSearch";

import * as Styled from "./index.styled";

interface Props {
  onClose: () => void;
  /** The run on screen, so the card sits on the backdrop the page shows. */
  streak: number;
}

/** Long enough to type a name without the card redrawing on every key. */
const REDRAW_MS = 150;

/**
 * The player's record on a Schale licence, with a favourite student's
 * portrait, to save or share. Drawn in the browser from the saves; only the
 * favourite's portrait is fetched, from the Worker. Loaded with its own code
 * when opened, portrait list included, so the page doesn't carry either.
 */
export default function SenseiCard({ onClose, streak }: Props) {
  const [favourite, setFavourite] = React.useState(loadFavStudent);
  const [picture, setPicture] = React.useState<{ blob: Blob; url: string }>();
  const [status, setStatus] = React.useState("");
  const name = usePictureName();
  const backdrop = useBackdropSrc(streak);
  // Read once: nothing is played while the card is open.
  const stats = React.useMemo(() => senseiStats(), []);
  const student = favourite === null ? null : studentById.get(favourite);
  // A title or colours picked, or unlocked while the card is open.
  useMissionsVersion();
  const title = cardTitle();
  const frame = cardColors();
  const titleLabel = React.useId();
  const frameLabel = React.useId();

  const pick = React.useCallback((id: number | null) => {
    setFavourite(id);
    saveFavStudent(id);
  }, []);

  React.useEffect(() => {
    let live = true;
    const timer = window.setTimeout(() => {
      makeSenseiCard(
        {
          stats,
          name,
          favourite: student ?? null,
          issued: new Date(),
          title: title.id === "none" ? undefined : title.name,
          frame,
        },
        { backdrop, logo }
      )
        .then((blob) => {
          if (!live) return;
          const url = URL.createObjectURL(blob);
          setPicture((previous) => {
            if (previous) URL.revokeObjectURL(previous.url);
            return { blob, url };
          });
        })
        .catch(() => live && setStatus("Couldn't draw the card."));
    }, REDRAW_MS);
    return () => {
      live = false;
      window.clearTimeout(timer);
    };
  }, [stats, name, student, backdrop, title, frame]);

  // The last picture's address is let go with the pop-up.
  const shown = React.useRef<string | undefined>(undefined);
  shown.current = picture?.url;
  React.useEffect(
    () => () => {
      if (shown.current) URL.revokeObjectURL(shown.current);
    },
    []
  );

  React.useEffect(() => {
    if (!status) return;
    const timer = window.setTimeout(() => setStatus(""), 2500);
    return () => window.clearTimeout(timer);
  }, [status]);

  const share = () => {
    if (!picture) return;
    sharePicture(
      picture.blob,
      senseiCardName(),
      `My Sensei card from Blue Archive Heardle\n${SITE_URL}`
    ).then((outcome) => {
      if (outcome === "saved") setStatus("Saved to your downloads.");
    });
  };

  const download = () => {
    if (!picture) return;
    downloadBlob(senseiCardName(), picture.blob);
    setStatus("Saved to your downloads.");
  };

  const guessed = React.useMemo(
    () => new Set(favourite === null ? [] : [favourite]),
    [favourite]
  );

  return (
    <PopUp
      title="Sensei card 🪪"
      subtitle="Your record on a Schale licence, to save or share."
      onClose={onClose}
      actions={
        <>
          <Button variant="pink" onClick={share} disabled={!picture}>
            Share
          </Button>
          <Button variant="blue" onClick={download} disabled={!picture}>
            Download
          </Button>
          <Button variant="green" onClick={onClose}>
            Close
          </Button>
        </>
      }
    >
      <PopUpBody>
        <PopUpGroupLabel>Favourite student</PopUpGroupLabel>
        {student && (
          <Styled.Favourite>
            <StudentIcon id={student.id} size={36} />
            <Styled.FavouriteName>{student.name}</Styled.FavouriteName>
            <Styled.Remove type="button" onClick={() => pick(null)}>
              Remove
            </Styled.Remove>
          </Styled.Favourite>
        )}
        <Styled.Picker>
          <StudentSearch
            pool={students}
            guessed={guessed}
            onGuess={pick}
            keyboardEnabled={false}
          />
        </Styled.Picker>

        <PopUpGroupLabel id={titleLabel}>Title</PopUpGroupLabel>
        <CosmeticChoices
          labelledBy={titleLabel}
          choices={CARD_TITLES}
          selected={title.id}
          onPick={setCardTitle}
        />
        <PopUpGroupLabel id={frameLabel}>Colours</PopUpGroupLabel>
        <CosmeticChoices
          labelledBy={frameLabel}
          choices={CARD_COLORS.map((choice) => ({
            ...choice,
            swatch: `linear-gradient(135deg, ${choice.band[0]}, ${choice.band[1]})`,
          }))}
          selected={frame.id}
          onPick={setCardColors}
        />

        <Styled.Preview>
          {picture ? (
            <img
              src={picture.url}
              alt="Your Sensei card"
              width={1200}
              height={756}
            />
          ) : (
            <Styled.Drawing>Drawing…</Styled.Drawing>
          )}
        </Styled.Preview>
        <Styled.Note role="status" aria-live="polite">
          {status ||
            (name
              ? "Your name, and the Sensei after it, come from Settings."
              : "Add your name in Settings to put it on the card.")}
        </Styled.Note>
      </PopUpBody>
    </PopUp>
  );
}
