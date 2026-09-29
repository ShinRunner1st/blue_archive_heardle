/**
 * The soundtrack as the Blue Archive wiki lists it on its Music page: JP's
 * tracklist, which the song list follows, and whose files are the originals
 * in audio/ byte for byte. Read by scripts/build-new-songs.mjs and the weekly
 * Action's check (scripts/find-updates.mjs).
 */
const WIKI_API = "https://bluearchive.wiki/w/api.php";
const HEADERS = { "User-Agent": "baheardle.com build script" };

/** The special tracks (10000 and up) are left out, as they always were. */
const MAX_THEME = 9999;

async function api(params) {
  const url = new URL(WIKI_API);
  url.search = new URLSearchParams({ format: "json", ...params });
  const response = await fetch(url, { headers: HEADERS });
  if (!response.ok) throw new Error(`The wiki answered ${response.status}`);
  return response.json();
}

/** Wiki markup down to plain text: "[[Clear Morning]]" is "Clear Morning". */
export function plainText(text) {
  return text
    .replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, "$1")
    .replace(/'{2,}/g, "")
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * The in-game tracks, by theme number: title and artist (either can be empty
 * while the wiki doesn't know yet) and the file's name there. Stops if the
 * page no longer has the tracks it had, so a changed page can't empty the
 * list.
 */
export async function wikiTracks() {
  const data = await api({ action: "parse", page: "Music", prop: "wikitext" });
  const text = data?.parse?.wikitext?.["*"];
  if (typeof text !== "string") throw new Error("No Music page on the wiki");

  const tracks = [];
  for (const [, body] of text.matchAll(/\{\{Track([^}]*)\}\}/g)) {
    const fields = {};
    for (const part of body.split("|").slice(1)) {
      const at = part.indexOf("=");
      if (at > 0) fields[part.slice(0, at).trim()] = part.slice(at + 1).trim();
    }
    const id = Number(fields.Id);
    if (!Number.isInteger(id) || id < 1 || id > MAX_THEME) continue;
    tracks.push({
      themeNo: String(id),
      title: plainText(fields.Title ?? ""),
      artist: plainText(fields.Artist ?? ""),
      file: (fields.File ?? "").trim(),
    });
  }
  if (tracks.length < 300) {
    throw new Error(`The Music page lists only ${tracks.length} tracks`);
  }
  return tracks;
}

/** Where each file is on the wiki and its SHA-1, fifty at a time. */
export async function wikiFiles(names) {
  const found = new Map();
  for (let i = 0; i < names.length; i += 50) {
    const batch = names.slice(i, i + 50);
    const data = await api({
      action: "query",
      prop: "imageinfo",
      iiprop: "url|sha1",
      titles: batch.map((name) => `File:${name}`).join("|"),
    });
    // The API gives names with spaces; the page writes them with underscores.
    const byTitle = new Map(
      batch.map((name) => [`File:${name.replace(/_/g, " ")}`, name])
    );
    for (const page of Object.values(data?.query?.pages ?? {})) {
      const info = page.imageinfo?.[0];
      const name = byTitle.get(page.title);
      if (info?.url && info?.sha1 && name) {
        found.set(name, { url: info.url, sha1: info.sha1 });
      }
    }
  }
  return found;
}

/** A song still waiting for the wiki to name it, or its composer. */
export const isPlaceholderName = (song) =>
  song.name === `Theme ${song.themeNo}`;
export const isPlaceholderArtist = (song) => song.artist === "Unknown";

/** The same words, whatever the case, spacing, quotes or punctuation. */
const sameWords = (a, b) => {
  const plain = (text) =>
    text
      .normalize("NFKC")
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, "");
  return plain(a) === plain(b);
};

/**
 * What the game and the wiki have that the song list doesn't: tracks to add,
 * and titles and artists for songs still half named, "Theme N" or by
 * "Unknown".
 *
 * A new track is any theme the game's files (`game`, from gameTracks: BA-AD's
 * download) or the wiki's Music page has and the list doesn't. Its file comes
 * from the game when it has it (`path`, and `variant` when it's only a
 * `_Title` or `_Short` one), else from the wiki (`url` and `sha1`); its name
 * from the wiki, or "Theme N" by "Unknown" until the wiki has one.
 *
 * While either half of a song is still blank, the song follows the wiki for
 * both: when the wiki fills the blank, a change it made to the other half
 * comes along. Once both are filled, the song is the list's own, and the
 * wiki's spelling (its typos and Japanese titles among them) never replaces
 * it. A difference only of case or punctuation isn't a change.
 */
export async function trackChanges(songs, game = new Map()) {
  const tracks = await wikiTracks();
  const have = new Map(songs.map((song) => [song.themeNo, song]));
  const onWiki = new Map(tracks.map((track) => [track.themeNo, track]));

  const fromGame = [...game]
    .filter(([themeNo]) => !have.has(themeNo))
    .map(([themeNo, file]) => ({
      themeNo,
      title: onWiki.get(themeNo)?.title ?? "",
      artist: onWiki.get(themeNo)?.artist ?? "",
      path: file.path,
      variant: file.variant,
    }));

  const candidates = tracks.filter(
    (track) =>
      !have.has(track.themeNo) && !game.has(track.themeNo) && track.file
  );
  const files = await wikiFiles(candidates.map(({ file }) => file));
  const fromWiki = candidates.flatMap((track) => {
    const file = files.get(track.file);
    return file ? [{ ...track, ...file }] : [];
  });
  const added = [...fromGame, ...fromWiki];

  const named = tracks.flatMap((track) => {
    const song = have.get(track.themeNo);
    if (!song) return [];
    if (!isPlaceholderName(song) && !isPlaceholderArtist(song)) return [];
    const name =
      track.title && !sameWords(track.title, song.name) ? track.title : null;
    const artist =
      track.artist && !sameWords(track.artist, song.artist)
        ? track.artist
        : null;
    return name || artist ? [{ song, name, artist }] : [];
  });

  return { added, named };
}
