/** The admin page's calls to its server (server.ts), on the same address. */
import type { ContentFiles } from "../content/types";
import type { ContentProblem } from "../content/validate";
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
