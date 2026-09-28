import { backupUrlFor, getVoiceTextsUrl } from "./audioUrl";

type Texts = Record<string, string[]>;

let loading: Promise<Texts> | null = null;

async function fetchTexts(url: string): Promise<Texts> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: ${response.status}`);
  const texts: unknown = await response.json();
  if (typeof texts !== "object" || texts === null) {
    throw new Error(`${url}: not a table`);
  }
  return texts as Texts;
}

/**
 * What a line says, in the official English, or "" for the title call.
 *
 * The texts sit in one file on the Worker (from its copy on R2 if the Worker
 * fails), read the first time a round is over: in the page, they would be in
 * every visit's download, and a round in progress would have its answer's
 * words a search away. Null when the file won't load, or has no such line.
 */
export async function loadVoiceText(
  id: number,
  line: number
): Promise<string | null> {
  if (!loading) {
    const url = getVoiceTextsUrl();
    loading = fetchTexts(url).catch((error: unknown) => {
      const backup = backupUrlFor(url);
      if (!backup) throw error;
      return fetchTexts(backup);
    });
    // A failure isn't kept, so the next result tries again.
    loading.catch(() => {
      loading = null;
    });
  }
  try {
    const text = (await loading)[String(id)]?.[line];
    return typeof text === "string" ? text : null;
  } catch {
    return null;
  }
}

/** Forgets the texts, for tests. */
export function resetVoiceTexts(): void {
  loading = null;
}
