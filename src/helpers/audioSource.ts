/**
 * Loads an audio file whole and hands back a local (blob:) URL to play it from.
 *
 * The audio is served by Cloudflare as static files, which answers every
 * request with the whole file: it doesn't do partial (Range) requests. Safari
 * won't play media from a server like that at all, and other browsers can't
 * seek past what they have downloaded. Played from memory, every browser can
 * play and seek it. The files are small - a clip is about 0.2 MB, a whole song
 * 1 to 3 MB - and downloads from Cloudflare cost nothing.
 *
 * If the Worker fails, the file comes from the copy on R2 instead, so a
 * Worker outage doesn't stop the game.
 *
 * Whole songs, which the Jukebox plays again and again, are also kept in the
 * browser's Cache Storage, and played from there next time: the browser's
 * own cache may let a large file go, and this keeps the ones played last.
 * A file's name changes whenever it does, so a kept copy is never stale.
 */
import { backupUrlFor } from "./audioUrl";

/** Recent files, oldest first. A round needs two: its clip and its song. */
const loaded = new Map<string, Promise<string>>();
const KEEP = 4;

/** Where whole songs are kept. A new name starts the store over. */
export const SONG_CACHE = "baheardle-songs-1";

/** Songs kept, the ones played last: about 60 MB. */
export const KEEP_SONGS = 30;

/**
 * A file to play, from memory, the song store, the Worker or its copy on R2.
 * `keep` puts it in the song store: for whole songs, not clips, which a round
 * plays once.
 */
export function loadAudio(
  url: string,
  { keep = false }: { keep?: boolean } = {}
): Promise<string> {
  const known = loaded.get(url);
  if (known) {
    // Move it to the back, as the most recently used.
    loaded.delete(url);
    loaded.set(url, known);
    return known;
  }

  const loading = (keep ? fromStore(url) : Promise.resolve(null))
    .then(
      (kept) =>
        kept ??
        download(url)
          .catch((error: unknown) => {
            const backup = backupUrlFor(url);
            if (!backup) throw error;
            return download(backup);
          })
          .then((blob) => {
            if (keep) void toStore(url, blob);
            return blob;
          })
    )
    .then((blob) => URL.createObjectURL(blob));

  // A failure isn't kept, so trying again fetches again.
  loading.catch(() => {
    if (loaded.get(url) === loading) loaded.delete(url);
  });
  loaded.set(url, loading);

  // Free the oldest files. By now nothing plays them any more.
  while (loaded.size > KEEP) {
    const [oldest, oldLoading] = loaded.entries().next().value!;
    loaded.delete(oldest);
    oldLoading.then(URL.revokeObjectURL, () => undefined);
  }

  return loading;
}

/** The song store, or null where the browser has none or won't open it. */
async function openStore(): Promise<Cache | null> {
  try {
    return typeof caches === "undefined" ? null : await caches.open(SONG_CACHE);
  } catch {
    return null;
  }
}

/**
 * A kept song, moved to the back as the one played last. Null if it isn't
 * kept, or the store can't be read.
 */
async function fromStore(url: string): Promise<Blob | null> {
  try {
    const store = await openStore();
    const response = await store?.match(url);
    if (!store || !response) return null;
    const blob = await response.blob();
    void toStore(url, blob);
    return blob;
  } catch {
    return null;
  }
}

/**
 * Keeps a song, then lets the ones played longest ago go. The store keeps
 * its entries in the order they went in, and putting one again moves it to
 * the end. A store that is full or blocked just keeps nothing.
 */
async function toStore(url: string, blob: Blob): Promise<void> {
  try {
    const store = await openStore();
    if (!store) return;
    await store.put(
      url,
      new Response(blob, {
        headers: { "Content-Type": blob.type || "audio/ogg" },
      })
    );
    const kept = await store.keys();
    await Promise.all(
      kept
        .slice(0, Math.max(kept.length - KEEP_SONGS, 0))
        .map((request) => store.delete(request))
    );
  } catch {
    // Not kept: it downloads again next time.
  }
}

function download(url: string): Promise<Blob> {
  return fetch(url).then((response) => {
    if (!response.ok) throw new Error(`${response.status} for ${url}`);
    return response.blob();
  });
}

/** Forgets every loaded file. For tests. */
export function clearLoadedAudio(): void {
  loaded.clear();
}
