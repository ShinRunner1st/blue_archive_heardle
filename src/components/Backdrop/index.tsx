import React from "react";
import { useTheme } from "styled-components";

import { StreakPlace } from "../../constants/streakPlaces";
import { backdropSrc } from "../../helpers/backdrop";
import { homePicture } from "../../helpers/season";
import { useColorScheme } from "../../hooks/useColorScheme";
import { useSeason } from "../../hooks/useSeason";

import * as Styled from "./index.styled";

/** Long enough for a new place to finish fading in over the old one. */
const FADE_MS = 900;

interface Props {
  /** Where the win streak has reached; null for the scheme's own picture. */
  place: StreakPlace | null;
}

/**
 * The picture behind the page: the colour scheme's own, or the season's around
 * Christmas and New Year, or the place the win streak has reached, by day or
 * by night to match the scheme. A new place or season fades in over the old;
 * a change of scheme swaps at once, since the scheme's own reveal animates it.
 */
export function Backdrop({ place }: Props) {
  const theme = useTheme();
  const scheme = useColorScheme();
  const season = useSeason();
  const home = homePicture(season, scheme, theme.backgroundImage);
  const src = backdropSrc(place, scheme, home);
  const where = place?.name ?? season?.id ?? "";

  // The previous place stays under the new one until it has faded in.
  const [layers, setLayers] = React.useState([
    { src, place: where, fade: false, id: 0 },
  ]);
  const top = layers[layers.length - 1];
  if (top.src !== src) {
    const moved = top.place !== where;
    const next = { src, place: where, fade: moved, id: top.id + 1 };
    setLayers(moved ? [top, next] : [next]);
  }

  React.useEffect(() => {
    if (layers.length < 2) return;
    const timer = window.setTimeout(
      () => setLayers((current) => current.slice(-1)),
      FADE_MS
    );
    return () => window.clearTimeout(timer);
  }, [layers]);

  // Fetch the other scheme's picture of this place or season too, so a
  // switch of scheme never uncovers a blank.
  const other = scheme === "dark" ? "light" : "dark";
  const otherSrc = place
    ? backdropSrc(place, other, "")
    : season && homePicture(season, other, "");
  React.useEffect(() => {
    if (otherSrc) new Image().src = otherSrc;
  }, [otherSrc]);

  return (
    <>
      {layers.map((layer) => (
        <Styled.Layer
          key={layer.id}
          $src={layer.src}
          $fade={layer.fade}
          aria-hidden="true"
        />
      ))}
    </>
  );
}
