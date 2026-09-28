import React from "react";

import { Button } from "../Button";
import { PopUp, PopUpBody, PopUpGroupLabel, PopUpSpacer } from "../PopUp";
import { DayOutcome } from "../../helpers/dailyCalendar";
import { voicePool } from "../../helpers/voiceRounds";
import { VoiceRoundMode } from "../../types/voice";

import { CalendarBands, DailyCalendar } from "./DailyCalendar";
import { StatRow } from "./index";

import * as Styled from "./index.styled";

interface Props {
  onClose: () => void;
  mode: VoiceRoundMode;
  /** Losses at 0, then wins by the try they came on. */
  tally: number[];
  played: number;
  streak: number;
  best: number;
  /** Different students named at least once. */
  found: number;
  dailyResults: Map<number, DayOutcome>;
}

/** Four tries: the voice alone, then one hint after another. */
const VOICE_BANDS: CalendarBands = { best: 1, good: 2, most: 4 };

const MODE_NAMES: Record<VoiceRoundMode, string> = {
  daily: "daily Voice puzzle",
  endless: "Voice round",
  nohint: "No hints round",
  choice: "Voice 4-Choice round",
};

function subtitleFor(mode: VoiceRoundMode, played: number): string {
  const noun = MODE_NAMES[mode];
  if (played === 0) {
    return mode === "daily"
      ? `Finish today's ${noun} and your history shows up here.`
      : `Finish a ${noun} and your history shows up here.`;
  }
  return `Across ${played} finished ${noun}${played === 1 ? "" : "s"}.`;
}

/** Voice mode's stats, for the mode on screen. Time attack has its own. */
export function VoiceStats({
  onClose,
  mode,
  tally,
  played,
  streak,
  best,
  found,
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

  return (
    <PopUp
      title="Your stats 📊"
      subtitle={subtitleFor(mode, played)}
      onClose={onClose}
      actions={
        <Button variant="green" onClick={onClose}>
          Close
        </Button>
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
              {found}/{voicePool.length}
            </Styled.TileValue>
            <Styled.TileLabel>Voices known</Styled.TileLabel>
          </Styled.Tile>
        </Styled.Tiles>

        {mode === "daily" && (
          <>
            <PopUpSpacer />
            <PopUpGroupLabel>Calendar</PopUpGroupLabel>
            <DailyCalendar outcomes={dailyResults} bands={VOICE_BANDS} />
          </>
        )}
      </PopUpBody>
    </PopUp>
  );
}
