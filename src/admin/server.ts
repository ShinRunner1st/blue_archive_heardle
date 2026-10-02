/**
 * The admin tool's side on the PC: a Vite plugin that reads the content
 * files for the page and writes them back once they pass the same checks
 * as the content test. It runs only under `npm run admin`, answers only the
 * tool's own page on this machine, and never touches the site's build.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import { join, resolve } from "node:path";
import prettier from "prettier";

import {
  CONTENT_FILE_PATHS,
  type ContentFileName,
  type ContentFiles,
  type IdsLock,
} from "../content/types";
import type { ContentEnv, ContentProblem } from "../content/validate";
import { nextLock } from "./lock";

export const ADMIN_PORT = 5180;

/**
 * As much of Vite's dev server and plugin as the tool uses: Vite's own
 * types bring all of Node's into src/, which the project keeps out.
 */
interface DevServer {
  middlewares: {
    use(
      path: string,
      handle: (req: IncomingMessage, res: ServerResponse) => void
    ): void;
  };
  ssrLoadModule(url: string): Promise<Record<string, unknown>>;
}

interface AdminPlugin {
  name: string;
  configureServer(server: DevServer): void;
}

const CONTENT_DIR = "src/content";
/** The most a save may send: the content files are about 60 KB. */
const MAX_BODY = 5 * 1024 * 1024;

/** What the page loads: the files, what's shipped, and the files on disk. */
export interface ContentState {
  files: ContentFiles;
  /** ids.lock.json on `main`: ids that reached players. */
  shipped: IdsLock;
  /** Files the checks look for on disk (season pictures, badge covers). */
  existing: string[];
}

const pathOf = (name: ContentFileName) =>
  join(CONTENT_DIR, CONTENT_FILE_PATHS[name]);

export function readContent(): ContentFiles {
  const files = {} as Record<ContentFileName, unknown>;
  for (const name of Object.keys(CONTENT_FILE_PATHS) as ContentFileName[]) {
    files[name] = JSON.parse(readFileSync(pathOf(name), "utf8"));
  }
  return files as ContentFiles;
}

/**
 * The lock as released, from `main`. Without git (or `main`), every id in
 * the lock now counts as shipped, which only ever keeps more.
 */
export function readShipped(current: IdsLock): IdsLock {
  try {
    const text = execFileSync(
      "git",
      ["show", `main:${CONTENT_DIR}/${CONTENT_FILE_PATHS.idsLock}`],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }
    );
    return JSON.parse(text) as IdsLock;
  } catch {
    return current;
  }
}

/** The files the content checks ask about, as paths from the project root. */
export function existingFiles(): string[] {
  const list = (dir: string) =>
    existsSync(dir) ? readdirSync(dir).map((name) => `${dir}/${name}`) : [];
  return [...list("pictures/seasons"), ...list("src/image/badges")];
}

/**
 * Only the tool's own page, on this machine: the Host header stops a web
 * page that points a name at 127.0.0.1, and the Origin header any other
 * site's page from sending a save.
 */
export function isOwnRequest(
  headers: IncomingMessage["headers"],
  writing: boolean
): boolean {
  const hosts = [`127.0.0.1:${ADMIN_PORT}`, `localhost:${ADMIN_PORT}`];
  if (!hosts.includes(headers.host ?? "")) return false;
  if (!writing) return true;
  return (
    hosts.some((host) => headers.origin === `http://${host}`) &&
    (headers["content-type"] ?? "").startsWith("application/json")
  );
}

function send(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((done, fail) => {
    let size = 0;
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY) {
        fail(new Error("too big"));
        req.destroy();
      } else chunks.push(chunk);
    });
    req.on("end", () => done(Buffer.concat(chunks).toString("utf8")));
    req.on("error", fail);
  });
}

/**
 * A file as Prettier writes it, so a save leaves format:check passing.
 * From JSON spread over lines, as Prettier keeps an object on one line
 * only if it was: that gives back every file there byte for byte, so a
 * save's diff is only what was edited.
 */
async function formatted(name: ContentFileName, data: unknown) {
  const filepath = resolve(pathOf(name));
  const options = (await prettier.resolveConfig(filepath)) ?? {};
  return prettier.format(JSON.stringify(data, null, 2), {
    ...options,
    filepath,
  });
}

/**
 * Checks the files with the content test's own checks and writes the ones
 * that changed, the lock worked out from them. Nothing is written if any
 * check fails.
 */
async function save(
  server: DevServer,
  files: ContentFiles
): Promise<{ problems: ContentProblem[]; written: string[] }> {
  const current = readContent();
  const shipped = readShipped(current.idsLock);
  const next: ContentFiles = { ...files, idsLock: nextLock(shipped, files) };

  const { checkContent } = (await server.ssrLoadModule(
    resolve("src/content/validate.ts")
  )) as unknown as typeof import("../content/validate");
  const { pictureFiles } = (await server.ssrLoadModule(
    resolve("src/constants/pictureFiles.ts")
  )) as unknown as typeof import("../constants/pictureFiles");
  const env: ContentEnv = { pictureFiles, exists: existsSync };
  const problems = checkContent(next, env);
  if (problems.length > 0) return { problems, written: [] };

  const written: string[] = [];
  for (const name of Object.keys(CONTENT_FILE_PATHS) as ContentFileName[]) {
    if (JSON.stringify(next[name]) === JSON.stringify(current[name])) continue;
    writeFileSync(pathOf(name), await formatted(name, next[name]));
    written.push(CONTENT_FILE_PATHS[name]);
  }
  return { problems, written };
}

export function adminApi(): AdminPlugin {
  return {
    name: "admin-api",
    configureServer(server) {
      server.middlewares.use("/api/content", (req, res) => {
        const writing = req.method === "PUT";
        if (!isOwnRequest(req.headers, writing)) {
          return send(res, 403, { error: "Only the admin page can ask." });
        }
        if (req.method === "GET") {
          const files = readContent();
          const state: ContentState = {
            files,
            shipped: readShipped(files.idsLock),
            existing: existingFiles(),
          };
          return send(res, 200, state);
        }
        if (!writing) return send(res, 405, { error: "GET or PUT" });
        readBody(req)
          .then(async (text) => {
            const { files } = JSON.parse(text) as { files: ContentFiles };
            const result = await save(server, files);
            send(res, result.problems.length > 0 ? 422 : 200, result);
          })
          .catch((error: unknown) => send(res, 400, { error: String(error) }));
      });
    },
  };
}
