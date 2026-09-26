import React from "react";

import { GameMode } from "./types/mode";
import { Song } from "./types/song";

import { useGame } from "./hooks/useGame";
import {
  isFirstRun,
  loadMode,
  markFirstRunDone,
  saveMode,
} from "./helpers/storage";

import {
  Character,
  Header,
  InfoPopUp,
  Game,
  Footer,
  StatsPopUp,
  HowToPopUp,
  SongListPopUp,
  SettingsPopUp,
} from "./components";

import * as Styled from "./app.styled";

function App() {
  const [mode, setMode] = React.useState<GameMode>(loadMode);

  const {
    solution,
    guesses,
    currentTry,
    didGuess,
    startTime,
    round,
    stats,
    score,
    streaks,
    bagEmpty,
    hasHistory,
    guess,
    skip,
    setStartTime,
    nextSong,
    replaceCurrentSong,
    resetScore,
    refreshDay,
  } = useGame(mode);

  const [selectedSong, setSelectedSong] = React.useState<Song>();

  const changeMode = React.useCallback((next: GameMode) => {
    setMode(next);
    // A song picked for the old mode's round must not carry over.
    setSelectedSong(undefined);
  }, []);

  // Also pins the first-visit choice on mount: loadMode works out whether this
  // is a returning player from the endless history, which useGame overwrites
  // as soon as it runs, so the answer has to be written down immediately.
  React.useEffect(() => {
    saveMode(mode);
  }, [mode]);

  // Read once on mount: the welcome pop-up is only shown to new players.
  const [isInfoPopUpOpen, setIsInfoPopUpOpen] =
    React.useState<boolean>(isFirstRun);
  const [isStatsPopUpOpen, setIsStatsPopUpOpen] = React.useState(false);
  const [isHowToPopUpOpen, setIsHowToPopUpOpen] = React.useState(false);
  const [isSongListOpen, setIsSongListOpen] = React.useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);

  const openInfoPopUp = React.useCallback(() => setIsInfoPopUpOpen(true), []);
  const closeInfoPopUp = React.useCallback(() => {
    markFirstRunDone();
    setIsInfoPopUpOpen(false);
  }, []);

  const openStatsPopUp = React.useCallback(() => setIsStatsPopUpOpen(true), []);
  const closeStatsPopUp = React.useCallback(
    () => setIsStatsPopUpOpen(false),
    []
  );

  const openHowToPopUp = React.useCallback(() => setIsHowToPopUpOpen(true), []);
  const closeHowToPopUp = React.useCallback(
    () => setIsHowToPopUpOpen(false),
    []
  );

  const openSettingsPopUp = React.useCallback(
    () => setIsSettingsOpen(true),
    []
  );
  const closeSettingsPopUp = React.useCallback(
    () => setIsSettingsOpen(false),
    []
  );

  const openSongList = React.useCallback(() => setIsSongListOpen(true), []);
  const closeSongList = React.useCallback(() => setIsSongListOpen(false), []);
  const pickFromSongList = React.useCallback((song: Song) => {
    setSelectedSong(song);
    setIsSongListOpen(false);
  }, []);

  const submitGuess = React.useCallback(() => {
    if (!selectedSong) return;
    guess(selectedSong);
    setSelectedSong(undefined);
  }, [guess, selectedSong]);

  const isPopUpOpen =
    isInfoPopUpOpen ||
    isStatsPopUpOpen ||
    isHowToPopUpOpen ||
    isSongListOpen ||
    isSettingsOpen;

  // Marked in the song list, so a wrong answer isn't picked twice by accident.
  const guessedThemeNos = React.useMemo(
    () =>
      guesses.flatMap((slot) =>
        slot.song && !slot.isCorrect ? [slot.song.themeNo] : []
      ),
    [guesses]
  );

  // Enter submits the highlighted song from anywhere on the page.
  React.useEffect(() => {
    if (isPopUpOpen || !selectedSong) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Enter") return;
      e.preventDefault();
      submitGuess();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPopUpOpen, selectedSong, submitGuess]);

  return (
    <Styled.BG>
      <Header
        openInfoPopUp={openInfoPopUp}
        openStatsPopUp={openStatsPopUp}
        openHowToPopUp={openHowToPopUp}
        openSettingsPopUp={openSettingsPopUp}
        mode={mode}
        onModeChange={changeMode}
        streak={streaks.current}
      />
      {isStatsPopUpOpen && (
        <StatsPopUp
          onClose={closeStatsPopUp}
          score={score}
          stats={stats}
          mode={mode}
          streaks={streaks}
        />
      )}
      {isInfoPopUpOpen && (
        <InfoPopUp
          onClose={closeInfoPopUp}
          canReset={hasHistory}
          onReset={resetScore}
          mode={mode}
        />
      )}
      {isHowToPopUpOpen && <HowToPopUp onClose={closeHowToPopUp} />}
      {isSettingsOpen && <SettingsPopUp onClose={closeSettingsPopUp} />}
      {isSongListOpen && (
        <SongListPopUp
          onClose={closeSongList}
          onSelect={pickFromSongList}
          selectedSong={selectedSong}
          guessed={guessedThemeNos}
        />
      )}
      <Styled.Container>
        <Game
          // Remounting on a mode change clears the search box and the player,
          // which otherwise carry the old mode's round over.
          key={mode}
          guesses={guesses}
          didGuess={didGuess}
          solution={solution}
          currentTry={currentTry}
          selectedSong={selectedSong}
          setSelectedSong={setSelectedSong}
          skip={skip}
          guess={submitGuess}
          score={score}
          bagEmpty={bagEmpty}
          onNextSong={nextSong}
          onResetScore={resetScore}
          setStartTime={setStartTime}
          startTime={startTime}
          keyboardEnabled={!isPopUpOpen}
          mode={mode}
          round={round}
          onNewDay={refreshDay}
          // Daily is the same puzzle for everyone, so a bad track there cannot
          // be swapped out - only endless can deal a replacement.
          onSkipTrack={mode === "endless" ? replaceCurrentSong : undefined}
          onBrowseSongs={openSongList}
        />
      </Styled.Container>
      <Character
        guesses={guesses}
        currentTry={currentTry}
        didGuess={didGuess}
        roundKey={`${mode}:${round.day ?? ""}:${solution.themeNo}`}
      />
      <Footer />
    </Styled.BG>
  );
}

export default App;
