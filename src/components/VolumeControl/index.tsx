import React from "react";

import {
  canSetVolume,
  setVolume,
  toggleMute,
  VolumeChannel,
} from "../../helpers/volume";
import { useVolume } from "../../hooks/useVolume";

import * as Styled from "./index.styled";

/**
 * Mute button and slider for the volume every game plays at, or the
 * Jukebox's own. Renders nothing where the browser ignores volume set from
 * script (iOS), since a slider there would move without changing anything.
 */
export function VolumeControl({
  channel = "game",
}: {
  channel?: VolumeChannel;
}) {
  const volume = useVolume(channel);

  if (!canSetVolume()) return null;

  const percent = Math.round(volume * 100);
  const muted = volume === 0;
  const Icon = muted
    ? Styled.MuteIcon
    : volume < 0.5
    ? Styled.LowIcon
    : Styled.HighIcon;

  return (
    <Styled.Wrapper>
      <Styled.MuteButton
        type="button"
        onClick={() => toggleMute(channel)}
        aria-label={muted ? "Unmute" : "Mute"}
      >
        <Icon aria-hidden="true" />
      </Styled.MuteButton>
      <Styled.Slider
        name="volume"
        type="range"
        min={0}
        max={100}
        step={1}
        value={percent}
        onChange={(event) =>
          setVolume(Number(event.target.value) / 100, channel)
        }
        aria-label="Volume"
        aria-valuetext={`${percent}%`}
        style={{ "--fill": `${percent}%` } as React.CSSProperties}
      />
      {/* The slider already announces its value, so this is for the eye. */}
      <Styled.Value aria-hidden="true" $muted={muted}>
        {percent}%
      </Styled.Value>
    </Styled.Wrapper>
  );
}
