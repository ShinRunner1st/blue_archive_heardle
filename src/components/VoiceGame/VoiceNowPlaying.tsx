import React from "react";

import { isBirthday } from "../../helpers/birthdays";
import { useAudioSource } from "../../hooks/useAudioSource";
import { useAudioVolume } from "../../hooks/useVolume";
import { Student } from "../../types/student";

import * as NowStyled from "../NowPlaying/index.styled";
import { StudentIcon } from "../StudentIcon";
import { VolumeControl } from "../VolumeControl";

import * as Styled from "./index.styled";

interface Props {
  answer: Student;
  /** The line's file on the Worker. */
  url: string;
  /** What the line says: undefined while loading, null if it won't load. */
  text: string | null | undefined;
  /** The player's history with this voice, under the school. */
  record?: string;
  keyboardEnabled: boolean;
  /**
   * Plays as soon as the line has loaded: only right after the guess that
   * ended the round, as the OST's card does.
   */
  autoPlay?: boolean;
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
 * The answer on Voice mode's result screen, in the OST's now-playing card:
 * who was speaking, what they said, and the line to play again and seek in.
 */
export function VoiceNowPlaying({
  answer,
  url,
  text,
  record,
  keyboardEnabled,
  autoPlay = false,
}: Props) {
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const [loaded, setLoaded] = React.useState(false);
  const [failed, setFailed] = React.useState(false);
  const [playing, setPlaying] = React.useState(false);
  const [currentTime, setCurrentTime] = React.useState(0);
  const [duration, setDuration] = React.useState(0);

  useAudioVolume(audioRef, failed);

  const play = React.useCallback((audio: HTMLAudioElement) => {
    // Rejected when the browser blocks it; the play button is there instead.
    Promise.resolve(audio.play()).catch(() => undefined);
  }, []);

  const handleReady = React.useCallback(
    (event: React.SyntheticEvent<HTMLAudioElement>) => {
      const audio = event.currentTarget;
      if (Number.isFinite(audio.duration)) setDuration(audio.duration);
      setLoaded(true);
      if (autoPlay) play(audio);
    },
    [autoPlay, play]
  );

  const source = useAudioSource(url, 0);
  React.useEffect(() => {
    if (source.failed) setFailed(true);
  }, [source.failed]);

  const togglePlay = React.useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) play(audio);
    else audio.pause();
  }, [play]);

  // Space plays or pauses the line, as it did during the round.
  React.useEffect(() => {
    if (!keyboardEnabled || !loaded) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code !== "Space" || e.repeat) return;
      e.preventDefault();
      togglePlay();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [keyboardEnabled, loaded, togglePlay]);

  const seek = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const audio = audioRef.current;
      if (!audio) return;
      audio.currentTime = Number(event.target.value);
      setCurrentTime(audio.currentTime);
    },
    []
  );

  return (
    <NowStyled.Card>
      <Styled.CardHeading>
        <Styled.CardIcon aria-hidden="true">
          <StudentIcon id={answer.id} size={56} />
        </Styled.CardIcon>
        <NowStyled.Meta>
          <NowStyled.Name>
            {answer.name}
            {isBirthday(answer) && " 🎂"}
          </NowStyled.Name>
          <NowStyled.Artist>
            {answer.school} · {answer.club}
          </NowStyled.Artist>
          {record && <NowStyled.Record>{record}</NowStyled.Record>}
        </NowStyled.Meta>
        {!failed && <VolumeControl />}
      </Styled.CardHeading>

      <Styled.CardQuote>
        {text === undefined
          ? "…"
          : text === null
          ? "The line's words didn't load."
          : text === ""
          ? "“Blue Archive!”"
          : `“${text}”`}
        {text === "" && (
          <Styled.QuoteNote>
            The title call, the same for everyone
          </Styled.QuoteNote>
        )}
      </Styled.CardQuote>

      {failed ? (
        <NowStyled.Fallback>This line won’t play here.</NowStyled.Fallback>
      ) : (
        <>
          {/* The words are in the card above. */}
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <audio
            ref={audioRef}
            src={source.src}
            preload="auto"
            onLoadedMetadata={handleReady}
            onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onEnded={() => setPlaying(false)}
            onError={() => setFailed(true)}
          />

          <NowStyled.Controls>
            <NowStyled.Transport
              type="button"
              onClick={togglePlay}
              disabled={!loaded}
              aria-label={playing ? "Pause" : "Play"}
            >
              {playing ? (
                <NowStyled.PauseIcon aria-hidden="true" />
              ) : (
                <NowStyled.PlayIcon aria-hidden="true" />
              )}
            </NowStyled.Transport>

            <NowStyled.Timeline>
              <NowStyled.Seek
                type="range"
                min={0}
                max={duration}
                step={0.05}
                value={Math.min(currentTime, duration)}
                onChange={seek}
                disabled={duration === 0}
                aria-label="Seek"
                aria-valuetext={`${formatTime(currentTime)} of ${formatTime(
                  duration
                )}`}
              />
              <NowStyled.Track>
                <NowStyled.Fill
                  style={{ width: percent(currentTime, duration) }}
                />
                {duration > 0 && (
                  <NowStyled.Thumb
                    style={{ left: percent(currentTime, duration) }}
                  />
                )}
              </NowStyled.Track>
              <NowStyled.Times>
                <span>{formatTime(currentTime)}</span>
                <span>{duration > 0 ? formatTime(duration) : "-:--"}</span>
              </NowStyled.Times>
            </NowStyled.Timeline>
          </NowStyled.Controls>
        </>
      )}
    </NowStyled.Card>
  );
}
