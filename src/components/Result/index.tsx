import React, { useState } from "react";

import { Song } from "../../types/song";
import { GameMode } from "../../types/mode";
import { Round } from "../../types/stats";
import { buildShareText } from "../../helpers";
import { formatCountdown, msUntilNextDay } from "../../helpers/daily";
import { playTimes } from "../../constants";

import { Button } from "../Button";
import { NowPlaying } from "../NowPlaying";

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
}

/**
 * The win message for each try, told as a Blue Archive mission: a first-try
 * win is a three-star clear, and it gets hairier from there.
 */
const TEXT_FOR_TRY = [
  "3★ clear on the first try! ✨",
  "Sensei's EX Skill landed! 💥",
  "Mission complete, Sensei~ 📋",
  "Schale pulls through! 💪",
  "A narrow escape in Kivotos… 😅",
  "Cleared at the last second! 😭💥",
];

const LOSS_TITLE = "Tactical retreat, Sensei… 💔";
const LOSS_TEXT = "Arona says there's always next time! 📱";

const COUNTDOWN_TICK_MS = 30_000;

/**
 * Counts down to the next puzzle. Daily mode has nothing to advance to, so this
 * replaces the Next Song button rather than sitting beside it.
 */
function DailyCountdown({ onNewDay }: { onNewDay: () => void }) {
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
    <Styled.NextIn>Next song in {formatCountdown(remaining)}</Styled.NextIn>
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
}: Props) {
  const [buttonText, setButtonText] = useState("Share result");
  const isDaily = mode === "daily";

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
      if (e.key !== "Enter") return;
      e.preventDefault();
      advance();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [keyboardEnabled, isDaily, advance]);

  // The longest clip heard this round: the one for the final try taken.
  const lastTry = Math.min(Math.max(currentTry, 1), playTimes.length);
  const clipLength = playTimes[lastTry - 1] / 1000;

  const Title = didGuess ? Styled.CorrectResultTitle : Styled.FailResultTitle;
  const title = didGuess
    ? TEXT_FOR_TRY[
        Math.min(Math.max(currentTry - 1, 0), TEXT_FOR_TRY.length - 1)
      ]
    : LOSS_TITLE;

  return (
    <>
      <Title>{title}</Title>
      <Styled.Tries>
        {!isDaily && bagEmpty && "That was the last song. "}
        {didGuess
          ? `You got it right in ${currentTry} ${
              currentTry === 1 ? "guess" : "guesses"
            }.`
          : LOSS_TEXT}
      </Styled.Tries>
      <Styled.Score>
        {isDaily && typeof round.day === "number"
          ? `Puzzle #${round.day}`
          : `Score : ${score}`}
      </Styled.Score>
      <NowPlaying
        song={solution}
        startTime={startTime ?? 0}
        clipLength={clipLength}
      />
      {isDaily && <DailyCountdown onNewDay={onNewDay} />}
      <Styled.Buttons>
        <Button stroke onClick={copyResult} variant="background100">
          {buttonText}
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
