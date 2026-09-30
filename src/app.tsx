import React from "react";

import { Game as GameName, GameMode, isEndlessStyle } from "./types/mode";
import { Song } from "./types/song";
import { StudentGame as StudentWay } from "./types/student";
import { VoiceMode, VoiceStyle } from "./types/voice";
import { RoomHold, RoomNudge } from "./types/room";
import {
  pillOf,
  PictureKind,
  PictureMode,
  PictureOptions,
  PicturePill,
  PictureStyle,
  styleFor,
} from "./types/picture";

import { isGamePage, Page } from "./constants/pages";
import { useBirthdays } from "./hooks/useBirthdays";
import { guardHistory, unguardHistory, usePage } from "./hooks/usePage";
import { useServer } from "./hooks/useServer";
import { useGame } from "./hooks/useGame";
import { useStudentGame } from "./hooks/useStudentGame";
import { useTimeAttack } from "./hooks/useTimeAttack";
import { useVoiceGame } from "./hooks/useVoiceGame";
import { useVoiceTimeAttack } from "./hooks/useVoiceTimeAttack";
import { usePictureGame } from "./hooks/usePictureGame";
import { usePictureTimeAttack } from "./hooks/usePictureTimeAttack";
import { pictureRunsOf } from "./helpers/pictureTimeAttack";
import { KIND_NAMES, PICTURE_MODE_NAMES } from "./helpers/pictureRounds";
import { guessesForCharacter, isWon } from "./helpers/studentRounds";
import { asRound as voiceAsRound } from "./helpers/voiceRounds";
import { voiceRunsOf } from "./helpers/voiceTimeAttack";
import { runsOf } from "./helpers/timeAttack";
import { LATEST_UPDATE_ID } from "./constants/whatsNew";
import { placeFor } from "./helpers/winStreak";
import {
  hasSeenWhatsNew,
  isFirstRun,
  loadGame,
  loadMode,
  loadStudentGame,
  loadVoiceStyle,
  loadPictureKind,
  loadPictureStyle,
  markFirstRunDone,
  markWhatsNewSeen,
  saveGame,
  saveMode,
  saveStudentGame,
  saveVoiceStyle,
  savePictureKind,
  savePictureStyle,
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
  Jukebox,
} from "./components";
import {
  GameSwitch,
  PictureStyles,
  PlayStyles,
  StudentStyles,
  VoiceStyles,
} from "./components/PlayStyles";
import { PictureGame, PictureTimeAttack } from "./components/PictureGame";
import { PictureStats } from "./components/StatsPopUp/PictureStats";
import { ResetTarget } from "./components/SettingsPopUp/ResetStats";
import { BirthdayNote } from "./components/BirthdayNote";
import { Hub } from "./components/Hub";
import { StudentGame } from "./components/StudentGame";
import { TimeAttack } from "./components/TimeAttack";
import { VoiceGame, VoiceTimeAttack } from "./components/VoiceGame";
import { StudentStats } from "./components/StatsPopUp/StudentStats";
import { TimeAttackStats } from "./components/StatsPopUp/TimeAttackStats";
import { VoiceStats } from "./components/StatsPopUp/VoiceStats";

import * as Styled from "./app.styled";

/** How Settings' reset names a mode. */
const MODE_NAMES: Record<GameMode, string> = {
  daily: "Daily",
  endless: "Classic",
  choice: "4-Choice",
  timeattack: "Time Attack",
};

/** Loaded when first opened, with the portrait list it needs. */
const SenseiCard = React.lazy(() => import("./components/SenseiCard"));

/** Loaded on its own page only: most players never open a room. */
const Multiplayer = React.lazy(() => import("./components/Multiplayer"));

function App() {
  const [mode, setMode] = React.useState<GameMode>(loadMode);
  // The hub, a game's page or multiplayer's, from the address bar. On the
  // hub and in multiplayer every game waits behind, unseen, as the game
  // played last.
  // Set while a player is in a multiplayer room: see `held` below.
  const holdRef = React.useRef<(() => void) | null>(null);
  const [page, navigate] = usePage(holdRef);
  const isHub = page === "hub";
  const isRooms = page === "multiplayer";

  // In a multiplayer room, nothing takes the player out of it by a slip:
  // the other pages' links and Back stay put (Leave is the way out), and
  // the Jukebox waits while a game plays, as it would stop the round's
  // song. The room's screen says why when one is pressed.
  const [roomHold, setRoomHold] = React.useState<RoomHold>(null);
  const held = isRooms ? roomHold : null;
  const [nudge, setNudge] = React.useState<RoomNudge>();
  const nudgeFor = React.useCallback(
    (why: RoomNudge["why"]) =>
      setNudge((last) => ({ why, n: (last?.n ?? 0) + 1 })),
    []
  );
  React.useLayoutEffect(() => {
    holdRef.current = held ? () => nudgeFor("leave") : null;
  }, [held, nudgeFor]);
  const inRoom = held !== null;
  React.useEffect(() => {
    if (!inRoom) return;
    guardHistory();
    return unguardHistory;
  }, [inRoom]);
  // No game of its own on screen: no modes, streak, stats or reset.
  const noGame = !isGamePage(page);
  // The student games' server: their hooks load its saves when it changes,
  // their screens start afresh (see the keys below), and their taglines say
  // when it's JP.
  const server = useServer();
  const onJp = server === "jp" ? " · JP server" : "";
  const [lastGame, setLastGame] = React.useState<GameName>(loadGame);
  if (isGamePage(page) && lastGame !== page) setLastGame(page);
  const gameName: GameName = isGamePage(page) ? page : lastGame;
  const [studentWay, setStudentWay] =
    React.useState<StudentWay>(loadStudentGame);
  const isStudents = gameName === "students";
  const isVoice = gameName === "voice";
  const isPicture = gameName === "picture";
  const isTimeAttack = gameName === "ost" && mode === "timeattack";

  // Voice mode's way to play Endless, remembered apart from the OST's: it
  // has one more, No hints.
  const [voiceStyle, setVoiceStyle] =
    React.useState<VoiceStyle>(loadVoiceStyle);
  const voiceMode: VoiceMode = mode === "daily" ? "daily" : voiceStyle;
  const isVoiceTimeAttack = isVoice && voiceMode === "timeattack";
  // How the header and the pop-ups see it: No hints is a kind of Classic.
  const voiceHeaderMode: GameMode =
    voiceMode === "nohint" ? "endless" : voiceMode;

  // The picture game's kind, halo or weapon, and its way to play Endless:
  // a pill, and the silhouette and hints picked above the game.
  const [pictureKind, setPictureKind] =
    React.useState<PictureKind>(loadPictureKind);
  const [pictureStyle, setPictureStyle] =
    React.useState<PictureStyle>(loadPictureStyle);
  const pictureMode: PictureMode = mode === "daily" ? "daily" : pictureStyle;
  const isPictureTimeAttack = isPicture && pictureMode === "timeattack";
  // How the header and the pop-ups see it: every Classic is Classic.
  const pictureHeaderMode: GameMode =
    pictureMode === "daily" ? "daily" : pillOf(pictureMode);

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
  } = useGame(mode === "timeattack" ? "endless" : mode);

  const studentMode = mode === "daily" ? "daily" : "endless";
  const students = useStudentGame(studentWay, studentMode);
  // Time attack runs its own lines, and Classic waits behind it, unseen.
  const voice = useVoiceGame(
    voiceMode === "timeattack" ? "endless" : voiceMode
  );
  const voiceTimeAttack = useVoiceTimeAttack();
  const { finish: finishVoiceRun } = voiceTimeAttack;

  React.useEffect(() => {
    if (!isVoiceTimeAttack) finishVoiceRun();
  }, [isVoiceTimeAttack, finishVoiceRun]);

  // Time attack runs its own pictures, and Classic waits behind it, unseen.
  const picture = usePictureGame(
    pictureKind,
    pictureMode === "timeattack" ? "endless" : pictureMode
  );
  const pictureTimeAttack = usePictureTimeAttack(pictureKind);
  const { finish: finishPictureRun } = pictureTimeAttack;

  React.useEffect(() => {
    if (!isPictureTimeAttack) finishPictureRun();
  }, [isPictureTimeAttack, finishPictureRun]);
  const birthdays = useBirthdays();

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
  // The hub and multiplayer have no run of their own: they stay in the
  // library.
  const run = noGame
    ? 0
    : isStudents
    ? students.streak.current
    : isPicture
    ? isPictureTimeAttack
      ? pictureTimeAttack.score
      : picture.streak.current
    : isVoice
    ? isVoiceTimeAttack
      ? voiceTimeAttack.score
      : voice.streak.current
    : isTimeAttack
    ? timeAttack.score
    : streak.current;

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

  // The game played last, for the hub's Continue.
  React.useEffect(() => {
    if (isGamePage(page)) saveGame(page);
  }, [page]);

  React.useEffect(() => {
    saveStudentGame(studentWay);
  }, [studentWay]);

  React.useEffect(() => {
    saveVoiceStyle(voiceStyle);
  }, [voiceStyle]);

  React.useEffect(() => {
    savePictureKind(pictureKind);
  }, [pictureKind]);

  React.useEffect(() => {
    savePictureStyle(pictureStyle);
  }, [pictureStyle]);

  // Each pill's way to play as it was last: Classic with or without the
  // silhouette and hints, 4-Choice with or without the silhouette.
  const pictureLast = React.useRef<Record<PicturePill, PictureStyle>>({
    endless: "endless",
    choice: "choice",
    timeattack: "timeattack",
    [pillOf(pictureStyle)]: pictureStyle,
  });
  const changePicturePill = React.useCallback((pill: PicturePill) => {
    setPictureStyle(pictureLast.current[pill]);
  }, []);
  const setPictureOptions = React.useCallback((options: PictureOptions) => {
    setPictureStyle((was) => {
      const next = styleFor(pillOf(was), options);
      pictureLast.current[pillOf(was)] = next;
      return next;
    });
  }, []);
  const changePictureKind = React.useCallback(
    (next: PictureKind) => {
      // A run of the other kind ends: it can't carry on with this one.
      finishPictureRun();
      setPictureKind(next);
    },
    [finishPictureRun]
  );

  // Classic, with its hints on or off as they were last.
  const voiceClassic = React.useRef<VoiceStyle>(
    voiceStyle === "nohint" ? "nohint" : "endless"
  );
  const changeVoiceStyle = React.useCallback((next: VoiceStyle) => {
    if (next === "endless" || next === "nohint") {
      setVoiceStyle((was) =>
        next === "endless" && (was === "endless" || was === "nohint")
          ? was
          : next === "endless"
          ? voiceClassic.current
          : next
      );
    } else {
      setVoiceStyle(next);
    }
  }, []);
  const setVoiceHints = React.useCallback((on: boolean) => {
    voiceClassic.current = on ? "endless" : "nohint";
    setVoiceStyle(voiceClassic.current);
  }, []);

  // Read once on mount: the welcome pop-up is only shown to new players, on
  // the first game they open rather than the hub, which explains itself.
  const [isInfoPopUpOpen, setIsInfoPopUpOpen] = React.useState<boolean>(
    () => isFirstRun() && isGamePage(page)
  );

  const changePage = React.useCallback(
    (next: Page) => {
      if (holdRef.current && next !== page) {
        holdRef.current();
        return;
      }
      navigate(next);
      setSelectedSong(undefined);
      if (isGamePage(next) && isFirstRun()) setIsInfoPopUpOpen(true);
    },
    [navigate, page]
  );
  const goHome = React.useCallback(() => changePage("hub"), [changePage]);
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

  const [isCardOpen, setIsCardOpen] = React.useState(false);
  const openCard = React.useCallback(() => setIsCardOpen(true), []);
  const closeCard = React.useCallback(() => setIsCardOpen(false), []);

  const [isJukeboxOpen, setIsJukeboxOpen] = React.useState(false);
  const openJukebox = React.useCallback(() => {
    if (held === "game") nudgeFor("jukebox");
    else setIsJukeboxOpen(true);
  }, [held, nudgeFor]);
  const closeJukebox = React.useCallback(() => setIsJukeboxOpen(false), []);

  // Changes when a new round starts, in any mode: in time attack, with each
  // song answered.
  const taRun = timeAttack.run;
  const voiceRun = voiceTimeAttack.run;
  const pictureRun = pictureTimeAttack.run;
  const studentRound = students.round;
  const roundKey = `${server}:${
    noGame
      ? page
      : isStudents
      ? `${students.slot}:${studentRound.day ?? ""}:${students.rounds.length}`
      : isPictureTimeAttack
      ? `picture-ta:${pictureRun?.id ?? ""}:${pictureRun?.rounds.length ?? 0}`
      : isPicture
      ? `${pictureKind}-${pictureMode}:${picture.round.day ?? ""}:${
          picture.rounds.length
        }`
      : isVoiceTimeAttack
      ? `voice-ta:${voiceRun?.id ?? ""}:${voiceRun?.rounds.length ?? 0}`
      : isVoice
      ? `voice-${voiceMode}:${voice.round.day ?? ""}:${voice.rounds.length}`
      : isTimeAttack
      ? `${mode}:${taRun?.id ?? ""}:${taRun?.rounds.length ?? 0}`
      : `${mode}:${round.day ?? ""}:${solution.themeNo}`
  }`;

  // What the character reacts to: the round being played, or in time attack
  // the last song answered. In the student game each guess is a try, with no
  // end to them until the answer, or giving up.
  const lastAnswered = taRun?.rounds[taRun.rounds.length - 1];
  const studentGuesses = React.useMemo(
    () => guessesForCharacter(studentRound),
    [studentRound]
  );
  const voiceRound = voice.round;
  const voiceReaction = React.useMemo(() => {
    if (isVoiceTimeAttack) {
      const last = voiceRun?.rounds[voiceRun.rounds.length - 1];
      return last
        ? voiceAsRound(last)
        : { guesses: [], currentTry: 0, didGuess: false, tries: 1 };
    }
    return voiceAsRound(voiceRound);
  }, [isVoiceTimeAttack, voiceRun, voiceRound]);
  const pictureRound = picture.round;
  const pictureReaction = React.useMemo(() => {
    if (isPictureTimeAttack) {
      const last = pictureRun?.rounds[pictureRun.rounds.length - 1];
      return last
        ? voiceAsRound(last)
        : { guesses: [], currentTry: 0, didGuess: false, tries: 1 };
    }
    return voiceAsRound(pictureRound);
  }, [isPictureTimeAttack, pictureRun, pictureRound]);
  const reactTo = noGame
    ? { guesses: [], currentTry: 0, didGuess: false, tries: 1 }
    : isPicture
    ? pictureReaction
    : isVoice
    ? voiceReaction
    : isStudents
    ? {
        guesses: studentGuesses,
        currentTry: studentRound.guesses.length,
        didGuess: isWon(studentRound),
        tries: studentRound.gaveUp
          ? studentRound.guesses.length
          : studentRound.guesses.length + 1,
      }
    : isTimeAttack
    ? {
        ...(lastAnswered ?? { guesses: [], currentTry: 0, didGuess: false }),
        tries: 1,
      }
    : { ...round, tries: round.tries };

  // Songs guessed right in any mode, time attack included.
  const jukeboxGuessed = React.useMemo(
    () => new Set([...guessedEver, ...timeAttack.guessed]),
    [guessedEver, timeAttack.guessed]
  );

  const timeAttackRuns = React.useMemo(
    () => runsOf(timeAttack.history),
    [timeAttack.history]
  );
  const voiceRuns = React.useMemo(
    () => voiceRunsOf(voiceTimeAttack.history),
    [voiceTimeAttack.history]
  );
  const pictureRuns = React.useMemo(
    () => pictureRunsOf(pictureTimeAttack.history),
    [pictureTimeAttack.history]
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

  // What Settings' reset clears: the game and mode on screen, named. The hub
  // and multiplayer have no game on screen, so they have none.
  const reset: ResetTarget | undefined = noGame
    ? undefined
    : {
        name: isStudents
          ? `Students · ${studentWay === "lore" ? "Lore" : "Gameplay"} · ${
              studentMode === "daily" ? "Daily" : "Endless"
            }`
          : isPicture
          ? `Picture · ${KIND_NAMES[pictureKind]} · ${
              pictureMode === "timeattack"
                ? "Time Attack"
                : PICTURE_MODE_NAMES[pictureMode]
            }`
          : isVoice
          ? `Voice · ${
              voiceMode === "nohint" ? "No hints" : MODE_NAMES[voiceMode]
            }`
          : `OST · ${MODE_NAMES[mode]}`,
        canReset: isStudents
          ? students.hasHistory
          : isPictureTimeAttack
          ? pictureTimeAttack.stats.runs > 0
          : isPicture
          ? picture.hasHistory
          : isVoiceTimeAttack
          ? voiceTimeAttack.stats.runs > 0
          : isVoice
          ? voice.hasHistory
          : isTimeAttack
          ? timeAttack.stats.runs > 0
          : hasHistory,
        onReset: isStudents
          ? students.reset
          : isPictureTimeAttack
          ? pictureTimeAttack.resetHistory
          : isPicture
          ? picture.reset
          : isVoiceTimeAttack
          ? voiceTimeAttack.resetHistory
          : isVoice
          ? voice.reset
          : isTimeAttack
          ? timeAttack.resetHistory
          : resetScore,
      };

  const isPopUpOpen =
    isInfoPopUpOpen ||
    isStatsPopUpOpen ||
    isHowToPopUpOpen ||
    isSongListOpen ||
    isSettingsOpen ||
    isBadgesOpen ||
    isWhatsNewOpen ||
    isJukeboxOpen ||
    isCardOpen;

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
        openSenseiCard={openCard}
        // The student game has Daily and Endless only.
        mode={
          isStudents
            ? studentMode
            : isVoice
            ? voiceHeaderMode
            : isPicture
            ? pictureHeaderMode
            : mode
        }
        onModeChange={changeMode}
        streak={run}
        isHub={isHub}
        noGame={noGame}
        onHome={goHome}
        held={inRoom}
        tagline={
          isHub
            ? "Blue Archive guessing games"
            : isRooms
            ? "Play Blue Archive Heardle with friends"
            : isStudents
            ? `Guess the Blue Archive student${onJp}`
            : isPicture
            ? `Guess the Blue Archive student by ${pictureKind}${onJp}`
            : isVoice
            ? `Guess the Blue Archive student by voice${onJp}`
            : "Guess the Blue Archive OST"
        }
      />
      {isStatsPopUpOpen && isStudents && (
        <StudentStats
          onClose={closeStatsPopUp}
          game={studentWay}
          mode={studentMode}
          tally={students.tally}
          played={students.played}
          averageGuesses={students.averageGuesses}
          fastest={students.fastest}
          averageFind={students.averageFind}
          streak={students.streak.current}
          best={students.best}
          found={students.found}
          dailyResults={students.dailyResults}
        />
      )}
      {isStatsPopUpOpen && isPictureTimeAttack && (
        <TimeAttackStats
          onClose={closeStatsPopUp}
          stats={pictureTimeAttack.stats}
          runs={pictureRuns}
          streak={pictureTimeAttack.score}
          picture={pictureKind}
        />
      )}
      {isStatsPopUpOpen && isPicture && !isPictureTimeAttack && (
        <PictureStats
          onClose={closeStatsPopUp}
          kind={pictureKind}
          mode={picture.mode}
          tally={picture.tally}
          played={picture.played}
          streak={picture.streak.current}
          best={picture.best}
          found={picture.found}
          total={picture.total}
          dailyResults={picture.dailyResults}
        />
      )}
      {isStatsPopUpOpen && isVoiceTimeAttack && (
        <TimeAttackStats
          onClose={closeStatsPopUp}
          stats={voiceTimeAttack.stats}
          runs={voiceRuns}
          streak={voiceTimeAttack.score}
          voice
        />
      )}
      {isStatsPopUpOpen && isVoice && !isVoiceTimeAttack && (
        <VoiceStats
          onClose={closeStatsPopUp}
          mode={voice.mode}
          tally={voice.tally}
          played={voice.played}
          streak={voice.streak.current}
          best={voice.best}
          found={voice.found}
          dailyResults={voice.dailyResults}
        />
      )}
      {isStatsPopUpOpen && isTimeAttack && (
        <TimeAttackStats
          onClose={closeStatsPopUp}
          stats={timeAttack.stats}
          runs={timeAttackRuns}
          streak={timeAttack.score}
        />
      )}
      {isStatsPopUpOpen && gameName === "ost" && mode !== "timeattack" && (
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
          mode={
            isStudents
              ? studentMode
              : isVoice
              ? voiceHeaderMode
              : isPicture
              ? pictureHeaderMode
              : mode
          }
          game={gameName}
          pictureKind={pictureKind}
        />
      )}
      {isHowToPopUpOpen && <HowToPopUp onClose={closeHowToPopUp} />}
      {isSettingsOpen && (
        <SettingsPopUp onClose={closeSettingsPopUp} reset={reset} />
      )}
      {isBadgesOpen && <BadgesPopUp onClose={closeBadges} badges={badges} />}
      {isWhatsNewOpen && <WhatsNewPopUp onClose={closeWhatsNew} />}
      {isCardOpen && (
        <React.Suspense fallback={null}>
          <SenseiCard onClose={closeCard} streak={run} />
        </React.Suspense>
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
      <Styled.StyleBar>
        <GameSwitch page={page} onChange={changePage} held={inRoom} />
        <Styled.StyleRow>
          {noGame ? null : isStudents ? (
            <StudentStyles game={studentWay} onChange={setStudentWay} />
          ) : isPicture ? (
            pictureMode !== "daily" && (
              <PictureStyles
                style={pictureStyle}
                onChange={changePicturePill}
              />
            )
          ) : isVoice ? (
            voiceMode !== "daily" && (
              <VoiceStyles style={voiceStyle} onChange={changeVoiceStyle} />
            )
          ) : (
            isEndlessStyle(mode) && (
              <PlayStyles mode={mode} onChange={changeStyle} />
            )
          )}
        </Styled.StyleRow>
      </Styled.StyleBar>
      <BirthdayNote students={birthdays} />
      {/* A new one for each page, so it starts scrolled to the top. */}
      <Styled.PlayArea key={page}>
        <Styled.Container $top={isStudents}>
          {isHub ? (
            <Hub onOpen={changePage} onSenseiCard={openCard} />
          ) : isRooms ? (
            <React.Suspense fallback={null}>
              <Multiplayer
                keyboardEnabled={!isPopUpOpen}
                onHold={setRoomHold}
                nudge={nudge}
              />
            </React.Suspense>
          ) : isStudents ? (
            <StudentGame
              // A new screen for each way to play and mode, as for the OST.
              key={`${server}:${students.slot}`}
              game={studentWay}
              mode={studentMode}
              round={studentRound}
              score={`${students.wins}/${students.played}`}
              streak={students.streak}
              onGuess={students.guess}
              onGiveUp={students.giveUp}
              onNext={students.next}
              onNewDay={students.refreshDay}
              keyboardEnabled={!isPopUpOpen}
            />
          ) : isPictureTimeAttack ? (
            <PictureTimeAttack
              key={server}
              timeAttack={pictureTimeAttack}
              onKindChange={changePictureKind}
              keyboardEnabled={!isPopUpOpen}
            />
          ) : isPicture ? (
            <PictureGame
              // A new screen for each kind and mode, as for the OST.
              key={`${server}:${pictureKind}-${pictureMode}`}
              game={picture}
              onKindChange={changePictureKind}
              onOptionsChange={setPictureOptions}
              keyboardEnabled={!isPopUpOpen}
            />
          ) : isVoiceTimeAttack ? (
            <VoiceTimeAttack
              key={server}
              timeAttack={voiceTimeAttack}
              keyboardEnabled={!isPopUpOpen}
            />
          ) : isVoice ? (
            <VoiceGame
              // A new screen for each mode, as for the OST.
              key={`${server}:${voiceMode}`}
              mode={voice.mode}
              game={voice}
              onHintsChange={setVoiceHints}
              keyboardEnabled={!isPopUpOpen}
            />
          ) : isTimeAttack ? (
            <TimeAttack
              timeAttack={timeAttack}
              keyboardEnabled={!isPopUpOpen}
            />
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
      </Styled.PlayArea>
      <Character
        guesses={reactTo.guesses}
        currentTry={reactTo.currentTry}
        didGuess={reactTo.didGuess}
        roundKey={roundKey}
        tries={reactTo.tries}
      />
      {/* Always there: its music plays on in the corner when it closes,
          until a game's own audio plays. Last before the footer: on most
          screens its corner player is a bar there, above which the play
          area ends. */}
      <Jukebox
        open={isJukeboxOpen}
        onOpen={openJukebox}
        onClose={closeJukebox}
        guessed={jukeboxGuessed}
      />
      <Footer />
    </Styled.BG>
  );
}

export default App;
