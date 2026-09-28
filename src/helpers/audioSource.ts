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
 */
import { backupUrlFor } from "./audioUrl";

/** Recent files, oldest first. A round needs two: its clip and its song. */
const loaded = new Map<string, Promise<string>>();
const KEEP = 4;

export function loadAudio(url: string): Promise<string> {
  const known = loaded.get(url);
  if (known) {
    // Move it to the back, as the most recently used.
    loaded.delete(url);
    loaded.set(url, known);
    return known;
  }

  const loading = download(url)
    .catch((error: unknown) => {
      const backup = backupUrlFor(url);
      if (!backup) throw error;
      return download(backup);
    })
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
