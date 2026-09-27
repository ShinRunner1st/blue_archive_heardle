import React from "react";

import { GameMode } from "./types/mode";
import { Song } from "./types/song";

import { useGame } from "./hooks/useGame";
import { LATEST_UPDATE_ID } from "./constants/whatsNew";
import { placeFor } from "./helpers/winStreak";
import {
  hasSeenWhatsNew,
  isFirstRun,
  loadMode,
  markFirstRunDone,
  markWhatsNewSeen,
  saveMode,
} from "./helpers/storage";

import {
  Backdrop,
  Character,
  Header,
  InfoPopUp,
  Game,
  Footer,
  StatsPopUp,
  HowToPopUp,
  SongListPopUp,
  SettingsPopUp,
  BadgesPopUp,
  WhatsNewPopUp,
  JukeboxPopUp,
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
    dailyResults,
    recap,
    winStreak,
    dayStreak,
    badges,
    guessedEver,
    badgeLines,
    record,
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

  // The mode's own run: it sets the background and the header's count.
  const streak = mode === "daily" ? dayStreak : winStreak;

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
  const [isBadgesOpen, setIsBadgesOpen] = React.useState(false);
  // Returning players see the latest news once; new players get the welcome,
  // which counts as having seen it.
  const [isWhatsNewOpen, setIsWhatsNewOpen] = React.useState(
    () => !isFirstRun() && !hasSeenWhatsNew(LATEST_UPDATE_ID)
  );

  const openInfoPopUp = React.useCallback(() => setIsInfoPopUpOpen(true), []);
  const closeInfoPopUp = React.useCallback(() => {
    markFirstRunDone();
    markWhatsNewSeen(LATEST_UPDATE_ID);
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

  const openBadges = React.useCallback(() => setIsBadgesOpen(true), []);
  const closeBadges = React.useCallback(() => setIsBadgesOpen(false), []);

  const openWhatsNew = React.useCallback(() => setIsWhatsNewOpen(true), []);
  const closeWhatsNew = React.useCallback(() => {
    markWhatsNewSeen(LATEST_UPDATE_ID);
    setIsWhatsNewOpen(false);
  }, []);

  const [isJukeboxOpen, setIsJukeboxOpen] = React.useState(false);
  const openJukebox = React.useCallback(() => setIsJukeboxOpen(true), []);
  const closeJukebox = React.useCallback(() => setIsJukeboxOpen(false), []);

  // Changes when a new round starts, in any mode.
  const roundKey = `${mode}:${round.day ?? ""}:${solution.themeNo}`;

  // The Jukebox belongs to the result screen: a new round closes it, so it
  // can never be open while a clip is being guessed.
  React.useEffect(() => {
    setIsJukeboxOpen(false);
  }, [roundKey]);

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
    isSettingsOpen ||
    isBadgesOpen ||
    isWhatsNewOpen ||
    isJukeboxOpen;

  // Marked in the song list, so a wrong answer isn't picked twice by accident.
  const guessedThemeNos = React.useMemo(
    () =>
      guesses.flatMap((slot) =>
        slot.song && !slot.isCorrect ? [slot.song.themeNo] : []
      ),
    [guesses]
  );

  // Enter submits the highlighted song from anywhere on the page. Shift+Enter
  // is the skip key instead (see Game).
  React.useEffect(() => {
    if (isPopUpOpen || !selectedSong) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Enter" || e.shiftKey || e.repeat) return;
      e.preventDefault();
      submitGuess();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPopUpOpen, selectedSong, submitGuess]);

  return (
    <Styled.BG>
      <Backdrop place={placeFor(streak.current)} />
      <Header
        openInfoPopUp={openInfoPopUp}
        openStatsPopUp={openStatsPopUp}
        openBadgesPopUp={openBadges}
        openHowToPopUp={openHowToPopUp}
        openSettingsPopUp={openSettingsPopUp}
        openWhatsNewPopUp={openWhatsNew}
        mode={mode}
        onModeChange={changeMode}
        streak={streak.current}
      />
      {isStatsPopUpOpen && (
        <StatsPopUp
          onClose={closeStatsPopUp}
          score={score}
          stats={stats}
          mode={mode}
          streaks={streaks}
          dailyResults={dailyResults}
          recap={recap}
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
      {isBadgesOpen && <BadgesPopUp onClose={closeBadges} badges={badges} />}
      {isWhatsNewOpen && <WhatsNewPopUp onClose={closeWhatsNew} />}
      {isJukeboxOpen && (
        <JukeboxPopUp onClose={closeJukebox} guessed={guessedEver} />
      )}
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
          streak={streak}
          badgeLines={badgeLines}
          record={record}
          onOpenJukebox={openJukebox}
        />
      </Styled.Container>
      <Character
        guesses={guesses}
        currentTry={currentTry}
        didGuess={didGuess}
        roundKey={roundKey}
      />
      <Footer />
    </Styled.BG>
  );
}

export default App;
