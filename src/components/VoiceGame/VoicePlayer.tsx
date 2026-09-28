import React from "react";

import { hideTrackFromMediaSession } from "../../helpers/mediaSession";
import { useAudioSource } from "../../hooks/useAudioSource";
import { useAudioVolume } from "../../hooks/useVolume";

import { Button } from "../Button";
import { PlayerStatus } from "../Player";
import * as PlayerStyled from "../Player/index.styled";
import { isTextField } from "../Search";
import { VolumeControl } from "../VolumeControl";

import * as Styled from "./index.styled";

interface Props {
  /** The line's file on the Worker. */
  url: string;
  /** False while a dialog is open, so Space stays inert. */
  keyboardEnabled: boolean;
  /**
   * Deals a different line when this one won't play. Not in Daily, whose
   * line is the same for everyone.
   */
  onSkipTrack?: () => void;
  /** Plays as soon as the line has loaded, as time attack does. */
  autoPlay?: boolean;
  /**
   * Keeps the controls on screen, play greyed out, while the next line
   * loads, rather than flashing the loading bar between lines.
   */
  steady?: boolean;
  onStatusChange?: (status: PlayerStatus) => void;
  /** The keyboard hint under the controls. */
  hint?: React.ReactNode;
  /** Smaller, for the result screen. */
  compact?: boolean;
}

const POLL_INTERVAL_MS = 100;

/** As the OST player's: long enough for a slow connection, no longer. */
const READY_TIMEOUT_MS = 12_000;

/**
 * Plays a voice line, whole: a line is a few seconds, and a title call one,
 * so there is nothing to cut. Replays as often as the player likes.
 */
export function VoicePlayer({
  url,
  keyboardEnabled,
  onSkipTrack,
  autoPlay = false,
  steady = false,
  onStatusChange,
  hint,
  compact = false,
}: Props) {
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const [play, setPlay] = React.useState(false);
  const [currentTime, setCurrentTime] = React.useState(0);
  const [duration, setDuration] = React.useState(0);
  const [status, setStatus] = React.useState<PlayerStatus>("loading");
  const [attempt, setAttempt] = React.useState(0);

  const isReady = status === "ready";
  const hasFailed = status === "blocked" || status === "timedout";

  // A new line, or a retry, starts the wait over. During render, as in the
  // OST's player, so a cached file's metadata can't arrive first and be lost.
  const session = `${url}:${attempt}`;
  const sessionRef = React.useRef(session);
  if (sessionRef.current !== session) {
    sessionRef.current = session;
    setStatus("loading");
    setPlay(false);
    setCurrentTime(0);
  }

  React.useEffect(() => {
    if (status !== "loading") return;
    const timer = window.setTimeout(
      () => setStatus("timedout"),
      READY_TIMEOUT_MS
    );
    return () => window.clearTimeout(timer);
  }, [status, session]);

  React.useEffect(() => {
    if (!play) return;
    const interval = window.setInterval(() => {
      const audio = audioRef.current;
      if (audio) setCurrentTime(audio.currentTime);
    }, POLL_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [play]);

  const stop = React.useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    setCurrentTime(0);
    setPlay(false);
  }, []);

  const start = React.useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    hideTrackFromMediaSession();
    setPlay(true);
    Promise.resolve(audio.play()).catch(() => setPlay(false));
  }, []);

  // Space plays or stops, unless a name is being typed: names have spaces.
  React.useEffect(() => {
    if (!keyboardEnabled || !isReady) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code !== "Space" || e.repeat) return;
      if (isTextField(e.target) && (e.target as HTMLInputElement).value) {
        return;
      }
      e.preventDefault();
      if (play) stop();
      else start();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [keyboardEnabled, isReady, play, start, stop]);

  const handleReady = React.useCallback(
    (event: React.SyntheticEvent<HTMLAudioElement>) => {
      const audio = event.currentTarget;
      audio.currentTime = 0;
      setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
      setStatus("ready");
      if (autoPlay) start();
    },
    [autoPlay, start]
  );

  React.useEffect(() => {
    onStatusChange?.(status);
  }, [status, onStatusChange]);

  const handleError = React.useCallback(() => {
    setStatus("blocked");
    setPlay(false);
  }, []);

  const source = useAudioSource(url, attempt);
  React.useEffect(() => {
    if (source.failed) handleError();
  }, [source.failed, handleError]);

  useAudioVolume(audioRef, attempt);

  const retry = React.useCallback(() => setAttempt((n) => n + 1), []);

  return (
    <Styled.PlayerBox $compact={compact}>
      {/* A voice line to name: a caption would be the answer. */}
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio
        key={attempt}
        ref={audioRef}
        src={source.src}
        preload="auto"
        onLoadedMetadata={handleReady}
        onError={handleError}
        onPlay={() => setPlay(true)}
        onPause={() => setPlay(false)}
        onEnded={stop}
      />

      {(isReady || (steady && status === "loading")) && (
        <>
          <PlayerStyled.ProgressBackground aria-hidden="true">
            <PlayerStyled.Progress $value={currentTime} $max={duration} />
          </PlayerStyled.ProgressBackground>
          <PlayerStyled.TransportRow>
            <PlayerStyled.TransportButton
              type="button"
              onClick={play ? stop : start}
              disabled={!isReady}
              aria-label={play ? "Stop the line" : "Play the line"}
            >
              {play ? (
                <PlayerStyled.PauseIcon color="#fff" aria-hidden="true" />
              ) : (
                <PlayerStyled.PlayIcon color="#fff" aria-hidden="true" />
              )}
            </PlayerStyled.TransportButton>
            <PlayerStyled.VolumeSlot>
              <VolumeControl />
            </PlayerStyled.VolumeSlot>
          </PlayerStyled.TransportRow>
          {hint && <PlayerStyled.Hint>{hint}</PlayerStyled.Hint>}
        </>
      )}

      {status === "loading" && !steady && (
        <PlayerStyled.LoadingState>
          <PlayerStyled.LoadingBar />
          <PlayerStyled.LoadingLabel>
            Loading the line…
          </PlayerStyled.LoadingLabel>
        </PlayerStyled.LoadingState>
      )}

      {hasFailed && (
        <PlayerStyled.ErrorState role="alert">
          <PlayerStyled.ErrorTitle>
            {status === "blocked"
              ? "This line won’t play"
              : "The line didn’t load"}
          </PlayerStyled.ErrorTitle>
          <PlayerStyled.ErrorText>
            {status === "blocked"
              ? "The audio file is missing, or this browser can’t play it."
              : "It’s taking longer than it should. A slow connection or a blocker may be getting in the way."}
          </PlayerStyled.ErrorText>
          <PlayerStyled.ErrorActions>
            <Button stroke variant="background100" onClick={retry}>
              Try again
            </Button>
            {onSkipTrack && (
              <Button stroke variant="green" onClick={onSkipTrack}>
                Another line
              </Button>
            )}
          </PlayerStyled.ErrorActions>
        </PlayerStyled.ErrorState>
      )}
    </Styled.PlayerBox>
  );
}
