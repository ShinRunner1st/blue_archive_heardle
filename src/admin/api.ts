/** The admin page's calls to its server (server.ts), on the same address. */
import type { ContentFiles } from "../content/types";
import type { ContentProblem } from "../content/validate";
import type { PictureEntry, PictureRequest } from "./pictureRules";
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
  | { ok: true; pictures: PictureEntry[] }
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
    error?: string;
  };
  return response.ok
    ? { ok: true, pictures: data.pictures ?? [] }
    : { ok: false, error: data.error ?? `Failed: ${response.status}` };
}

/** Makes a picture with the project's scripts; the list comes back. */
export const makePicture = (request: PictureRequest) =>
  pictureCall("POST", request);

/** Deletes one of the tool's pictures; the list comes back. */
export const deletePicture = (path: string) => pictureCall("DELETE", { path });
