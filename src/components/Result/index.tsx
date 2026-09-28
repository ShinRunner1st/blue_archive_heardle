import React, { useState } from "react";

import { streakNews, WinStreak } from "../../helpers/winStreak";

import { Song } from "../../types/song";
import { GameMode } from "../../types/mode";
import { Round } from "../../types/stats";
import { buildShareText } from "../../helpers";
import { formatCountdown, msUntilNextDay } from "../../helpers/daily";
import { homeName } from "../../helpers/season";
import { playTimes } from "../../constants";
import { LOSS_TEXT, resultTitle } from "../../constants/resultText";

import { Button } from "../Button";
import { Choices } from "../Choices";
import { NowPlaying } from "../NowPlaying";
import { clipInfo } from "../../helpers/audioUrl";
import {
  makeResultPicture,
  resultPictureName,
} from "../../helpers/picture/resultPicture";
import { useBackdropSrc } from "../../hooks/useBackdropSrc";
import { useSeason } from "../../hooks/useSeason";
import { useSharePicture } from "../../hooks/useSharePicture";
import logo from "../../image/BlueArchive-Heardle.png";

import * as Styled from "./index.styled";

interface Props {
  didGuess: boolean;
  currentTry: number;
  solution: Song;
  score: string;
  bagEmpty: boolean;
  onNextSong: () => void;
  onResetScore: () => void;
  startTime: number | null;
  keyboardEnabled: boolean;
  mode: GameMode;
  /** The finished round, used to build the shareable result. */
  round: Round;
  /** Called when the clock passes midnight with the result still on screen. */
  onNewDay: () => void;
  /** The mode's run of wins, which moves the background. */
  streak: WinStreak;
  /** What this round did for the OST badges. */
  badgeLines: string[];
  /** The player's history with this song, for the now-playing card. */
  record: string;
  /** Plays the answer as soon as it loads: the round just ended here. */
  autoPlay?: boolean;
}

const COUNTDOWN_TICK_MS = 30_000;

/**
 * Counts down to the next puzzle. Daily mode has nothing to advance to, so this
 * replaces the Next Song button rather than sitting beside it. The student
 * game's result shows it too, for the next student.
 */
export function DailyCountdown({
  onNewDay,
  what = "song",
}: {
  onNewDay: () => void;
  what?: string;
}) {
  const [remaining, setRemaining] = useState(() => msUntilNextDay());

  React.useEffect(() => {
    const tick = () => {
      const left = msUntilNextDay();
      setRemaining(left);

      // Rolled past midnight with the tab still open: hand today's puzzle over.
      if (left <= 0) onNewDay();
    };

    const timer = window.setInterval(tick, COUNTDOWN_TICK_MS);
    return () => window.clearInterval(timer);
  }, [onNewDay]);

  return (
    <Styled.NextIn>
      Next {what} in {formatCountdown(remaining)}
    </Styled.NextIn>
  );
}

export function Result({
  didGuess,
  currentTry,
  solution,
  score,
  bagEmpty,
  onNextSong,
  onResetScore,
  startTime,
  keyboardEnabled,
  mode,
  round,
  onNewDay,
  streak,
  badgeLines,
  record,
  autoPlay = true,
}: Props) {
  const [buttonText, setButtonText] = useState("Share result");
  const isDaily = mode === "daily";

  // The picture sits on the same backdrop as the page behind it.
  const wins = streak.current;
  const backdrop = useBackdropSrc(wins);
  const season = useSeason();
  const makePicture = React.useCallback(
    () =>
      makeResultPicture(
        { mode, round, score, streak: wins },
        { backdrop, logo }
      ),
    [mode, round, score, wins, backdrop]
  );
  const picture = useSharePicture(
    "Share picture",
    makePicture,
    resultPictureName({ mode, round, score, streak: wins }),
    buildShareText({ mode, round, score })
  );

  const copyResult = React.useCallback(() => {
    navigator.clipboard
      .writeText(buildShareText({ mode, round, score }))
      .then(() => setButtonText("Copied to your clipboard"))
      .catch(() => setButtonText("Copy failed"));
  }, [mode, round, score]);

  // Reset the label after a copy, and cancel the timer if the round advances
  // before it fires.
  React.useEffect(() => {
    if (buttonText === "Share result") return;

    const timer = window.setTimeout(() => setButtonText("Share result"), 2000);
    return () => window.clearTimeout(timer);
  }, [buttonText]);

  const advance = React.useCallback(() => {
    if (bagEmpty) onResetScore();
    else onNextSong();
  }, [bagEmpty, onNextSong, onResetScore]);

  // Enter moves on to the next song from the result screen, unless a dialog is
  // open in front of it - or the mode has no next song to move to.
  React.useEffect(() => {
    if (!keyboardEnabled || isDaily) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Not a held key, nor the Shift+Enter that just gave the round up.
      if (e.key !== "Enter" || e.shiftKey || e.repeat) return;
      e.preventDefault();
      advance();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [keyboardEnabled, isDaily, advance]);

  // The longest clip heard this round: the one for the final try taken, or
  // the one clip of a round with a single try.
  const lastTry = Math.min(Math.max(currentTry, 1), playTimes.length);
  const clipLength = round.clip ?? playTimes[lastTry - 1] / 1000;
  const isChoice = round.choices !== undefined;

  const news = streakNews(
    streak,
    didGuess,
    isDaily ? "day" : "win",
    homeName(season)
  );

  const Title = didGuess ? Styled.CorrectResultTitle : Styled.FailResultTitle;
  const title = resultTitle(didGuess, currentTry, round.tries);

  return (
    <>
      <Title>{title}</Title>
      <Styled.Tries>
        {!isDaily && bagEmpty && "That was the last song. "}
        {didGuess
          ? isChoice
            ? "You picked it out of four."
            : `You got it right in ${currentTry} ${
                currentTry === 1 ? "guess" : "guesses"
              }.`
          : LOSS_TEXT}
      </Styled.Tries>
      <Styled.Score>
        {isDaily && typeof round.day === "number"
          ? `Puzzle #${round.day}`
          : `Score : ${score}`}
      </Styled.Score>
      {news && <Styled.Note>{news}</Styled.Note>}
      {badgeLines.map((line) => (
        <Styled.Note key={line}>{line}</Styled.Note>
      ))}
      {round.choices && (
        <Choices
          choices={round.choices}
          answer={solution.themeNo}
          picked={round.guesses[0]?.song?.themeNo}
        />
      )}
      <NowPlaying
        song={solution}
        // The round's start is within the clip; the song player needs it
        // within the whole song.
        startTime={clipInfo(solution.themeNo).start + (startTime ?? 0)}
        clipLength={clipLength}
        keyboardEnabled={keyboardEnabled}
        record={record}
        autoPlay={autoPlay}
      />
      {isDaily && <DailyCountdown onNewDay={onNewDay} />}
      <Styled.Buttons>
        <Button stroke onClick={copyResult} variant="blue">
          {buttonText}
        </Button>
        <Button stroke onClick={picture.share} variant="pink">
          {picture.text}
        </Button>
        {!isDaily && (
          <Button stroke onClick={advance} variant={bagEmpty ? "red" : "green"}>
            {bagEmpty ? "Reset Score" : didGuess ? "Next Song" : "Continue?"}
          </Button>
        )}
      </Styled.Buttons>
    </>
  );
}
