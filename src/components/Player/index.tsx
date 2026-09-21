import React from "react";
import YouTube from "react-youtube";

import { playTimes } from "../../constants";
import { markUnplayable } from "../../helpers/unplayable";
import {
  YouTubeErrorEvent,
  YouTubePlayerApi,
  YouTubeReadyEvent,
} from "../../types/youtube";

import { Button } from "../Button";

import * as Styled from "./index.styled";

interface Props {
  id: string;
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
 * How long to wait for onReady before assuming the player is never coming. Long
 * enough not to fire on a slow connection, short enough that nobody sits in
 * front of a silent progress bar wondering whether to reload.
 */
const READY_TIMEOUT_MS = 12_000;

type Status = "loading" | "ready" | "blocked" | "timedout";

export function Player({
  id,
  currentTry,
  setStartTime,
  startTime,
  inputRef,
  keyboardEnabled,
  onSkipTrack,
}: Props) {
  const playerRef = React.useRef<YouTubePlayerApi | null>(null);

  const [play, setPlay] = React.useState<boolean>(false);
  const [currentTime, setCurrentTime] = React.useState<number>(0);
  const [status, setStatus] = React.useState<Status>("loading");
  // Bumped to remount the iframe, which is the only way to retry a failed load.
  const [attempt, setAttempt] = React.useState(0);

  const isReady = status === "ready";
  const hasFailed = status === "blocked" || status === "timedout";

  const currentPlayTime =
    playTimes[currentTry] ?? playTimes[playTimes.length - 1];

  /**
   * A new song, or a retry, starts the wait over. This runs during render
   * rather than in an effect on purpose: child effects fire before the
   * parent's, so resetting from an effect would clobber the onReady that the
   * freshly mounted player has already reported and strand it on "loading".
   */
  const session = `${id}:${attempt}`;
  const sessionRef = React.useRef(session);

  if (sessionRef.current !== session) {
    sessionRef.current = session;
    setStatus("loading");
    setPlay(false);
    playerRef.current = null;
  }

  /**
   * Without this the controls never appear: they are gated on onReady, and a
   * video that never loads leaves the player staring at "Loading player..."
   * with no explanation and no way forward.
   */
  React.useEffect(() => {
    if (status !== "loading") return;

    const timer = window.setTimeout(
      () => setStatus("timedout"),
      READY_TIMEOUT_MS
    );

    return () => window.clearTimeout(timer);
  }, [status, id, attempt]);

  // Only poll while a clip is playing, and always clear the timer - this
  // component unmounts every time the round ends.
  React.useEffect(() => {
    if (!play) return;

    const interval = window.setInterval(() => {
      const player = playerRef.current;
      if (!player) return;

      try {
        setCurrentTime(player.getCurrentTime());
      } catch {
        // The iframe can go away mid-poll; the next tick recovers.
      }
    }, POLL_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [play]);

  const clipStart = startTime ?? 0;

  const pausePlayback = React.useCallback(() => {
    playerRef.current?.pauseVideo();
    playerRef.current?.seekTo(clipStart, true);
    setCurrentTime(clipStart);
    setPlay(false);
  }, [clipStart]);

  const startPlayback = React.useCallback(() => {
    playerRef.current?.playVideo();
    setPlay(true);
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
    (event: YouTubeReadyEvent) => {
      const player = event.target;
      playerRef.current = player;

      // Resume the clip window stored for this round, or roll a new one far
      // enough from the end that the longest clip still fits.
      let rolled = startTime;

      try {
        // The player iframe is visually hidden but still focusable, so take it
        // out of the tab order.
        player.getIframe()?.setAttribute("tabindex", "-1");

        if (rolled === null) {
          const duration = player.getDuration();
          const latestStart = Number.isFinite(duration)
            ? Math.max(duration - LONGEST_CLIP_SECONDS, 0)
            : 0;

          rolled = Math.floor(Math.random() * latestStart);
          setStartTime(rolled);
        }

        player.seekTo(rolled, true);
        player.pauseVideo();
        player.setVolume(20);
      } catch {
        // Fall through: better to show the controls than to strand the player
        // on "Loading..." forever.
      }

      setCurrentTime(rolled ?? 0);
      setStatus("ready");
    },
    [startTime, setStartTime]
  );

  const handleError = React.useCallback(
    (event: YouTubeErrorEvent) => {
      // Unlike a timeout, this is YouTube saying the video itself is the
      // problem, so remember it and keep it out of the rest of the session.
      markUnplayable(id);
      setStatus("blocked");
      setPlay(false);

      if (import.meta.env.DEV) {
        // Names the offending video while developing, so a dead id in the song
        // list can be tracked down without guessing.
        // eslint-disable-next-line no-console
        console.warn(`YouTube refused ${id} (error ${event.data})`);
      }
    },
    [id]
  );

  const retry = React.useCallback(() => setAttempt((n) => n + 1), []);

  return (
    <>
      <Styled.StyledYouTube aria-hidden="true">
        <YouTube
          key={attempt}
          opts={{
            width: "1",
            height: "1",
            playerVars: {
              controls: 0,
              modestbranding: 1,
              rel: 0,
            },
          }}
          videoId={id}
          onReady={handleReady}
          onError={handleError}
        />
      </Styled.StyledYouTube>

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
              ? "YouTube won’t play it here — it may have been removed, made private, or blocked in your region."
              : "It’s taking longer than it should. A slow connection or a blocker may be getting in the way."}
          </Styled.ErrorText>
          <Styled.ErrorActions>
            <Button variant="background100" onClick={retry}>
              Try again
            </Button>
            {onSkipTrack && (
              <Button variant="green" onClick={onSkipTrack}>
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
