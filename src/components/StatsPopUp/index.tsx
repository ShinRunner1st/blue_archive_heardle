import React, { useEffect, useState } from "react";

import { Button } from "../Button";
import { PopUp, PopUpBody, PopUpGroupLabel, PopUpSpacer } from "../PopUp";
import { songs } from "../../constants";
import { GameMode } from "../../types/mode";
import { StatsTally } from "../../types/stats";
import { Streaks } from "../../helpers/streaks";

import * as Styled from "./index.styled";

interface Props {
  onClose: () => void;
  score: string;
  stats: StatsTally;
  mode: GameMode;
  streaks: Streaks;
}

/** Each mode keeps its own history, so the pop-up says which one it is showing. */
function subtitleFor(mode: GameMode, total: number): string {
  if (total === 0) {
    return mode === "daily"
      ? "Finish today's puzzle and your history shows up here."
      : "Finish a round and your history shows up here.";
  }

  const noun = mode === "daily" ? "daily puzzle" : "endless round";
  return `Across ${total} finished ${noun}${total === 1 ? "" : "s"}.`;
}

const TRY_BUCKETS = [1, 2, 3, 4, 5, 6] as const;

/**
 * Counts from zero up to `target` once `animate` flips on. The frame loop is
 * cancelled on unmount so closing the pop-up mid-animation can't set state on
 * an unmounted component.
 */
function useCountUp(target: number, animate: boolean, duration = 500): number {
  const [value, setValue] = React.useState(0);

  React.useEffect(() => {
    if (!animate) {
      setValue(0);
      return;
    }

    let frame = 0;
    const startTime = performance.now();

    const tick = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      setValue(Math.floor(progress * target));

      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, animate, duration]);

  return value;
}

function StatRow({
  label,
  value,
  total,
  animate,
  bad = false,
}: {
  label: string;
  value: number;
  total: number;
  animate: boolean;
  bad?: boolean;
}) {
  const counted = useCountUp(value, animate);
  const Bar = bad ? Styled.BadProgress : Styled.Progress;

  return (
    <Styled.Row>
      <Styled.RowLabel>{label}</Styled.RowLabel>
      <Styled.Track>
        <Bar $animate={animate} $value={value} $maxValue={total} />
      </Styled.Track>
      <Styled.RowCount>{counted}</Styled.RowCount>
    </Styled.Row>
  );
}

export function StatsPopUp({ onClose, score, stats, mode, streaks }: Props) {
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    // Let the pop-up paint at zero before the bars grow.
    const timer = window.setTimeout(() => setAnimate(true), 50);
    return () => window.clearTimeout(timer);
  }, []);

  const total = stats[7];

  return (
    <PopUp
      title="Your stats 📊"
      subtitle={subtitleFor(mode, total)}
      onClose={onClose}
      actions={
        <Button variant="green" onClick={onClose}>
          Close
        </Button>
      }
    >
      <PopUpBody>
        <PopUpGroupLabel>Guessed in</PopUpGroupLabel>
        <Styled.Rows>
          {TRY_BUCKETS.map((tries) => (
            <StatRow
              key={tries}
              label={String(tries)}
              value={stats[tries]}
              total={total}
              animate={animate}
            />
          ))}
          <StatRow
            label="X"
            value={stats[0]}
            total={total}
            animate={animate}
            bad
          />
        </Styled.Rows>

        <PopUpSpacer />

        <Styled.Tiles $columns={mode === "daily" ? 3 : 2}>
          <Styled.Tile>
            <Styled.TileValue>{score}</Styled.TileValue>
            <Styled.TileLabel>Score</Styled.TileLabel>
          </Styled.Tile>
          {mode === "daily" ? (
            <>
              <Styled.Tile>
                <Styled.TileValue>{streaks.current}</Styled.TileValue>
                <Styled.TileLabel>Streak</Styled.TileLabel>
              </Styled.Tile>
              <Styled.Tile>
                <Styled.TileValue>{streaks.max}</Styled.TileValue>
                <Styled.TileLabel>Best</Styled.TileLabel>
              </Styled.Tile>
            </>
          ) : (
            <Styled.Tile>
              <Styled.TileValue>{songs.length}</Styled.TileValue>
              <Styled.TileLabel>Total OST</Styled.TileLabel>
            </Styled.Tile>
          )}
        </Styled.Tiles>
      </PopUpBody>
    </PopUp>
  );
}
