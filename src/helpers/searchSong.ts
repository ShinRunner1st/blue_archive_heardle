import { songs } from "../constants";
import { Song } from "../types/song";

const MAX_RESULTS = 6;

/**
 * Matches against "artist - name" and the theme number, so a player can search
 * by song name, artist or OST number. Returns nothing for a blank term rather
 * than the first six songs in the list.
 */
export function searchSong(searchTerm: string): Song[] {
  const term = searchTerm.trim().toLowerCase();
  if (!term) return [];

  return songs
    .filter((song: Song) => {
      const fullName = `${song.artist} - ${song.name}`.toLowerCase();
      return fullName.includes(term) || song.themeNo.includes(term);
    })
    .sort((a, b) => a.themeNo.localeCompare(b.themeNo, "en", { numeric: true }))
    .slice(0, MAX_RESULTS);
}
