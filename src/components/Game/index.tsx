import React, { useRef } from "react";
import { WinStreak } from "../../helpers/winStreak";

import { GuessType } from "../../types/guess";
import { GameMode } from "../../types/mode";
import { Song } from "../../types/song";
import { Round } from "../../types/stats";
import { MAX_TRIES } from "../../constants/game";
import { playTimes } from "../../constants";
import { isFinished } from "../../helpers";

import { Button, Guess, Player, Search, Result } from "../";
import { Choices } from "../Choices";
import { ClipLength } from "../ClipLength";

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
  /** Answers a four-choice round with the song picked. */
  pick: (song: Song) => void;
  /** Picks the four-choice clip length. */
  setClip: (seconds: number) => void;
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
  /** The player's history with this song, once the round is over. */
  record: string;
}

export function Game({
  streak,
  badgeLines,
  record,
  guesses,
  solution,
  currentTry,
  didGuess,
  selectedSong,
  setSelectedSong,
  skip,
  guess,
  pick,
  setClip,
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
  const isOver = isFinished(round);
  const choices = round.choices;

  // Whether a round has been played on this screen since it opened. The
  // answer only plays by itself when the round ended here: switching to a
  // mode whose round is already over, or reloading, stays quiet. The screen
  // is made again for each mode, so this starts false with each switch.
  const playedHere = useRef(false);
  if (!isOver) playedHere.current = true;

  // Shift+Enter skips (or gives up, on the last try) from anywhere, so a round
  // can be played start to finish without the mouse. A held key doesn't
  // repeat it, or one press could skip every try.
  React.useEffect(() => {
    if (!keyboardEnabled || isOver || choices) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Enter" || !e.shiftKey || e.repeat) return;
      e.preventDefault();
      skip();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [keyboardEnabled, isOver, choices, skip]);

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
        record={record}
        autoPlay={playedHere.current}
      />
    );
  }

  // Four-choice: one short clip, then one pick from four.
  if (choices) {
    return (
      <>
        <Styled.ClipRow>
          <Styled.ClipLabel>Clip length</Styled.ClipLabel>
          <ClipLength value={round.clip ?? 1} onChange={setClip} />
        </Styled.ClipRow>
        <Player
          themeNo={solution.themeNo}
          currentTry={0}
          setStartTime={setStartTime}
          startTime={startTime}
          inputRef={inputRef}
          keyboardEnabled={keyboardEnabled}
          onSkipTrack={onSkipTrack}
          lengths={[(round.clip ?? playTimes[0] / 1000) * 1000]}
          hint={
            <>
              <kbd>Space</kbd> play · <kbd>1</kbd>–<kbd>4</kbd> pick an answer
            </>
          }
        />
        <Choices
          choices={choices}
          onPick={pick}
          keyboardEnabled={keyboardEnabled}
        />
      </>
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
