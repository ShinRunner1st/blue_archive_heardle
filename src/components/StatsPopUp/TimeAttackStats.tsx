import React from "react";

import { SITE_URL } from "../../constants/game";
import {
  makeTimeAttackRecap,
  recapPictureName,
} from "../../helpers/picture/recapPicture";
import {
  makeVoiceTimeAttackRecap,
  voiceRecapName,
} from "../../helpers/picture/voicePicture";
import { useBackdropSrc } from "../../hooks/useBackdropSrc";
import { useSharePicture } from "../../hooks/useSharePicture";
import logo from "../../image/BlueArchive-Heardle.png";
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
  /** The run's score now, which picks the backdrop, as on the page. */
  streak: number;
  /**
   * Voice mode's runs: students, not songs, no clip length, and a recap of
   * its own.
   */
  voice?: boolean;
}

/** How many recent runs the list shows. */
const RECENT = 5;

function runLine(run: RunSummary): string {
  if (run.clip > 0) return `${answersLabel(run.answers)} · ${run.clip}s clips`;
  return run.titles
    ? `${answersLabel(run.answers)} · title calls`
    : answersLabel(run.answers);
}

/**
 * Time attack's own stats: runs, not rounds, so a pop-up of their own rather
 * than the guess spread of the other modes.
 */
export function TimeAttackStats({
  onClose,
  stats,
  runs,
  streak,
  voice = false,
}: Props) {
  const recent = runs.slice(-RECENT).reverse();
  const rate =
    stats.answered > 0 ? Math.round((stats.right / stats.answered) * 100) : 0;

  const backdrop = useBackdropSrc(streak);
  const makeRecap = React.useCallback(
    () =>
      (voice ? makeVoiceTimeAttackRecap : makeTimeAttackRecap)(stats, runs, {
        backdrop,
        logo,
      }),
    [voice, stats, runs, backdrop]
  );
  const picture = useSharePicture(
    "Share recap",
    makeRecap,
    voice ? voiceRecapName("timeattack") : recapPictureName("timeattack"),
    `My Blue Archive Heardle ${voice ? "Voice " : ""}time attack recap
${SITE_URL}`
  );

  return (
    <PopUp
      title="Your stats 📊"
      subtitle={
        stats.runs === 0
          ? "Finish a run and your history shows up here."
          : `Across ${stats.runs} ${voice ? "Voice " : ""}time attack run${
              stats.runs === 1 ? "" : "s"
            }.`
      }
      onClose={onClose}
      actions={
        <>
          {stats.runs > 0 && (
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
            <Styled.TileLabel>
              {voice ? "Voices right" : "Songs right"}
            </Styled.TileLabel>
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
