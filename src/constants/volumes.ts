import badgeData from "../content/badges.json";

/** One of the game's official soundtrack albums, as a badge to earn. */
export interface Volume {
  number: number;
  /** The album's subtitle. */
  title: string;
  cover: string;
  /** Theme numbers of its songs that are in the game. */
  songs: string[];
}

/**
 * The album covers in src/image/badges/, by file name: a new album's cover
 * goes there, named as its entry in badges.json says.
 */
const COVERS = import.meta.glob<string>("../image/badges/*.webp", {
  eager: true,
  import: "default",
});

/**
 * Blue Archive Original Soundtrack albums, from src/content/badges.json, each
 * a badge: add a new album there (its songs are theme numbers, as in its
 * published tracklist) with its cover in src/image/badges/. A song can be on
 * two albums (Water Drop, 39, is on Vol.1 and Vol.2); a track not in the
 * game is left out, as it can't be asked for or counted.
 */
export const VOLUMES: Volume[] = badgeData.map(
  ({ number, title, cover, songs }) => ({
    number,
    title,
    cover: COVERS[`../image/badges/${cover}`],
    songs: songs.split(" "),
  })
);
