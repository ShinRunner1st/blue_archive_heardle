/**
 * The admin tool's characters, on the PC: the students' Spine sprites the
 * game's files left in .cache/game/sprites/ (README, "The game's files"),
 * served for the preview before one is added, and adding one to
 * public/spine/<id>/ with scripts/build-spine.py, from there or from
 * files dropped in.
 */
import { execFile } from "node:child_process";
import {
  createReadStream,
  existsSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import type { ServerResponse } from "node:http";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";

import { type CharacterRequest, characterProblem } from "./characterRules";

export type { CharacterRequest };

export const SPRITE_CACHE = ".cache/game/sprites";

/** A sprite in the cache, by its name without _spr (hina, CH0058). */
export interface CachedSprite {
  name: string;
  kb: number;
}

export function listCachedSprites(): CachedSprite[] {
  if (!existsSync(SPRITE_CACHE)) return [];
  return readdirSync(SPRITE_CACHE)
    .filter((file) => file.endsWith("_spr.skel"))
    .map((file) => {
      const name = file.slice(0, -"_spr.skel".length);
      const kb = ["skel", "atlas", "png"]
        .map((ext) => join(SPRITE_CACHE, `${name}_spr.${ext}`))
        .filter((path) => existsSync(path))
        .reduce((sum, path) => sum + statSync(path).size, 0);
      return { name, kb: Math.round(kb / 1024) };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Sends a cached sprite's file to the preview's Spine runtime. */
export function sendCachedSprite(res: ServerResponse, file: string): boolean {
  if (!/^[A-Za-z0-9_]+_spr(_\d+)?\.(skel|atlas|png)$/.test(file)) return false;
  const path = join(SPRITE_CACHE, file);
  if (!existsSync(path)) return false;
  res.setHeader(
    "Content-Type",
    file.endsWith(".png")
      ? "image/png"
      : file.endsWith(".atlas")
      ? "text/plain"
      : "application/octet-stream"
  );
  res.setHeader("Cache-Control", "no-store");
  createReadStream(path).pipe(res);
  return true;
}

/** Python 3 as Windows or anywhere else names it. */
function python(args: string[]): Promise<string> {
  const run = (command: string) =>
    new Promise<string>((done, fail) =>
      execFile(command, args, (error, stdout, stderr) =>
        error ? fail(new Error(stderr.trim() || error.message)) : done(stdout)
      )
    );
  return run("python").catch(() => run("python3"));
}

/**
 * Adds a character's sprite to public/spine/<id>/ (replacing what's there),
 * and says what its files are called.
 */
export async function addCharacter(
  request: CharacterRequest
): Promise<{ skel: string; atlas: string; kb: number }> {
  const problem = characterProblem(request);
  if (problem) throw new Error(problem);

  const dir = mkdtempSync(join(tmpdir(), "admin-character-"));
  try {
    let skel: string;
    if (request.sprite) {
      skel = join(SPRITE_CACHE, `${request.sprite}_spr.skel`);
      if (!existsSync(skel)) throw new Error(`No ${request.sprite}_spr here.`);
    } else {
      for (const { name, data } of request.upload ?? []) {
        writeFileSync(
          join(dir, basename(name)),
          Buffer.from(data.replace(/^data:[^,]*,/, ""), "base64")
        );
      }
      const found = readdirSync(dir).find((file) => file.endsWith(".skel"));
      if (!found) throw new Error("Drop the .skel with its .atlas and .png.");
      skel = join(dir, found);
    }
    await python(["scripts/build-spine.py", skel, request.id]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  const out = join("public/spine", request.id);
  const files = readdirSync(out);
  const skelFile = files.find((file) => file.endsWith(".skel"));
  const atlasFile = files.find((file) => file.endsWith(".atlas"));
  if (!skelFile || !atlasFile) throw new Error("build-spine.py made nothing.");
  const kb = files.reduce(
    (sum, file) => sum + statSync(join(out, file)).size,
    0
  );
  return {
    skel: `${request.id}/${skelFile}`,
    atlas: `${request.id}/${atlasFile}`,
    kb: Math.round(kb / 1024),
  };
}
