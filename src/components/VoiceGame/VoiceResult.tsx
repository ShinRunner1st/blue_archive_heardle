import React from "react";

import { LOSS_TEXT, resultTitle } from "../../constants/resultText";
import { getVoiceUrl } from "../../helpers/audioUrl";
import { isBirthday } from "../../helpers/birthdays";
import { homeName } from "../../helpers/season";
import { buildVoiceShareText, isWon, triesOf } from "../../helpers/voiceRounds";
import { loadVoiceText } from "../../helpers/voiceTexts";
import { streakNews, WinStreak } from "../../helpers/winStreak";
import { useSeason } from "../../hooks/useSeason";
import { Student } from "../../types/student";
import { VoiceRound, VoiceRoundMode } from "../../types/voice";

import { Button } from "../Button";
import { DailyCountdown } from "../Result";
import * as ResultStyled from "../Result/index.styled";
import { StudentIcon } from "../StudentIcon";

import { VoiceChoices } from "./VoiceParts";
import { VoicePlayer } from "./VoicePlayer";

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
  keyboardEnabled,
}: Props) {
  const [shareLabel, setShareLabel] = React.useState(SHARE_LABEL);
  const season = useSeason();
  const won = isWon(round);
  const tries = triesOf(round);
  const count = round.guesses.length;
  const isDaily = mode === "daily";
  const text = useLineText(answer.id, round.line);

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

      {round.choices && (
        <VoiceChoices
          choices={round.choices}
          answer={round.answer}
          picked={round.guesses[0]}
        />
      )}

      <Styled.AnswerCard style={{ marginTop: 16 }}>
        <StudentIcon id={answer.id} size={64} />
        <Styled.AnswerText>
          <Styled.AnswerName>
            {answer.name}
            {isBirthday(answer) && " 🎂"}
          </Styled.AnswerName>
          <Styled.AnswerMeta>
            {answer.school} · {answer.club}
          </Styled.AnswerMeta>
        </Styled.AnswerText>
      </Styled.AnswerCard>

      <Styled.Quote>
        {text === undefined
          ? "…"
          : text === null
          ? "The line's words didn't load."
          : text === ""
          ? "“Blue Archive!”"
          : `“${text}”`}
        {text === "" && (
          <Styled.QuoteNote>
            The title call, the same for everyone
          </Styled.QuoteNote>
        )}
      </Styled.Quote>

      <VoicePlayer
        url={getVoiceUrl(answer.id, round.line)}
        keyboardEnabled={keyboardEnabled}
        compact
      />

      {isDaily && <DailyCountdown onNewDay={onNewDay} what="voice" />}
      <ResultStyled.Buttons>
        <Button stroke onClick={copy} variant="blue">
          {shareLabel}
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
