import React from "react";

import { LOSS_TEXT, resultTitle } from "../../constants/resultText";
import { isBirthday } from "../../helpers/birthdays";
import {
  guessPictureName,
  makeGuessPicture,
} from "../../helpers/picture/guessPicture";
import {
  answerOf,
  buildPictureShareText,
  KIND_NAMES,
} from "../../helpers/pictureRounds";
import { homeName } from "../../helpers/season";
import { studentById } from "../../helpers/studentRounds";
import { isWon, triesOf } from "../../helpers/voiceRounds";
import { streakNews } from "../../helpers/winStreak";
import { useBackdropSrc } from "../../hooks/useBackdropSrc";
import { PictureGameState } from "../../hooks/usePictureGame";
import { useSeason } from "../../hooks/useSeason";
import { useSharePicture } from "../../hooks/useSharePicture";
import logo from "../../image/BlueArchive-Heardle.png";
import { PictureKind } from "../../types/picture";
import { Student } from "../../types/student";

import { Button } from "../Button";
import * as NowStyled from "../NowPlaying/index.styled";
import { DailyCountdown } from "../Result";
import * as ResultStyled from "../Result/index.styled";
import { StudentIcon } from "../StudentIcon";
import { VoiceChoices } from "../VoiceGame/VoiceParts";

import { GuessPicture } from "./GuessPicture";

import * as Styled from "./index.styled";

interface Props {
  game: PictureGameState;
  answer: Student;
  keyboardEnabled: boolean;
}

const SHARE_LABEL = "Share result";

/**
 * Everyone the picture belongs to, by name without the costume where they
 * share it: "Aru" for Aru's gun, carried in every outfit, "Hikari and
 * Nozomi" for the twins' halo.
 */
export function ownersOf(kind: PictureKind, id: number): string {
  const members = (answerOf(kind, id)?.members ?? [id])
    .map((member) => studentById.get(member)?.name ?? "")
    .filter(Boolean);
  if (members.length === 1) return members[0];
  const people = [
    ...new Set(members.map((name) => name.replace(/ \(.*\)$/, ""))),
  ];
  return people.length === 1
    ? people[0]
    : `${people.slice(0, -1).join(", ")} and ${people[people.length - 1]}`;
}

/**
 * The finished round: how it went, and whose halo or weapon it was, with the
 * picture as it is.
 */
export function PictureResult({ game, answer, keyboardEnabled }: Props) {
  const { kind, mode, round, streak, record } = game;
  const [shareLabel, setShareLabel] = React.useState(SHARE_LABEL);
  const season = useSeason();
  const won = isWon(round);
  const tries = triesOf(round);
  const count = round.guesses.length;
  const isDaily = mode === "daily";
  const score = `${game.wins}/${game.played}`;
  const weapon = kind === "weapon" ? answerOf(kind, answer.id)?.name : "";
  const noun = KIND_NAMES[kind].toLowerCase();

  // The picture sits on the same backdrop as the page behind it.
  const wins = streak.current;
  const backdrop = useBackdropSrc(wins);
  const makePicture = React.useCallback(
    () =>
      makeGuessPicture(
        { kind, mode, round, answer, score, streak: wins },
        { backdrop, logo }
      ),
    [kind, mode, round, answer, score, wins, backdrop]
  );
  const shareText = buildPictureShareText(kind, mode, round, score);
  const picture = useSharePicture(
    "Share picture",
    makePicture,
    guessPictureName({ kind, mode, round }),
    shareText
  );

  const copy = React.useCallback(() => {
    navigator.clipboard
      .writeText(shareText)
      .then(() => setShareLabel("Copied to your clipboard"))
      .catch(() => setShareLabel("Copy failed"));
  }, [shareText]);

  React.useEffect(() => {
    if (shareLabel === SHARE_LABEL) return;
    const timer = window.setTimeout(() => setShareLabel(SHARE_LABEL), 2000);
    return () => window.clearTimeout(timer);
  }, [shareLabel]);

  // Enter moves on to the next picture, as it does to the next song.
  const { next } = game;
  React.useEffect(() => {
    if (!keyboardEnabled || isDaily) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Enter" || e.shiftKey || e.repeat) return;
      e.preventDefault();
      next();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [keyboardEnabled, isDaily, next]);

  const Title = won
    ? ResultStyled.CorrectResultTitle
    : ResultStyled.FailResultTitle;
  const news = streakNews(
    streak,
    won,
    isDaily ? "day" : "win",
    homeName(season)
  );
  const owners = ownersOf(kind, answer.id);

  return (
    <>
      <Title>{resultTitle(won, count, tries)}</Title>
      <ResultStyled.Tries>
        {won
          ? tries === 1
            ? `It was ${owners}'s ${noun}.`
            : `You knew ${owners}'s ${noun} ${
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

      {/* The answer first, as the picture was above the four in the round. */}
      <NowStyled.Card>
        <Styled.CardHeading>
          <Styled.CardIcon aria-hidden="true">
            <StudentIcon id={answer.id} size={56} />
          </Styled.CardIcon>
          <NowStyled.Meta>
            <NowStyled.Name>
              {owners}
              {isBirthday(answer) && " 🎂"}
            </NowStyled.Name>
            <NowStyled.Artist>
              {weapon ? (
                <>
                  <Styled.WeaponName>{weapon}</Styled.WeaponName> ·{" "}
                  {answer.school}
                </>
              ) : (
                `${answer.school} · ${answer.club}`
              )}
            </NowStyled.Artist>
            {record && <NowStyled.Record>{record}</NowStyled.Record>}
          </NowStyled.Meta>
        </Styled.CardHeading>
        <Styled.CardPicture>
          <GuessPicture kind={kind} id={answer.id} />
        </Styled.CardPicture>
      </NowStyled.Card>

      {round.choices && (
        <ResultStyled.ResultChoices>
          <VoiceChoices
            choices={round.choices}
            answer={round.answer}
            picked={round.guesses[0]}
          />
        </ResultStyled.ResultChoices>
      )}

      {isDaily && <DailyCountdown onNewDay={game.refreshDay} what={noun} />}
      <ResultStyled.Buttons>
        <Button stroke onClick={copy} variant="blue">
          {shareLabel}
        </Button>
        <Button stroke onClick={picture.share} variant="pink">
          {picture.text}
        </Button>
        {!isDaily && (
          <Button stroke onClick={next} variant="green">
            {won ? `Next ${noun}` : "Continue?"}
          </Button>
        )}
      </ResultStyled.Buttons>
    </>
  );
}
