import React from "react";

import { GameMode, isEndlessStyle } from "./types/mode";
import { Song } from "./types/song";

import { useGame } from "./hooks/useGame";
import { useTimeAttack } from "./hooks/useTimeAttack";
import { runsOf } from "./helpers/timeAttack";
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
import { PlayStyles } from "./components/PlayStyles";
import { TimeAttack } from "./components/TimeAttack";
import { TimeAttackStats } from "./components/StatsPopUp/TimeAttackStats";

import * as Styled from "./app.styled";

function App() {
  const [mode, setMode] = React.useState<GameMode>(loadMode);
  const isTimeAttack = mode === "timeattack";

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
    setClip,
    nextSong,
    replaceCurrentSong,
    resetScore,
    refreshDay,
    // Time attack runs its own songs (see useTimeAttack); this side of the
    // game stays on Endless behind it, unseen.
  } = useGame(isTimeAttack ? "endless" : mode);

  const timeAttack = useTimeAttack();
  const { finish: finishRun } = timeAttack;

  // Leaving time attack for another mode ends the run there and then.
  React.useEffect(() => {
    if (!isTimeAttack) finishRun();
  }, [isTimeAttack, finishRun]);

  const [selectedSong, setSelectedSong] = React.useState<Song>();

  // The mode's own run: it sets the background and the header's count. In
  // time attack that is the run's score, from zero again with each run.
  const streak = mode === "daily" ? dayStreak : winStreak;
  const run = isTimeAttack ? timeAttack.score : streak.current;

  // The way to play Endless picked last, which the header's Endless button
  // goes back to.
  const [endlessStyle, setEndlessStyle] = React.useState<GameMode>(() =>
    isEndlessStyle(mode) ? mode : "endless"
  );

  const changeMode = React.useCallback(
    (next: GameMode) => {
      // The header's Endless button, pressed while already in Endless.
      if (next === "endless" && isEndlessStyle(mode)) return;

      const target = next === "endless" ? endlessStyle : next;
      if (isEndlessStyle(target)) setEndlessStyle(target);
      setMode(target);
      // A song picked for the old mode's round must not carry over.
      setSelectedSong(undefined);
    },
    [mode, endlessStyle]
  );

  const changeStyle = React.useCallback((next: GameMode) => {
    setEndlessStyle(next);
    setMode(next);
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

  // Changes when a new round starts, in any mode: in time attack, with each
  // song answered.
  const taRun = timeAttack.run;
  const roundKey = isTimeAttack
    ? `${mode}:${taRun?.id ?? ""}:${taRun?.rounds.length ?? 0}`
    : `${mode}:${round.day ?? ""}:${solution.themeNo}`;

  // What the character reacts to: the round being played, or in time attack
  // the last song answered.
  const lastAnswered = taRun?.rounds[taRun.rounds.length - 1];
  const reactTo = isTimeAttack
    ? lastAnswered ?? { guesses: [], currentTry: 0, didGuess: false }
    : round;

  // Songs guessed right in any mode, time attack included.
  const jukeboxGuessed = React.useMemo(
    () => new Set([...guessedEver, ...timeAttack.guessed]),
    [guessedEver, timeAttack.guessed]
  );

  const timeAttackRuns = React.useMemo(
    () => runsOf(timeAttack.history),
    [timeAttack.history]
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
      <Backdrop place={placeFor(run)} />
      <Header
        openInfoPopUp={openInfoPopUp}
        openStatsPopUp={openStatsPopUp}
        openBadgesPopUp={openBadges}
        openHowToPopUp={openHowToPopUp}
        openSettingsPopUp={openSettingsPopUp}
        openWhatsNewPopUp={openWhatsNew}
        openJukeboxPopUp={openJukebox}
        mode={mode}
        onModeChange={changeMode}
        streak={run}
      />
      {isStatsPopUpOpen && isTimeAttack && (
        <TimeAttackStats
          onClose={closeStatsPopUp}
          stats={timeAttack.stats}
          runs={timeAttackRuns}
          streak={timeAttack.score}
        />
      )}
      {isStatsPopUpOpen && !isTimeAttack && (
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
          canReset={isTimeAttack ? timeAttack.stats.runs > 0 : hasHistory}
          onReset={isTimeAttack ? timeAttack.resetHistory : resetScore}
          mode={mode}
        />
      )}
      {isHowToPopUpOpen && <HowToPopUp onClose={closeHowToPopUp} />}
      {isSettingsOpen && <SettingsPopUp onClose={closeSettingsPopUp} />}
      {isBadgesOpen && <BadgesPopUp onClose={closeBadges} badges={badges} />}
      {isWhatsNewOpen && <WhatsNewPopUp onClose={closeWhatsNew} />}
      {isJukeboxOpen && (
        <JukeboxPopUp onClose={closeJukebox} guessed={jukeboxGuessed} />
      )}
      {isSongListOpen && (
        <SongListPopUp
          onClose={closeSongList}
          onSelect={pickFromSongList}
          selectedSong={selectedSong}
          guessed={guessedThemeNos}
        />
      )}
      {/* Below the header rather than in the play area, which is centred on
          the page: there it moved with every screen's height. */}
      {isEndlessStyle(mode) && (
        <Styled.StyleBar>
          <PlayStyles mode={mode} onChange={changeStyle} />
        </Styled.StyleBar>
      )}
      <Styled.Container>
        {isTimeAttack ? (
          <TimeAttack timeAttack={timeAttack} keyboardEnabled={!isPopUpOpen} />
        ) : (
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
            pick={guess}
            setClip={setClip}
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
            // be swapped out - only the bag modes can deal a replacement.
            onSkipTrack={mode === "daily" ? undefined : replaceCurrentSong}
            onBrowseSongs={openSongList}
            streak={streak}
            badgeLines={badgeLines}
            record={record}
          />
        )}
      </Styled.Container>
      <Character
        guesses={reactTo.guesses}
        currentTry={reactTo.currentTry}
        didGuess={reactTo.didGuess}
        roundKey={roundKey}
        tries={isTimeAttack ? 1 : round.tries}
      />
      <Footer />
    </Styled.BG>
  );
}

export default App;
