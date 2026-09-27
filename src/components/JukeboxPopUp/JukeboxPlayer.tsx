import React from "react";

import { clipInfo, getSongUrl } from "../../helpers/audioUrl";
import { useAudioSource } from "../../hooks/useAudioSource";
import { useAudioVolume } from "../../hooks/useVolume";
import { Song } from "../../types/song";

import { VolumeControl } from "../VolumeControl";

import * as Styled from "./index.styled";

interface Props {
  /** The song picked, or none yet. */
  song?: Song;
  /** The songs either side of it in the list shown, if any. */
  onPrevious?: () => void;
  onNext?: () => void;
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const whole = Math.floor(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

/**
 * The Jukebox's player. It keeps one audio element and one layout for every
 * song, and knows each song's length before it downloads, so picking another
 * song changes the words and nothing else: the list under it never moves.
 * When a song ends the next one in the list plays.
 */
export function JukeboxPlayer({ song, onPrevious, onNext }: Props) {
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = React.useState(false);
  const [ready, setReady] = React.useState(false);
  const [time, setTime] = React.useState(0);

  const themeNo = song?.themeNo;
  const duration = themeNo ? clipInfo(themeNo).duration : 0;
  const source = useAudioSource(themeNo ? getSongUrl(themeNo) : null);

  // A new song starts from nothing. Done while rendering, so no frame shows
  // the last song's time against the new one's name.
  const [shown, setShown] = React.useState(themeNo);
  if (shown !== themeNo) {
    setShown(themeNo);
    setReady(false);
    setPlaying(false);
    setTime(0);
  }

  useAudioVolume(audioRef);

  const handleReady = React.useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    setReady(true);
    // Picked a moment ago, so this plays; a browser that blocks it leaves the
    // play button to press.
    Promise.resolve(audio.play()).catch(() => undefined);
  }, []);

  const toggle = React.useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !ready) return;
    if (audio.paused) Promise.resolve(audio.play()).catch(() => undefined);
    else audio.pause();
  }, [ready]);

  const seek = (event: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    const seconds = Number(event.target.value);
    if (audio && ready) audio.currentTime = seconds;
    setTime(seconds);
  };

  const percent =
    duration > 0 ? `${Math.min(time / duration, 1) * 100}%` : "0%";

  return (
    <Styled.Player aria-label="Jukebox player">
      {/* No captions: the tracks are instrumental. */}
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio
        ref={audioRef}
        src={source.src}
        preload="auto"
        onLoadedMetadata={handleReady}
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          onNext?.();
        }}
      />

      <Styled.PlayerHead>
        <Styled.Art aria-hidden="true">
          <Styled.NoteIcon />
        </Styled.Art>
        <Styled.PlayerMeta>
          <Styled.PlayerName title={song?.name}>
            {song ? song.name : "Pick a song to play it"}
          </Styled.PlayerName>
          <Styled.PlayerArtist>
            {source.failed
              ? "This track won’t play here."
              : song
              ? `${song.artist} · Theme ${song.themeNo}`
              : "Every song in the game, in full"}
          </Styled.PlayerArtist>
        </Styled.PlayerMeta>
      </Styled.PlayerHead>

      <Styled.PlayerTimeline>
        <Styled.Seek
          type="range"
          min={0}
          max={duration || 1}
          step={0.1}
          value={Math.min(time, duration)}
          onChange={seek}
          disabled={!ready}
          aria-label="Seek"
          aria-valuetext={`${formatTime(time)} of ${formatTime(duration)}`}
        />
        <Styled.Track>
          <Styled.Fill style={{ width: percent }} />
          {song && <Styled.Thumb style={{ left: percent }} />}
        </Styled.Track>
        <Styled.Times>
          <span>{formatTime(time)}</span>
          <span>{song ? formatTime(duration) : "-:--"}</span>
        </Styled.Times>
      </Styled.PlayerTimeline>

      <Styled.PlayerControls>
        <Styled.Skip
          type="button"
          onClick={onPrevious}
          disabled={!onPrevious}
          aria-label="Previous song"
        >
          <Styled.PreviousIcon aria-hidden="true" />
        </Styled.Skip>
        <Styled.Transport
          type="button"
          onClick={toggle}
          disabled={!ready}
          aria-label={playing ? "Pause" : "Play"}
        >
          {playing ? (
            <Styled.PauseIcon aria-hidden="true" />
          ) : (
            <Styled.PlayIcon aria-hidden="true" />
          )}
        </Styled.Transport>
        <Styled.Skip
          type="button"
          onClick={onNext}
          disabled={!onNext}
          aria-label="Next song"
        >
          <Styled.NextIcon aria-hidden="true" />
        </Styled.Skip>
        <Styled.PlayerVolume>
          <VolumeControl />
        </Styled.PlayerVolume>
      </Styled.PlayerControls>
    </Styled.Player>
  );
}
