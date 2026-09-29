import React from "react";

import { pageUrl } from "../../constants/pages";
import {
  guessRecapName,
  makeGuessRecap,
} from "../../helpers/picture/guessPicture";
import { KIND_NAMES } from "../../helpers/pictureRounds";
import { useBackdropSrc } from "../../hooks/useBackdropSrc";
import { useSharePicture } from "../../hooks/useSharePicture";
import logo from "../../image/BlueArchive-Heardle.png";
import { Button } from "../Button";
import { PopUp, PopUpBody, PopUpGroupLabel, PopUpSpacer } from "../PopUp";
import { DayOutcome } from "../../helpers/dailyCalendar";
import { PictureKind, PictureRoundMode } from "../../types/picture";

import { CalendarBands, DailyCalendar } from "./DailyCalendar";
import { StatRow } from "./index";

import * as Styled from "./index.styled";
import { serverSuffix } from "../../helpers/server";

interface Props {
  onClose: () => void;
  kind: PictureKind;
  mode: PictureRoundMode;
  /** Losses at 0, then wins by the try they came on. */
  tally: number[];
  played: number;
  streak: number;
  best: number;
  /** Different pictures named at least once, of `total`. */
  found: number;
  total: number;
  dailyResults: Map<number, DayOutcome>;
}

/** Four tries: the picture alone, then one hint after another. */
const PICTURE_BANDS: CalendarBands = { best: 1, good: 2, most: 4 };

const MODE_NOUNS: Record<PictureRoundMode, string> = {
  daily: "daily puzzle",
  endless: "round",
  nohint: "No hints round",
  silhouette: "silhouette round",
  "silhouette-nohint": "silhouette round without hints",
  choice: "4-Choice round",
  "choice-silhouette": "4-Choice silhouette round",
};

function subtitleFor(
  kind: PictureKind,
  mode: PictureRoundMode,
  played: number
): string {
  const noun = `${KIND_NAMES[kind].toLowerCase()} ${MODE_NOUNS[mode]}`;
  if (played === 0) {
    return mode === "daily"
      ? `Finish today's ${noun} and your history shows up here.`
      : `Finish a ${noun} and your history shows up here.`;
  }
  return `Across ${played} finished ${noun}${played === 1 ? "" : "s"}.`;
}

/**
 * The picture game's stats, for the kind and mode on screen, as Voice
 * mode's. Time attack has its own.
 */
export function PictureStats({
  onClose,
  kind,
  mode,
  tally,
  played,
  streak,
  best,
  found,
  total,
  dailyResults,
}: Props) {
  const [animate, setAnimate] = React.useState(false);

  React.useEffect(() => {
    const timer = window.setTimeout(() => setAnimate(true), 50);
    return () => window.clearTimeout(timer);
  }, []);

  const wins = played - tally[0];
  const winRate = played > 0 ? Math.round((wins / played) * 100) : 0;
  const onePick = tally.length === 2;

  const backdrop = useBackdropSrc(streak);
  const makeRecap = React.useCallback(
    () =>
      makeGuessRecap(
        { kind, mode, tally, played, streak, best, found },
        { backdrop, logo }
      ),
    [kind, mode, tally, played, streak, best, found, backdrop]
  );
  const picture = useSharePicture(
    "Share recap",
    makeRecap,
    guessRecapName(kind, mode),
    `My Blue Archive Heardle ${KIND_NAMES[kind]} recap${serverSuffix()}
${pageUrl("picture")}`
  );

  return (
    <PopUp
      title="Your stats 📊"
      subtitle={subtitleFor(kind, mode, played)}
      onClose={onClose}
      actions={
        <>
          {played > 0 && (
            <Button variant="pink" onClick={picture.share}>
              {picture.text}
            </Button>
          )}
          <Button variant="green" onClick={onClose}>
            Close
          </Button>
        </>
      }
    >
      <PopUpBody>
        {!onePick && (
          <>
            <PopUpGroupLabel>Named on try</PopUpGroupLabel>
            <Styled.Rows>
              {tally.slice(1).map((count, index) => (
                <StatRow
                  key={index}
                  label={String(index + 1)}
                  value={count}
                  total={played}
                  animate={animate}
                />
              ))}
              <StatRow
                label="X"
                value={tally[0]}
                total={played}
                animate={animate}
                bad
              />
            </Styled.Rows>
            <PopUpSpacer />
          </>
        )}

        <Styled.Tiles $columns={4}>
          <Styled.Tile>
            <Styled.TileValue>{winRate}%</Styled.TileValue>
            <Styled.TileLabel>{onePick ? "Right" : "Named"}</Styled.TileLabel>
          </Styled.Tile>
          <Styled.Tile>
            <Styled.TileValue>{played}</Styled.TileValue>
            <Styled.TileLabel>Played</Styled.TileLabel>
          </Styled.Tile>
          <Styled.Tile>
            <Styled.TileValue>{streak}</Styled.TileValue>
            <Styled.TileLabel>Streak</Styled.TileLabel>
          </Styled.Tile>
          <Styled.Tile>
            <Styled.TileValue>{best}</Styled.TileValue>
            <Styled.TileLabel>Best</Styled.TileLabel>
          </Styled.Tile>
        </Styled.Tiles>

        <PopUpSpacer />

        <Styled.Tiles $columns={1}>
          <Styled.Tile>
            <Styled.TileValue>
              {found}/{total}
            </Styled.TileValue>
            <Styled.TileLabel>{KIND_NAMES[kind]}s known</Styled.TileLabel>
          </Styled.Tile>
        </Styled.Tiles>

        {mode === "daily" && (
          <>
            <PopUpSpacer />
            <PopUpGroupLabel>Calendar</PopUpGroupLabel>
            <DailyCalendar outcomes={dailyResults} bands={PICTURE_BANDS} />
          </>
        )}
      </PopUpBody>
    </PopUp>
  );
}
