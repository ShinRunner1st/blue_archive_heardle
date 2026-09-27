import { Button } from "../Button";
import { PopUp, PopUpBody, PopUpGroupLabel, PopUpSpacer } from "../PopUp";
import {
  answersLabel,
  RunSummary,
  TimeAttackStats as Stats,
} from "../../helpers/timeAttack";

import * as Styled from "./index.styled";

interface Props {
  onClose: () => void;
  stats: Stats;
  /** Every run, oldest first. */
  runs: RunSummary[];
}

/** How many recent runs the list shows. */
const RECENT = 5;

function runLine(run: RunSummary): string {
  return `${answersLabel(run.answers)} · ${run.clip}s clips`;
}

/**
 * Time attack's own stats: runs, not rounds, so a pop-up of their own rather
 * than the guess spread of the other modes.
 */
export function TimeAttackStats({ onClose, stats, runs }: Props) {
  const recent = runs.slice(-RECENT).reverse();
  const rate =
    stats.answered > 0 ? Math.round((stats.right / stats.answered) * 100) : 0;

  return (
    <PopUp
      title="Your stats 📊"
      subtitle={
        stats.runs === 0
          ? "Finish a run and your history shows up here."
          : `Across ${stats.runs} time attack run${
              stats.runs === 1 ? "" : "s"
            }.`
      }
      onClose={onClose}
      actions={
        <Button variant="green" onClick={onClose}>
          Close
        </Button>
      }
    >
      <PopUpBody>
        <PopUpGroupLabel>Best runs</PopUpGroupLabel>
        <Styled.Tiles $columns={2}>
          <Styled.Tile>
            <Styled.TileValue>{stats.best.typed}</Styled.TileValue>
            <Styled.TileLabel>Typed</Styled.TileLabel>
          </Styled.Tile>
          <Styled.Tile>
            <Styled.TileValue>{stats.best.choice}</Styled.TileValue>
            <Styled.TileLabel>4-Choice</Styled.TileLabel>
          </Styled.Tile>
        </Styled.Tiles>

        <PopUpSpacer />

        <Styled.Tiles $columns={3}>
          <Styled.Tile>
            <Styled.TileValue>{stats.runs}</Styled.TileValue>
            <Styled.TileLabel>Runs</Styled.TileLabel>
          </Styled.Tile>
          <Styled.Tile>
            <Styled.TileValue>{stats.right}</Styled.TileValue>
            <Styled.TileLabel>Songs right</Styled.TileLabel>
          </Styled.Tile>
          <Styled.Tile>
            <Styled.TileValue>{rate}%</Styled.TileValue>
            <Styled.TileLabel>Right</Styled.TileLabel>
          </Styled.Tile>
        </Styled.Tiles>

        {recent.length > 0 && (
          <>
            <PopUpSpacer />
            <PopUpGroupLabel>Recent runs</PopUpGroupLabel>
            <Styled.Rows>
              {recent.map((run) => (
                <Styled.RunRow key={run.id}>
                  <span>{runLine(run)}</span>
                  <Styled.RunScore>
                    {run.score} right of {run.answered}
                  </Styled.RunScore>
                </Styled.RunRow>
              ))}
            </Styled.Rows>
          </>
        )}
      </PopUpBody>
    </PopUp>
  );
}
