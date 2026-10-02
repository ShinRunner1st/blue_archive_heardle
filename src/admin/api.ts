/** The admin page's calls to its server (server.ts), on the same address. */
import type { ContentFiles } from "../content/types";
import type { ContentProblem } from "../content/validate";
import type { CharacterRequest } from "./characterRules";
import type { CachedSprite } from "./characterServer";
import type { PictureEntry, PictureMade, PictureRequest } from "./pictureRules";
import type { ContentState } from "./server";

export type { ContentState };

export async function loadContent(): Promise<ContentState> {
  const response = await fetch("/api/content", { cache: "no-store" });
  if (!response.ok) throw new Error(`Loading failed: ${response.status}`);
  return (await response.json()) as ContentState;
}

export type SaveResult =
  | { ok: true; written: string[] }
  | { ok: false; problems: ContentProblem[]; error?: string };

export async function saveContent(files: ContentFiles): Promise<SaveResult> {
  const response = await fetch("/api/content", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ files }),
  });
  const body = (await response.json()) as {
    written?: string[];
    problems?: ContentProblem[];
    error?: string;
  };
  if (response.ok) return { ok: true, written: body.written ?? [] };
  return { ok: false, problems: body.problems ?? [], error: body.error };
}

/** A picture in the project, for thumbnails and previews. */
export const fileUrl = (path: string, version = "") =>
  `/api/file?path=${encodeURIComponent(path)}${version && `&v=${version}`}`;

type PictureResult =
  | { ok: true; pictures: PictureEntry[]; made?: PictureMade }
  | { ok: false; error: string };

async function pictureCall(
  method: "POST" | "DELETE",
  body: unknown
): Promise<PictureResult> {
  const response = await fetch("/api/picture", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await response.json()) as {
    pictures?: PictureEntry[];
    made?: PictureMade;
    error?: string;
  };
  return response.ok
    ? { ok: true, pictures: data.pictures ?? [], made: data.made }
    : { ok: false, error: data.error ?? `Failed: ${response.status}` };
}

/** Makes a picture with the project's scripts; the list comes back. */
export const makePicture = (request: PictureRequest) =>
  pictureCall("POST", request);

/** Deletes one of the tool's pictures; the list comes back. */
export const deletePicture = (path: string) => pictureCall("DELETE", { path });

/** The game's sprites cached on this PC, by name without _spr. */
export async function loadSprites(): Promise<CachedSprite[]> {
  const response = await fetch("/api/sprites", { cache: "no-store" });
  if (!response.ok) return [];
  return ((await response.json()) as { sprites: CachedSprite[] }).sprites;
}

/** Adds a character's sprite to public/spine/<id>/ with build-spine.py. */
export async function addCharacter(
  request: CharacterRequest
): Promise<
  | { ok: true; skel: string; atlas: string; kb: number }
  | { ok: false; error: string }
> {
  const response = await fetch("/api/character", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  const data = (await response.json()) as {
    skel: string;
    atlas: string;
    kb: number;
    error?: string;
  };
  return response.ok
    ? { ok: true, ...data }
    : { ok: false, error: data.error ?? `Failed: ${response.status}` };
}
