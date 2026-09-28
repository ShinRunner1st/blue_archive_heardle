import React from "react";

import { LOSS_TEXT, studentResultTitle } from "../../constants/resultText";
import { birthdayText } from "../../helpers/studentClues";
import { isBirthday } from "../../helpers/birthdays";
import { isWon } from "../../helpers/studentRounds";
import { buildStudentShareText } from "../../helpers/studentShare";
import { streakNews, WinStreak } from "../../helpers/winStreak";
import { homeName } from "../../helpers/season";
import { useSeason } from "../../hooks/useSeason";
import { useBackdropSrc } from "../../hooks/useBackdropSrc";
import { useSharePicture } from "../../hooks/useSharePicture";
import {
  makeStudentPicture,
  studentPictureName,
} from "../../helpers/picture/studentPicture";
import logo from "../../image/BlueArchive-Heardle.png";
import {
  Student,
  StudentGame,
  StudentMode,
  StudentRound,
} from "../../types/student";

import { Button } from "../Button";
import { DailyCountdown } from "../Result";
import * as ResultStyled from "../Result/index.styled";
import { StudentIcon } from "../StudentIcon";

import * as Styled from "./index.styled";

interface Props {
  game: StudentGame;
  mode: StudentMode;
  round: StudentRound;
  answer: Student;
  /** Found out of played, for endless. */
  score: string;
  streak: WinStreak;
  onNext: () => void;
  onNewDay: () => void;
  keyboardEnabled: boolean;
}

const SHARE_LABEL = "Share result";

/** The finished round: how it went, who it was, and what next. */
export function StudentResult({
  game,
  mode,
  round,
  answer,
  score,
  streak,
  onNext,
  onNewDay,
  keyboardEnabled,
}: Props) {
  const [shareText, setShareText] = React.useState(SHARE_LABEL);
  const season = useSeason();
  const won = isWon(round);
  const count = round.guesses.length;
  const isDaily = mode === "daily";

  // On the backdrop the page is showing, like the OST's result picture.
  const backdrop = useBackdropSrc(streak.current);
  const pictureInput = React.useMemo(
    () => ({ game, mode, round, answer, score, streak: streak.current }),
    [game, mode, round, answer, score, streak]
  );
  const makePicture = React.useCallback(
    () => makeStudentPicture(pictureInput, { backdrop, logo }),
    [pictureInput, backdrop]
  );
  const picture = useSharePicture(
    "Share picture",
    makePicture,
    studentPictureName(pictureInput),
    buildStudentShareText(pictureInput)
  );

  const copy = React.useCallback(() => {
    navigator.clipboard
      .writeText(buildStudentShareText({ game, mode, round, answer, score }))
      .then(() => setShareText("Copied to your clipboard"))
      .catch(() => setShareText("Copy failed"));
  }, [game, mode, round, answer, score]);

  React.useEffect(() => {
    if (shareText === SHARE_LABEL) return;
    const timer = window.setTimeout(() => setShareText(SHARE_LABEL), 2000);
    return () => window.clearTimeout(timer);
  }, [shareText]);

  // Enter moves on to the next student, as it does to the next song.
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
  const details = [answer.school, game === "lore" ? answer.club : answer.role];

  return (
    <>
      <Title>{studentResultTitle(won, count)}</Title>
      <ResultStyled.Tries>
        {won
          ? `You found ${answer.name} in ${count} ${
              count === 1 ? "guess" : "guesses"
            }.`
          : LOSS_TEXT}
      </ResultStyled.Tries>
      <ResultStyled.Score>
        {isDaily && typeof round.day === "number"
          ? `Puzzle #${round.day}`
          : `Score : ${score}`}
      </ResultStyled.Score>
      {news && <ResultStyled.Note>{news}</ResultStyled.Note>}

      <Styled.AnswerCard>
        <StudentIcon id={answer.id} size={64} />
        <Styled.AnswerText>
          <Styled.AnswerName>{answer.name}</Styled.AnswerName>
          <Styled.AnswerMeta>{details.join(" · ")}</Styled.AnswerMeta>
          {answer.birthday && (
            <Styled.AnswerMeta>
              {isBirthday(answer)
                ? "🎂 Birthday today!"
                : `Birthday: ${birthdayText(answer.birthday)}`}
            </Styled.AnswerMeta>
          )}
        </Styled.AnswerText>
      </Styled.AnswerCard>

      {isDaily && <DailyCountdown onNewDay={onNewDay} what="student" />}
      <ResultStyled.Buttons>
        <Button stroke onClick={copy} variant="blue">
          {shareText}
        </Button>
        <Button stroke onClick={picture.share} variant="pink">
          {picture.text}
        </Button>
        {!isDaily && (
          <Button stroke onClick={onNext} variant="green">
            {won ? "Next student" : "Continue?"}
          </Button>
        )}
      </ResultStyled.Buttons>
    </>
  );
}
