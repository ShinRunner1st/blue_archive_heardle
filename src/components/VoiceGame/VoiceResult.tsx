import React from "react";

import { LOSS_TEXT, resultTitle } from "../../constants/resultText";
import { getVoiceUrl } from "../../helpers/audioUrl";
import {
  makeVoicePicture,
  voicePictureName,
} from "../../helpers/picture/voicePicture";
import { homeName } from "../../helpers/season";
import { buildVoiceShareText, isWon, triesOf } from "../../helpers/voiceRounds";
import { loadVoiceText } from "../../helpers/voiceTexts";
import { streakNews, WinStreak } from "../../helpers/winStreak";
import { useBackdropSrc } from "../../hooks/useBackdropSrc";
import { useSeason } from "../../hooks/useSeason";
import { useSharePicture } from "../../hooks/useSharePicture";
import logo from "../../image/BlueArchive-Heardle.png";
import { Student } from "../../types/student";
import { VoiceRound, VoiceRoundMode } from "../../types/voice";

import { Button } from "../Button";
import { DailyCountdown } from "../Result";
import * as ResultStyled from "../Result/index.styled";

import { VoiceNowPlaying } from "./VoiceNowPlaying";
import { VoiceChoices } from "./VoiceParts";

import * as Styled from "./index.styled";

interface Props {
  mode: VoiceRoundMode;
  round: VoiceRound;
  answer: Student;
  /** Named out of played, for the bag modes. */
  score: string;
  streak: WinStreak;
  onNext: () => void;
  onNewDay: () => void;
  /** The player's history with this voice, for the card. */
  record?: string;
  /** Plays the line as soon as it loads: the round just ended here. */
  autoPlay?: boolean;
  keyboardEnabled: boolean;
}

const SHARE_LABEL = "Share result";

/**
 * What the line says, once the round is over: loaded then, from the Worker,
 * so it can't be read while the round is played. Undefined while loading,
 * null if it won't load.
 */
function useLineText(id: number, line: number): string | null | undefined {
  const [text, setText] = React.useState<{
    key: string;
    value: string | null;
  }>();
  const key = `${id}:${line}`;

  React.useEffect(() => {
    let live = true;
    loadVoiceText(id, line).then((value) => live && setText({ key, value }));
    return () => {
      live = false;
    };
  }, [id, line, key]);

  return text?.key === key ? text.value : undefined;
}

/** The finished round: how it went, who was speaking, and what they said. */
export function VoiceResult({
  mode,
  round,
  answer,
  score,
  streak,
  onNext,
  onNewDay,
  record,
  autoPlay = false,
  keyboardEnabled,
}: Props) {
  const [shareLabel, setShareLabel] = React.useState(SHARE_LABEL);
  const season = useSeason();
  const won = isWon(round);
  const tries = triesOf(round);
  const count = round.guesses.length;
  const isDaily = mode === "daily";
  const text = useLineText(answer.id, round.line);

  // The picture sits on the same backdrop as the page behind it.
  const wins = streak.current;
  const backdrop = useBackdropSrc(wins);
  const makePicture = React.useCallback(
    () =>
      makeVoicePicture(
        { mode, round, answer, score, streak: wins },
        { backdrop, logo }
      ),
    [mode, round, answer, score, wins, backdrop]
  );
  const picture = useSharePicture(
    "Share picture",
    makePicture,
    voicePictureName({ mode, round }),
    buildVoiceShareText(mode, round, score)
  );

  const copy = React.useCallback(() => {
    navigator.clipboard
      .writeText(buildVoiceShareText(mode, round, score))
      .then(() => setShareLabel("Copied to your clipboard"))
      .catch(() => setShareLabel("Copy failed"));
  }, [mode, round, score]);

  React.useEffect(() => {
    if (shareLabel === SHARE_LABEL) return;
    const timer = window.setTimeout(() => setShareLabel(SHARE_LABEL), 2000);
    return () => window.clearTimeout(timer);
  }, [shareLabel]);

  // Enter moves on to the next line, as it does to the next song.
  React.useEffect(() => {
    if (!keyboardEnabled || isDaily) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Enter" || e.shiftKey || e.repeat) return;
      e.preventDefault();
      onNext();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [keyboardEnabled, isDaily, onNext]);

  const Title = won
    ? ResultStyled.CorrectResultTitle
    : ResultStyled.FailResultTitle;
  const news = streakNews(
    streak,
    won,
    isDaily ? "day" : "win",
    homeName(season)
  );

  return (
    <Styled.Wrapper>
      <Title>{resultTitle(won, count, tries)}</Title>
      <ResultStyled.Tries>
        {won
          ? tries === 1
            ? `It was ${answer.name}.`
            : `You knew ${answer.name}'s voice ${
                count === 1 ? "on the first try" : `in ${count} tries`
              }.`
          : LOSS_TEXT}
      </ResultStyled.Tries>
      <ResultStyled.Score>
        {isDaily && typeof round.day === "number"
          ? `Puzzle #${round.day}`
          : `Score : ${score}`}
      </ResultStyled.Score>
      {news && <ResultStyled.Note>{news}</ResultStyled.Note>}

      {/* The answer first, as the player was above the four during the round. */}
      <VoiceNowPlaying
        answer={answer}
        url={getVoiceUrl(answer.id, round.line)}
        text={text}
        record={record}
        keyboardEnabled={keyboardEnabled}
        autoPlay={autoPlay}
      />

      {round.choices && (
        <ResultStyled.ResultChoices>
          <VoiceChoices
            choices={round.choices}
            answer={round.answer}
            picked={round.guesses[0]}
          />
        </ResultStyled.ResultChoices>
      )}

      {isDaily && <DailyCountdown onNewDay={onNewDay} what="voice" />}
      <ResultStyled.Buttons>
        <Button stroke onClick={copy} variant="blue">
          {shareLabel}
        </Button>
        <Button stroke onClick={picture.share} variant="pink">
          {picture.text}
        </Button>
        {!isDaily && (
          <Button stroke onClick={onNext} variant="green">
            {won ? "Next voice" : "Continue?"}
          </Button>
        )}
      </ResultStyled.Buttons>
    </Styled.Wrapper>
  );
}
