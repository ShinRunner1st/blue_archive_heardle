import { ICON_SHEET_KEY } from "../constants/studentIcons";
import { backupUrlFor } from "./audioUrl";
import { pictureUrl } from "./season";

let loading: Promise<string> | null = null;
let loaded: string | null = null;

function tryLoad(src: string): Promise<boolean> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(true);
    image.onerror = () => resolve(false);
    image.src = src;
  });
}

/**
 * The student icon sheet's address, once it has loaded: from the Worker, or
 * from its copy on R2 if the Worker fails, like the audio. Loaded once a
 * visit, the first time an icon shows, and the icons draw from it after.
 */
export function loadIconSheet(): Promise<string> {
  loading ??= (async () => {
    const url = pictureUrl(ICON_SHEET_KEY);
    const backup = backupUrlFor(url);
    const src = (await tryLoad(url)) || !backup ? url : backup;
    loaded = src;
    return src;
  })();
  return loading;
}

/** The sheet's address if it has already loaded, for a first render. */
export function loadedIconSheet(): string | null {
  return loaded;
}

/** Forgets the sheet, for tests. */
export function resetIconSheet(): void {
  loading = null;
  loaded = null;
}
