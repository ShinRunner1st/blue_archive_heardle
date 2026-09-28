import { backupUrlFor } from "./audioUrl";
import { pictureUrl } from "./season";

const loading = new Map<string, Promise<string>>();
const loaded = new Map<string, string>();

function tryLoad(src: string): Promise<boolean> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(true);
    image.onerror = () => resolve(false);
    image.src = src;
  });
}

/**
 * An icon sheet's address, by its key in pictureFiles, once it has loaded:
 * from the Worker, or from its copy on R2 if the Worker fails, like the
 * audio. Each sheet loads once a visit, the first time one of its icons
 * shows, and the icons draw from it after.
 */
export function loadIconSheet(key: string): Promise<string> {
  let sheet = loading.get(key);
  if (!sheet) {
    sheet = (async () => {
      const url = pictureUrl(key);
      const backup = backupUrlFor(url);
      const src = (await tryLoad(url)) || !backup ? url : backup;
      loaded.set(key, src);
      return src;
    })();
    loading.set(key, sheet);
  }
  return sheet;
}

/** The sheet's address if it has already loaded, for a first render. */
export function loadedIconSheet(key: string): string | null {
  return loaded.get(key) ?? null;
}

/** Forgets the sheets, for tests. */
export function resetIconSheet(): void {
  loading.clear();
  loaded.clear();
}
