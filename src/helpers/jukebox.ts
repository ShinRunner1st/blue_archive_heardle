import { songs } from "../constants";
import { VOLUMES } from "../constants/volumes";
import { Song } from "../types/song";

/** One album in the Jukebox, or the songs on none of them. */
export interface Shelf {
  id: string;
  /** "Vol.1" to "Vol.8", or "Other". */
  label: string;
  /** The album's subtitle; none for Other. */
  title?: string;
  songs: Song[];
}

const byTheme = new Map(songs.map((song) => [song.themeNo, song]));

/**
 * Every song in the game, by OST album in the albums' order, then an Other
 * shelf for the songs on none of Vol.1-8 in theme order. A song on two albums
 * (Water Drop) is on both shelves.
 */
export function jukeboxShelves(): Shelf[] {
  const onAlbum = new Set(VOLUMES.flatMap((volume) => volume.songs));

  const albums = VOLUMES.map((volume) => ({
    id: `vol${volume.number}`,
    label: `Vol.${volume.number}`,
    title: volume.title,
    songs: volume.songs
      .map((theme) => byTheme.get(theme))
      .filter((song): song is Song => song !== undefined),
  }));

  const other = {
    id: "other",
    label: "Other",
    songs: songs.filter((song) => !onAlbum.has(song.themeNo)),
  };

  return other.songs.length > 0 ? [...albums, other] : albums;
}
