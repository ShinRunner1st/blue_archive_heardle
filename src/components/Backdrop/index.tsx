import React from "react";
import { useTheme } from "styled-components";

import { PAGE_PICTURES } from "../../constants/pagePictures";
import { StreakPlace } from "../../constants/streakPlaces";
import { backdropSrc } from "../../helpers/backdrop";
import { homePicture, pictureUrl } from "../../helpers/season";
import { useColorScheme } from "../../hooks/useColorScheme";
import { useSeason } from "../../hooks/useSeason";

import * as Styled from "./index.styled";

/** Long enough for a new place to finish fading in over the old one. */
const FADE_MS = 900;

/** A page's own picture, by day and by night: keys in pictureFiles. */
export interface Scene {
  id: string;
  day: string;
  night: string;
}

/**
 * Multiplayer's: the Game Development Department's room, as the rooms have
 * no streak of their own to move the background (page-pictures.json's
 * `rooms`, made with scripts/make-backdrop.mjs).
 */
export const ROOMS_SCENE: Scene = { id: "rooms", ...PAGE_PICTURES.rooms };

interface Props {
  /** Where the win streak has reached; null for the scheme's own picture. */
  place: StreakPlace | null;
  /** The page's own picture, in place of both the place and the season's. */
  scene?: Scene;
}

/**
 * The picture behind the page: the colour scheme's own, or the season's around
 * Christmas and New Year, or the place the win streak has reached, by day or
 * by night to match the scheme. A new place or season fades in over the old;
 * a change of scheme swaps at once, since the scheme's own reveal animates it.
 * A page with a scene of its own shows that instead, whatever the date.
 */
export function Backdrop({ place, scene }: Props) {
  const theme = useTheme();
  const scheme = useColorScheme();
  const season = useSeason();
  const home = homePicture(season, scheme, theme.backgroundImage);
  const src = scene
    ? pictureUrl(scheme === "dark" ? scene.night : scene.day)
    : backdropSrc(place, scheme, home);
  const where = scene?.id ?? place?.name ?? season?.id ?? "";

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
  const otherSrc = scene
    ? pictureUrl(other === "dark" ? scene.night : scene.day)
    : place
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
