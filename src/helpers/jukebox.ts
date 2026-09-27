import { VOLUMES } from "../constants/volumes";
import { Song } from "../types/song";
import { filterSongs } from "./searchSong";

/** A chip in the Jukebox: one OST album, or "Other" for songs on none. */
export interface AlbumFilter {
  id: string;
  label: string;
  /** Theme numbers on it; null for "Other", the songs on no album. */
  songs: Set<string> | null;
}

const onAnAlbum = new Set(VOLUMES.flatMap((volume) => volume.songs));

export const ALBUM_FILTERS: AlbumFilter[] = [
  ...VOLUMES.map((volume) => ({
    id: `vol${volume.number}`,
    label: `Vol.${volume.number}`,
    songs: new Set(volume.songs),
  })),
  { id: "other", label: "Other", songs: null },
];

function isOn(filter: AlbumFilter, song: Song): boolean {
  return filter.songs === null
    ? !onAnAlbum.has(song.themeNo)
    : filter.songs.has(song.themeNo);
}

/**
 * The Jukebox's list: every song in theme order, narrowed by a search term
 * (name, artist or theme number, as in All OST) and by any number of albums.
 * No albums picked means every song.
 */
export function jukeboxSongs(
  term: string,
  albumIds: readonly string[]
): Song[] {
  const picked = ALBUM_FILTERS.filter((filter) => albumIds.includes(filter.id));
  const matches = filterSongs(term);
  if (picked.length === 0) return matches;
  return matches.filter((song) => picked.some((filter) => isOn(filter, song)));
}

/** How many songs each album filter holds, for its chip. */
export function albumCount(filter: AlbumFilter): number {
  return jukeboxSongs("", [filter.id]).length;
}
