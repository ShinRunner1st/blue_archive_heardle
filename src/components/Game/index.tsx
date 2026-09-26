import React, { useRef } from "react";
import { WinStreak } from "../../helpers/winStreak";

import { GuessType } from "../../types/guess";
import { GameMode } from "../../types/mode";
import { Song } from "../../types/song";
import { Round } from "../../types/stats";
import { MAX_TRIES } from "../../constants/game";
import { playTimes } from "../../constants";

import { Button, Guess, Player, Search, Result } from "../";

import * as Styled from "./index.styled";

interface Props {
  guesses: GuessType[];
  solution: Song;
  currentTry: number;
  didGuess: boolean;
  selectedSong: Song | undefined;
  setSelectedSong: React.Dispatch<React.SetStateAction<Song | undefined>>;
  skip: () => void;
  guess: () => void;
  score: string;
  bagEmpty: boolean;
  onNextSong: () => void;
  onResetScore: () => void;
  setStartTime: (time: number) => void;
  startTime: number | null;
  /** False while a dialog is open, so global shortcuts stay inert. */
  keyboardEnabled: boolean;
  mode: GameMode;
  round: Round;
  onNewDay: () => void;
  /** Deals a different song when this one turns out to be unplayable. */
  onSkipTrack?: () => void;
  /** Opens the full song list to pick a guess from. */
  onBrowseSongs?: () => void;
  /** The mode's run of wins, which moves the background. */
  streak: WinStreak;
  /** What this round did for the OST badges. */
  badgeLines: string[];
}

export function Game({
  streak,
  badgeLines,
  guesses,
  solution,
  currentTry,
  didGuess,
  selectedSong,
  setSelectedSong,
  skip,
  guess,
  score,
  bagEmpty,
  onNextSong,
  onResetScore,
  setStartTime,
  startTime,
  keyboardEnabled,
  mode,
  round,
  onNewDay,
  onSkipTrack,
  onBrowseSongs,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const isOver = didGuess || currentTry >= MAX_TRIES;

  // Shift+Enter skips (or gives up, on the last try) from anywhere, so a round
  // can be played start to finish without the mouse. A held key doesn't
  // repeat it, or one press could skip every try.
  React.useEffect(() => {
    if (!keyboardEnabled || isOver) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Enter" || !e.shiftKey || e.repeat) return;
      e.preventDefault();
      skip();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [keyboardEnabled, isOver, skip]);

  if (isOver) {
    return (
      <Result
        didGuess={didGuess}
        currentTry={currentTry}
        solution={solution}
        score={score}
        bagEmpty={bagEmpty}
        onNextSong={onNextSong}
        onResetScore={onResetScore}
        startTime={startTime}
        keyboardEnabled={keyboardEnabled}
        mode={mode}
        round={round}
        onNewDay={onNewDay}
        streak={streak}
        badgeLines={badgeLines}
      />
    );
  }

  const isLastTry = currentTry === MAX_TRIES - 1;
  const nextClipBonus = isLastTry
    ? 0
    : (playTimes[currentTry + 1] - playTimes[currentTry]) / 1000;

  return (
    <>
      {guesses.map((guessSlot: GuessType, index) => (
        <Guess
          key={index}
          guess={guessSlot}
          active={index === currentTry}
          solution={solution}
        />
      ))}
      <Player
        themeNo={solution.themeNo}
        currentTry={currentTry}
        setStartTime={setStartTime}
        startTime={startTime}
        inputRef={inputRef}
        keyboardEnabled={keyboardEnabled}
        onSkipTrack={onSkipTrack}
      />
      <Search
        currentTry={currentTry}
        setSelectedSong={setSelectedSong}
        selectedSong={selectedSong}
        inputRef={inputRef}
        onBrowseSongs={onBrowseSongs}
        keyboardEnabled={keyboardEnabled}
      />

      <Styled.Buttons>
        <Button stroke onClick={skip}>
          {isLastTry ? "Give up?" : `Skip +${nextClipBonus}s`}
        </Button>
        <Button stroke variant="green" onClick={guess} disabled={!selectedSong}>
          Guess
        </Button>
      </Styled.Buttons>
    </>
  );
}
