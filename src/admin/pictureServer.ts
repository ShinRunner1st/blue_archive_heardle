/**
 * The admin tool's pictures, on the PC: making one (from an upload or one
 * of the game's backgrounds) with the project's own scripts, deleting one,
 * and listing them, then rebuilding the picture list as `npm run
 * build:pictures` does. Putting them on the Worker and R2 stays `npm run
 * songs`, by hand, as it publishes.
 */
import { execFile } from "node:child_process";
import {
  createReadStream,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import type { ServerResponse } from "node:http";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import prettier from "prettier";

import {
  type PictureEntry,
  type PictureMade,
  type PictureRequest,
  pictureTargetProblem,
  VIEWABLE_PICTURE,
} from "./pictureRules";

export type { PictureEntry, PictureRequest };

/** Folders of pictures cards and banners can use, and which are the tool's. */
const SCENE_FOLDERS = ["scenes", "seasons", "hub", "multiplayer"];

function run(args: string[]): Promise<string> {
  return new Promise((done, fail) =>
    execFile(
      process.execPath,
      args,
      { maxBuffer: 4 * 1024 * 1024 },
      (error, stdout, stderr) =>
        error ? fail(new Error(stderr.trim() || error.message)) : done(stdout)
    )
  );
}

/** The pictures in the scene folders, and whether the list has them yet. */
export function listScenePictures(): PictureEntry[] {
  const manifest = existsSync("src/constants/pictureFiles.ts")
    ? readFileSync("src/constants/pictureFiles.ts", "utf8")
    : "";
  return SCENE_FOLDERS.flatMap((folder) => {
    const dir = join("pictures", folder);
    if (!existsSync(dir)) return [];
    return readdirSync(dir)
      .filter((file) => file.endsWith(".webp"))
      .map((file) => {
        const key = `${folder}/${file.slice(0, -".webp".length)}`;
        return {
          key,
          path: `pictures/${folder}/${file}`,
          kb: Math.round(statSync(join(dir, file)).size / 102.4) / 10,
          listed: manifest.includes(`"${key}"`),
        };
      });
  });
}

/**
 * pictures/ to audio-dist/pictures/ and pictureFiles.ts, as `npm run
 * build:pictures` does, the lists formatted as Prettier would.
 */
async function buildPictures(): Promise<void> {
  await run(["scripts/build-pictures.mjs"]);
  for (const file of [
    "src/constants/pictureFiles.ts",
    "src/constants/portraitFiles.ts",
  ]) {
    const options = (await prettier.resolveConfig(resolve(file))) ?? {};
    writeFileSync(
      file,
      prettier.format(readFileSync(file, "utf8"), {
        ...options,
        filepath: file,
      })
    );
  }
}

/** Makes a picture as the request says, then lists it if it's the Worker's. */
export async function makePicture(
  request: PictureRequest
): Promise<PictureMade> {
  const problem = pictureTargetProblem(request);
  if (problem) throw new Error(problem);

  const dir = mkdtempSync(join(tmpdir(), "admin-picture-"));
  let summary: Partial<PictureMade> = {};
  try {
    let from: string;
    if (request.upload) {
      const data = request.upload.replace(/^data:[^,]*,/, "");
      from = join(dir, "upload");
      writeFileSync(from, Buffer.from(data, "base64"));
    } else {
      from = request.background ?? "";
    }
    mkdirSync(dirname(request.target), { recursive: true });
    if (
      request.style === "backdrop-day" ||
      request.style === "backdrop-night"
    ) {
      await run([
        "scripts/make-backdrop.mjs",
        from,
        request.style === "backdrop-day" ? "day" : "night",
        request.target,
      ]);
    } else {
      const printed = await run([
        "scripts/make-picture.mjs",
        from,
        request.style === "cover" ||
        request.style === "card" ||
        request.style === "banner"
          ? request.style
          : "scene",
        request.target,
      ]);
      // Its last line says how it came out.
      const last = printed.trim().split(/\r?\n/).pop() ?? "{}";
      summary = JSON.parse(last) as Partial<PictureMade>;
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  if (request.target.startsWith("pictures/")) await buildPictures();
  return {
    ...summary,
    path: request.target,
    kb: Math.round(statSync(request.target).size / 102.4) / 10,
  };
}

/** The tool's own pictures on the Worker, which it may delete. */
const WORKER_PICTURE =
  /^pictures\/(scenes|seasons|hub|multiplayer)\/[a-z0-9-]+\.webp$/;
/** The site's own backgrounds it made, which it may delete too. */
const SITE_PICTURE = /^src\/image\/backgrounds\/[a-z0-9-]+\.webp$/;

/**
 * Deletes a picture of the tool's folders, then lists the rest. The site's
 * own backgrounds aren't the Worker's, so they need no list rebuilt.
 */
export async function deletePicture(path: string): Promise<void> {
  if (!WORKER_PICTURE.test(path) && !SITE_PICTURE.test(path)) {
    throw new Error(
      "Only a picture in pictures/scenes, seasons, hub, multiplayer or src/image/backgrounds can go."
    );
  }
  rmSync(path, { force: true });
  if (WORKER_PICTURE.test(path)) await buildPictures();
}

/** Sends one of the pictures the tool shows, from the project. */
export function sendPicture(res: ServerResponse, path: string): boolean {
  if (!VIEWABLE_PICTURE.test(path) || !existsSync(path)) return false;
  res.setHeader("Content-Type", "image/webp");
  res.setHeader("Cache-Control", "no-store");
  createReadStream(path).pipe(res);
  return true;
}
