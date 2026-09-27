import { songs } from "../constants";
import { Song } from "../types/song";

/** How many answers a four-choice round offers. */
export const CHOICE_COUNT = 4;

/** The artist given for tracks with no credited composer. */
const UNCREDITED = "Unknown";

/** How many songs, in theme order, count as "nearby" to the answer. */
const NEARBY_WINDOW = 12;

type Random = () => number;

function shuffle<T>(list: T[], random: Random): T[] {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * The songs within a window of theme numbers around the answer. The window
 * sits at a random place around it, so the answer isn't always the one in the
 * middle of the numbers offered.
 */
function nearby(index: number, random: Random): Song[] {
  const offset = Math.floor(random() * NEARBY_WINDOW);
  const start = Math.min(
    Math.max(index - offset, 0),
    Math.max(songs.length - NEARBY_WINDOW, 0)
  );
  return songs.slice(start, start + NEARBY_WINDOW);
}

/**
 * The four answers for a round, as theme numbers in a random order. Four
 * random songs are too easy to tell apart, so the wrong ones should sound
 * close: one by the same artist when there is one, the rest from nearby theme
 * numbers, which were written around the same time.
 */
export function makeChoices(
  answer: Song,
  random: Random = Math.random
): string[] {
  const index = songs.findIndex((song) => song.themeNo === answer.themeNo);
  const others = (list: Song[]) =>
    list.filter((song) => song.themeNo !== answer.themeNo);

  // Uncredited tracks share no composer, only the label.
  const sameArtist = shuffle(
    others(
      songs.filter(
        (song) => song.artist === answer.artist && answer.artist !== UNCREDITED
      )
    ),
    random
  );
  const close = shuffle(
    others(index >= 0 ? nearby(index, random) : []),
    random
  );
  const anyone = shuffle(others(songs), random);

  const picked: Song[] = [];
  const add = (from: Song[], upTo: number) => {
    for (const song of from) {
      if (picked.length >= upTo) return;
      if (!picked.some((p) => p.themeNo === song.themeNo)) picked.push(song);
    }
  };

  add(sameArtist, 1);
  add(close, CHOICE_COUNT - 1);
  add(sameArtist, CHOICE_COUNT - 1);
  add(anyone, CHOICE_COUNT - 1);

  return shuffle([answer, ...picked], random).map((song) => song.themeNo);
}

const byTheme = new Map(songs.map((song) => [song.themeNo, song]));

/** The songs for a round's saved choices, skipping any no longer in the game. */
export function choiceSongs(choices: string[]): Song[] {
  return choices
    .map((theme) => byTheme.get(theme))
    .filter((song): song is Song => song !== undefined);
}
