import { songs } from "../constants";
import { Song } from "../types/song";

const MAX_RESULTS = 6;

function byThemeNo(a: Song, b: Song): number {
  return a.themeNo.localeCompare(b.themeNo, "en", { numeric: true });
}

/**
 * Every song matching the term, in theme order. Matches against
 * "artist - name" and the theme number, so a player can look a song up by
 * name, artist or OST number. A blank term matches everything.
 */
export function filterSongs(searchTerm: string): Song[] {
  const term = searchTerm.trim().toLowerCase();

  return songs
    .filter((song: Song) => {
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

export interface ArtistGroup {
  artist: string;
  songs: Song[];
}

/** Artists the song list credits as unknown; their group always goes last. */
const UNKNOWN_ARTIST = "Unknown";

/** How many songs each artist has in the whole list. */
const catalogueSize = songs.reduce<Map<string, number>>(
  (sizes, song) => sizes.set(song.artist, (sizes.get(song.artist) ?? 0) + 1),
  new Map()
);

/**
 * Groups songs by artist for browsing: the biggest catalogues first, since
 * that is where most answers are, and "Unknown" last. The order comes from
 * the whole list rather than from `list`, so groups don't reshuffle while a
 * filter is typed. Songs keep the order they were given in.
 */
export function groupByArtist(list: Song[]): ArtistGroup[] {
  const groups = new Map<string, Song[]>();

  for (const song of list) {
    const group = groups.get(song.artist);
    if (group) group.push(song);
    else groups.set(song.artist, [song]);
  }

  return [...groups]
    .map(([artist, songs]) => ({ artist, songs }))
    .sort((a, b) => {
      if (a.artist === UNKNOWN_ARTIST) return 1;
      if (b.artist === UNKNOWN_ARTIST) return -1;
      const bySize =
        (catalogueSize.get(b.artist) ?? 0) - (catalogueSize.get(a.artist) ?? 0);
      return bySize || a.artist.localeCompare(b.artist);
    });
}
