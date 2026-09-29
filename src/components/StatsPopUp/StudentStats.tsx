import React from "react";

import { Button } from "../Button";
import { PopUp, PopUpBody, PopUpGroupLabel, PopUpSpacer } from "../PopUp";
import { DayOutcome } from "../../helpers/dailyCalendar";
import {
  makeStudentRecap,
  studentRecapName,
} from "../../helpers/picture/studentPicture";
import { pageUrl } from "../../constants/pages";
import { useBackdropSrc } from "../../hooks/useBackdropSrc";
import { useSharePicture } from "../../hooks/useSharePicture";
import logo from "../../image/BlueArchive-Heardle.png";
import { formatSolveTime } from "../../helpers/studentRounds";
import { StudentGame, StudentMode } from "../../types/student";

import { CalendarBands, DailyCalendar } from "./DailyCalendar";
import { StatRow } from "./index";

import * as Styled from "./index.styled";
import { serverSuffix } from "../../helpers/server";

interface Props {
  onClose: () => void;
  game: StudentGame;
  mode: StudentMode;
  /** Gave up at 0, then wins by guesses, 1 to 9 and 10 or more. */
  tally: number[];
  played: number;
  averageGuesses: number;
  /** The quickest and the average timed find, in ms; null before any. */
  fastest: number | null;
  averageFind: number | null;
  streak: number;
  best: number;
  /** Different students found at least once. */
  found: number;
  dailyResults: Map<number, DayOutcome>;
}

/** With over a hundred students to go through, a find in 3 is a great day. */
const GUESS_BANDS: CalendarBands = { best: 3, good: 6 };

const GAME_NAMES: Record<StudentGame, string> = {
  gameplay: "Gameplay",
  lore: "Lore",
};

function subtitleFor(game: StudentGame, mode: StudentMode, played: number) {
  const noun = `${GAME_NAMES[game]} ${
    mode === "daily" ? "daily puzzle" : "round"
  }`;
  if (played === 0) {
    return mode === "daily"
      ? `Finish today's ${noun} and your history shows up here.`
      : `Finish a ${noun} and your history shows up here.`;
  }
  return `Across ${played} finished ${noun}${played === 1 ? "" : "s"}.`;
}

/** The student game's stats, for the way to play and mode on screen. */
export function StudentStats({
  onClose,
  game,
  mode,
  tally,
  played,
  averageGuesses,
  fastest,
  averageFind,
  streak,
  best,
  found,
  dailyResults,
}: Props) {
  const [animate, setAnimate] = React.useState(false);

  React.useEffect(() => {
    // Let the pop-up paint at zero before the bars grow.
    const timer = window.setTimeout(() => setAnimate(true), 50);
    return () => window.clearTimeout(timer);
  }, []);

  // On the backdrop the page is showing, like the result picture.
  const backdrop = useBackdropSrc(streak);
  const makeRecap = React.useCallback(
    () =>
      makeStudentRecap(
        {
          game,
          mode,
          tally,
          played,
          averageGuesses,
          fastest,
          streak,
          best,
          found,
        },
        { backdrop, logo }
      ),
    [
      game,
      mode,
      tally,
      played,
      averageGuesses,
      fastest,
      streak,
      best,
      found,
      backdrop,
    ]
  );
  const picture = useSharePicture(
    "Share recap",
    makeRecap,
    studentRecapName({ game, mode }),
    `My Blue Archive Heardle ${GAME_NAMES[game]} recap${serverSuffix()}
${pageUrl("students")}`
  );

  const wins = played - tally[0];
  const winRate = played > 0 ? Math.round((wins / played) * 100) : 0;

  return (
    <PopUp
      title="Your stats 📊"
      subtitle={subtitleFor(game, mode, played)}
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
        <PopUpGroupLabel>Found in</PopUpGroupLabel>
        <Styled.Rows>
          {tally.slice(1).map((count, index) => (
            <StatRow
              key={index}
              label={index === 9 ? "10+" : String(index + 1)}
              value={count}
              total={played}
              animate={animate}
              wideLabel
            />
          ))}
          <StatRow
            label="X"
            value={tally[0]}
            total={played}
            animate={animate}
            bad
            wideLabel
          />
        </Styled.Rows>

        <PopUpSpacer />

        <Styled.Tiles $columns={4}>
          <Styled.Tile>
            <Styled.TileValue>{winRate}%</Styled.TileValue>
            <Styled.TileLabel>Found</Styled.TileLabel>
          </Styled.Tile>
          <Styled.Tile>
            <Styled.TileValue>{averageGuesses || "-"}</Styled.TileValue>
            <Styled.TileLabel>Average</Styled.TileLabel>
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

        <Styled.Tiles $columns={2}>
          <Styled.Tile>
            <Styled.TileValue>
              {fastest === null ? "-" : formatSolveTime(fastest)}
            </Styled.TileValue>
            <Styled.TileLabel>Fastest find</Styled.TileLabel>
          </Styled.Tile>
          <Styled.Tile>
            <Styled.TileValue>
              {averageFind === null ? "-" : formatSolveTime(averageFind)}
            </Styled.TileValue>
            <Styled.TileLabel>Average time</Styled.TileLabel>
          </Styled.Tile>
        </Styled.Tiles>

        {mode === "daily" && (
          <>
            <PopUpSpacer />
            <PopUpGroupLabel>Calendar</PopUpGroupLabel>
            <DailyCalendar
              outcomes={dailyResults}
              bands={GUESS_BANDS}
              unit={["guess", "guesses"]}
            />
          </>
        )}
      </PopUpBody>
    </PopUp>
  );
}
