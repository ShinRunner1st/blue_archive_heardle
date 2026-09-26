import React from "react";

import { playTimes } from "../../constants";
import { getClipUrl } from "../../helpers/audioUrl";
import { hideTrackFromMediaSession } from "../../helpers/mediaSession";
import { markUnplayable } from "../../helpers/unplayable";
import { useAudioVolume } from "../../hooks/useVolume";

import { Button } from "../Button";
import { VolumeControl } from "../VolumeControl";

import * as Styled from "./index.styled";

interface Props {
  themeNo: string;
  currentTry: number;
  setStartTime: (time: number) => void;
  /** null until a clip window has been rolled for this round. */
  startTime: number | null;
  inputRef: React.RefObject<HTMLInputElement | null>;
  keyboardEnabled: boolean;
  /**
   * Deals a different song. Endless mode only - daily has one track a day, so
   * an unplayable one cannot be swapped out without breaking the shared puzzle.
   */
  onSkipTrack?: () => void;
}

const POLL_INTERVAL_MS = 250;
const LONGEST_CLIP_SECONDS = playTimes[playTimes.length - 1] / 1000;

/**
 * How long to wait for the file's metadata before assuming it is never coming.
 * Long enough not to fire on a slow connection, short enough that nobody sits
 * in front of a silent progress bar wondering whether to reload.
 */
const READY_TIMEOUT_MS = 12_000;

type Status = "loading" | "ready" | "blocked" | "timedout";

export function Player({
  themeNo,
  currentTry,
  setStartTime,
  startTime,
  inputRef,
  keyboardEnabled,
  onSkipTrack,
}: Props) {
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  const [play, setPlay] = React.useState<boolean>(false);
  const [currentTime, setCurrentTime] = React.useState<number>(0);
  const [status, setStatus] = React.useState<Status>("loading");
  // Bumped to remount the audio element, which starts a fresh load.
  const [attempt, setAttempt] = React.useState(0);

  const isReady = status === "ready";
  const hasFailed = status === "blocked" || status === "timedout";

  const currentPlayTime =
    playTimes[currentTry] ?? playTimes[playTimes.length - 1];

  /**
   * A new song, or a retry, starts the wait over. This runs during render
   * rather than in an effect on purpose: an effect runs after the new element
   * is already loading, so it could clobber a loadedmetadata that arrived
   * first (a cached file) and strand the player on "loading".
   */
  const session = `${themeNo}:${attempt}`;
  const sessionRef = React.useRef(session);

  if (sessionRef.current !== session) {
    sessionRef.current = session;
    setStatus("loading");
    setPlay(false);
  }

  /**
   * Without this the controls never appear: they are gated on the metadata,
   * and a file that never loads leaves the player staring at "Loading
   * player..." with no explanation and no way forward.
   */
  React.useEffect(() => {
    if (status !== "loading") return;

    const timer = window.setTimeout(
      () => setStatus("timedout"),
      READY_TIMEOUT_MS
    );

    return () => window.clearTimeout(timer);
  }, [status, themeNo, attempt]);

  // Only poll while a clip is playing, and always clear the timer - this
  // component unmounts every time the round ends.
  React.useEffect(() => {
    if (!play) return;

    const interval = window.setInterval(() => {
      const audio = audioRef.current;
      if (audio) setCurrentTime(audio.currentTime);
    }, POLL_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [play]);

  const clipStart = startTime ?? 0;

  const pausePlayback = React.useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = clipStart;
    }
    setCurrentTime(clipStart);
    setPlay(false);
  }, [clipStart]);

  const startPlayback = React.useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    hideTrackFromMediaSession();
    setPlay(true);

    // play() rejects when the browser blocks it, or when a pause lands before
    // it starts. Either way nothing is playing, so the button must say so.
    Promise.resolve(audio.play()).catch(() => setPlay(false));
  }, []);

  // Stop once the clip for this try has run its length.
  React.useEffect(() => {
    if (!play) return;
    if ((currentTime - clipStart) * 1000 < currentPlayTime) return;

    pausePlayback();
  }, [play, currentTime, clipStart, currentPlayTime, pausePlayback]);

  // Space toggles playback, unless a dialog is open or the player is typing in
  // the search box.
  React.useEffect(() => {
    if (!keyboardEnabled || !isReady) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      if (document.activeElement === inputRef.current) return;

      e.preventDefault();
      if (play) pausePlayback();
      else startPlayback();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [keyboardEnabled, isReady, play, pausePlayback, startPlayback, inputRef]);

  const handleReady = React.useCallback(
    (event: React.SyntheticEvent<HTMLAudioElement>) => {
      const audio = event.currentTarget;

      // The file is only the round's clip, cut at a fixed point in the song
      // (see scripts/build-audio.mjs), so it always plays from the top. A
      // round saved before clips existed holds a point in the whole song
      // instead, and starts over at the top of the clip.
      if (startTime !== 0) setStartTime(0);
      audio.currentTime = 0;

      setCurrentTime(0);
      setStatus("ready");
    },
    [startTime, setStartTime]
  );

  const handleError = React.useCallback(() => {
    // Unlike a timeout, this is the file itself failing - missing, or in a
    // format this browser cannot decode - so keep it out of the session.
    markUnplayable(themeNo);
    setStatus("blocked");
    setPlay(false);

    if (import.meta.env.DEV) {
      // Names the offending file while developing, so a missing one can be
      // tracked down without guessing.
      // eslint-disable-next-line no-console
      console.warn(`Could not play ${getClipUrl(themeNo)}`);
    }
  }, [themeNo]);

  // Playback can also be started or stopped from outside the page, such as
  // the browser's media controls. Following it keeps the clip limit enforced.
  const handlePlay = React.useCallback(() => setPlay(true), []);
  const handlePause = React.useCallback(() => setPlay(false), []);

  const retry = React.useCallback(() => setAttempt((n) => n + 1), []);

  useAudioVolume(audioRef, attempt);

  return (
    <>
      {/* One element for the current song only - nothing else is fetched.
          No captions: the tracks are instrumental, and naming the song would
          give the answer away. */}
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio
        key={attempt}
        ref={audioRef}
        src={getClipUrl(themeNo)}
        preload="metadata"
        onLoadedMetadata={handleReady}
        onError={handleError}
        onPlay={handlePlay}
        onPause={handlePause}
        onEnded={pausePlayback}
      />

      {isReady && (
        <>
          <Styled.ProgressBackground>
            <Styled.Progress
              $value={Math.max(currentTime - clipStart, 0)}
              $max={LONGEST_CLIP_SECONDS}
            />
            {playTimes.map((playTime) => (
              <Styled.Separator
                style={{
                  left: `${(playTime / 1000 / LONGEST_CLIP_SECONDS) * 100}%`,
                }}
                key={playTime}
              />
            ))}
          </Styled.ProgressBackground>
          <Styled.TimeStamps>
            {playTimes.map((playTime) => (
              <Styled.TimeStamp
                key={playTime}
                style={{
                  left: `${(playTime / 1000 / LONGEST_CLIP_SECONDS) * 100}%`,
                }}
              >
                {playTime / 1000}s
              </Styled.TimeStamp>
            ))}
          </Styled.TimeStamps>
          <Styled.TransportRow>
            <Styled.TransportButton
              type="button"
              onClick={play ? pausePlayback : startPlayback}
              aria-label={play ? "Pause clip" : "Play clip"}
            >
              {play ? (
                <Styled.PauseIcon color="#fff" aria-hidden="true" />
              ) : (
                <Styled.PlayIcon color="#fff" aria-hidden="true" />
              )}
            </Styled.TransportButton>
            <Styled.VolumeSlot>
              <VolumeControl />
            </Styled.VolumeSlot>
          </Styled.TransportRow>
          <Styled.Hint>
            Press <kbd>Space</kbd> to play or pause
          </Styled.Hint>
        </>
      )}

      {status === "loading" && (
        <Styled.LoadingState>
          <Styled.LoadingBar />
          <Styled.LoadingLabel>Loading player…</Styled.LoadingLabel>
        </Styled.LoadingState>
      )}

      {hasFailed && (
        <Styled.ErrorState role="alert">
          <Styled.ErrorTitle>
            {status === "blocked"
              ? "This track won’t play"
              : "The player didn’t load"}
          </Styled.ErrorTitle>
          <Styled.ErrorText>
            {status === "blocked"
              ? "The audio file is missing, or this browser can’t play it."
              : "It’s taking longer than it should. A slow connection or a blocker may be getting in the way."}
          </Styled.ErrorText>
          <Styled.ErrorActions>
            <Button stroke variant="background100" onClick={retry}>
              Try again
            </Button>
            {onSkipTrack && (
              <Button stroke variant="green" onClick={onSkipTrack}>
                Skip this track
              </Button>
            )}
          </Styled.ErrorActions>
          {!onSkipTrack && (
            <Styled.ErrorNote>
              Today’s puzzle is the same for everyone, so it can’t be swapped —
              but you can still guess or skip below.
            </Styled.ErrorNote>
          )}
        </Styled.ErrorState>
      )}
    </>
  );
}
