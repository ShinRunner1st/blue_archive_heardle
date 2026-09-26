import React from "react";

import { clipInfo, getSongUrl } from "../../helpers/audioUrl";
import { markUnplayable } from "../../helpers/unplayable";
import { useAudioVolume } from "../../hooks/useVolume";
import { Song } from "../../types/song";

import { VolumeControl } from "../VolumeControl";

import * as Styled from "./index.styled";

interface Props {
  song: Song;
  /** Where the round's clip started in the whole song, in seconds. */
  startTime: number;
  /** How much of the clip the player heard on their last try, in seconds. */
  clipLength: number;
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";

  const whole = Math.floor(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

function percent(part: number, whole: number): string {
  return whole > 0 ? `${Math.min((part / whole) * 100, 100)}%` : "0%";
}

/**
 * The answer on the result screen: what the song was, a player that picks up
 * where the round's clip started, and a marker showing which part was the clip.
 *
 * The whole song is only downloaded once the player presses play: most rounds
 * go straight on to the next one, and the round already fetched its clip.
 */
export function NowPlaying({ song, startTime, clipLength }: Props) {
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  // Set while "Replay my clip" runs, so playback stops where the clip did.
  const stopAtRef = React.useRef<number | null>(null);

  // Where to go once the file has loaded: moving before then is lost.
  const pendingSeekRef = React.useRef<number | null>(startTime);

  const [failed, setFailed] = React.useState(false);
  const [playing, setPlaying] = React.useState(false);
  const [currentTime, setCurrentTime] = React.useState(startTime);
  const [duration, setDuration] = React.useState(
    () => clipInfo(song.themeNo).duration
  );

  useAudioVolume(audioRef, failed);

  const clipEnd =
    duration > 0
      ? Math.min(startTime + clipLength, duration)
      : startTime + clipLength;

  const play = React.useCallback((audio: HTMLAudioElement) => {
    // Rejected when the browser blocks it; the play button is there instead.
    Promise.resolve(audio.play()).catch(() => undefined);
  }, []);

  const moveTo = React.useCallback(
    (audio: HTMLAudioElement, seconds: number) => {
      if (audio.readyState >= HTMLMediaElement.HAVE_METADATA) {
        audio.currentTime = seconds;
      } else {
        pendingSeekRef.current = seconds;
      }
      setCurrentTime(seconds);
    },
    []
  );

  const handleReady = React.useCallback(
    (event: React.SyntheticEvent<HTMLAudioElement>) => {
      const audio = event.currentTarget;
      if (Number.isFinite(audio.duration)) setDuration(audio.duration);

      const pending = pendingSeekRef.current;
      pendingSeekRef.current = null;
      if (pending !== null) audio.currentTime = pending;
    },
    []
  );

  const handleTimeUpdate = React.useCallback(
    (event: React.SyntheticEvent<HTMLAudioElement>) => {
      const audio = event.currentTarget;
      setCurrentTime(audio.currentTime);

      const stopAt = stopAtRef.current;
      if (stopAt !== null && audio.currentTime >= stopAt) {
        stopAtRef.current = null;
        audio.pause();
      }
    },
    []
  );

  const handleError = React.useCallback(() => {
    markUnplayable(song.themeNo);
    setFailed(true);
  }, [song.themeNo]);

  const togglePlay = React.useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    stopAtRef.current = null;
    if (audio.paused) play(audio);
    else audio.pause();
  }, [play]);

  const replayClip = React.useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    stopAtRef.current = clipEnd;
    moveTo(audio, startTime);
    play(audio);
  }, [clipEnd, startTime, play, moveTo]);

  const seek = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const audio = audioRef.current;
      if (!audio) return;

      stopAtRef.current = null;
      moveTo(audio, Number(event.target.value));
    },
    [moveTo]
  );

  return (
    <Styled.Card>
      <Styled.Heading>
        <Styled.Art aria-hidden="true">
          <Styled.NoteIcon />
        </Styled.Art>
        <Styled.Meta>
          <Styled.Name>{song.name}</Styled.Name>
          <Styled.Artist>{song.artist}</Styled.Artist>
        </Styled.Meta>
        {!failed && <VolumeControl />}
      </Styled.Heading>

      {failed ? (
        <Styled.Fallback>This track won’t play here.</Styled.Fallback>
      ) : (
        <>
          {/* No captions: the tracks are instrumental. */}
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <audio
            ref={audioRef}
            src={getSongUrl(song.themeNo)}
            preload="none"
            onLoadedMetadata={handleReady}
            onTimeUpdate={handleTimeUpdate}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onEnded={() => setPlaying(false)}
            onError={handleError}
          />

          <Styled.Controls>
            <Styled.Transport
              type="button"
              onClick={togglePlay}
              aria-label={playing ? "Pause" : "Play"}
            >
              {playing ? (
                <Styled.PauseIcon aria-hidden="true" />
              ) : (
                <Styled.PlayIcon aria-hidden="true" />
              )}
            </Styled.Transport>

            <Styled.Timeline>
              <Styled.Seek
                type="range"
                min={0}
                max={duration}
                step={0.1}
                value={Math.min(currentTime, duration)}
                onChange={seek}
                disabled={duration === 0}
                aria-label="Seek"
                aria-valuetext={`${formatTime(currentTime)} of ${formatTime(
                  duration
                )}`}
              />
              <Styled.Track>
                <Styled.Fill
                  style={{ width: percent(currentTime, duration) }}
                />
                {duration > 0 && (
                  <Styled.ClipBand
                    data-testid="clip-band"
                    style={{
                      left: percent(startTime, duration),
                      width: percent(clipEnd - startTime, duration),
                    }}
                  />
                )}
                {duration > 0 && (
                  <Styled.Thumb
                    style={{ left: percent(currentTime, duration) }}
                  />
                )}
              </Styled.Track>
              <Styled.Times>
                <span>{formatTime(currentTime)}</span>
                <span>{duration > 0 ? formatTime(duration) : "-:--"}</span>
              </Styled.Times>
            </Styled.Timeline>
          </Styled.Controls>

          <Styled.ClipRow>
            <Styled.ClipLabel>
              <Styled.ClipSwatch aria-hidden="true" />
              Your clip: {formatTime(startTime)} – {formatTime(clipEnd)}
            </Styled.ClipLabel>
            <Styled.ReplayButton type="button" onClick={replayClip}>
              <Styled.ReplayIcon aria-hidden="true" />
              Replay my clip
            </Styled.ReplayButton>
          </Styled.ClipRow>
        </>
      )}
    </Styled.Card>
  );
}
