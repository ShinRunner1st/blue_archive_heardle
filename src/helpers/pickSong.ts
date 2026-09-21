import { songs } from "../constants";
import { Round } from "../types/stats";
import { Song } from "../types/song";
import { isUnplayable } from "./unplayable";

function randomOf(list: Song[]): Song {
  return list[Math.floor(Math.random() * list.length)];
}

/** Every song except the ones that failed to play earlier in this session. */
function playableSongs(): Song[] {
  const playable = songs.filter((song) => !isUnplayable(song.youtubeId));

  // If somehow everything is blocked, deal from the full list anyway: a silent
  // round is still better than no round at all.
  return playable.length > 0 ? playable : songs;
}

/**
 * Picks the next song using a bag system: songs already played are excluded
 * until every song has been used, so nothing repeats within a run.
 */
export function pickSong(playedRounds: Round[]): Song {
  const played = new Set(playedRounds.map((round) => round.solution.themeNo));
  const pool = playableSongs();
  const unplayed = pool.filter((song) => !played.has(song.themeNo));

  return randomOf(unplayed.length > 0 ? unplayed : pool);
}

/** True once every song in the list has been played and the bag needs refilling. */
export function isBagEmpty(playedRounds: Round[]): boolean {
  const played = new Set(playedRounds.map((round) => round.solution.themeNo));
  return playableSongs().every((song) => played.has(song.themeNo));
}
