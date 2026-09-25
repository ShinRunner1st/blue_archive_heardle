import { songs } from "../constants";
import { Song } from "../types/song";

const MAX_RESULTS = 6;

function byThemeNo(a: Song, b: Song): number {
  return a.themeNo.localeCompare(b.themeNo, "en", { numeric: true });
}

/**
 * Every song matching the term, in theme order. Matches against
 * "artist - name" and the theme number, so a player can look a song up by
 * name, artist or OST number. A blank term matches everything. `artist`, when
 * given, narrows the result to that artist's songs.
 */
export function filterSongs(searchTerm: string, artist?: string): Song[] {
  const term = searchTerm.trim().toLowerCase();

  return songs
    .filter((song: Song) => {
      if (artist && song.artist !== artist) return false;
      if (!term) return true;
      const fullName = `${song.artist} - ${song.name}`.toLowerCase();
      return fullName.includes(term) || song.themeNo.includes(term);
    })
    .sort(byThemeNo);
}

/**
 * The search box's suggestions: the first few matches. Returns nothing for a
 * blank term rather than the first six songs in the list.
 */
export function searchSong(searchTerm: string): Song[] {
  if (!searchTerm.trim()) return [];

  return filterSongs(searchTerm).slice(0, MAX_RESULTS);
}

export interface ArtistCount {
  artist: string;
  count: number;
}

/** Artists the song list credits as unknown; they always go last. */
const UNKNOWN_ARTIST = "Unknown";

/**
 * Every artist with how many songs they have, for the song list's artist
 * filter: the biggest catalogues first, since that is where most answers are,
 * and "Unknown" last.
 */
export const artists: ArtistCount[] = [
  ...songs.reduce<Map<string, number>>(
    (sizes, song) => sizes.set(song.artist, (sizes.get(song.artist) ?? 0) + 1),
    new Map()
  ),
]
  .map(([artist, count]) => ({ artist, count }))
  .sort((a, b) => {
    if (a.artist === UNKNOWN_ARTIST) return 1;
    if (b.artist === UNKNOWN_ARTIST) return -1;
    return b.count - a.count || a.artist.localeCompare(b.artist);
  });
