/**
 * Draws the link previews (1200x630: public/preview.jpg for the hub, and
 * public/previews/<page>.jpg for each other page, as PAGES names them) and
 * the site's icons (favicon.ico, logo192.png, logo512.png,
 * apple-touch-icon.png) from the pages in scripts/preview/, by serving them
 * with Vite and screenshotting them in headless Chrome.
 *
 *   node scripts/make-preview.mjs [output folder, public/ by default]
 *
 * Needs Chrome or Edge (or CHROME set to one) and ffmpeg on the PATH.
 */
import { spawn, execFile } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { createServer } from "vite";

const run = promisify(execFile);

const OUT = process.argv[2] ?? "public";
const PORT = 5199;
const DEBUG_PORT = 9339;
/**
 * About 140 KB. Only X, Discord, LINE and the like fetch it, when a link is
 * shared, never the game, so sharpness wins over size.
 */
const JPEG_QUALITY = 4;

const BROWSERS = [
  process.env.CHROME,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
];

const browserPath = BROWSERS.find((path) => path && existsSync(path));
if (!browserPath) {
  console.error("No Chrome or Edge found: set CHROME to one.");
  process.exit(1);
}

/** A bare Chrome DevTools Protocol client: one page, one command at a time. */
async function openPage() {
  let targets;
  for (let i = 0; i < 50 && !targets; i++) {
    try {
      const list = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`);
      targets = (await list.json()).filter(({ type }) => type === "page");
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }
  if (!targets?.length) throw new Error("Chrome didn't open a page");

  const socket = new WebSocket(targets[0].webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.onopen = resolve;
    socket.onerror = reject;
  });
  let id = 0;
  const pending = new Map();
  socket.onmessage = ({ data }) => {
    const message = JSON.parse(data);
    const call = pending.get(message.id);
    if (!call) return;
    pending.delete(message.id);
    if (message.error) call.reject(new Error(message.error.message));
    else call.resolve(message.result);
  };
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      pending.set(++id, { resolve, reject });
      socket.send(JSON.stringify({ id, method, params }));
    });
  return { send, close: () => socket.close() };
}

/** The pages with a preview of their own; the one at "/" is the hub's. */
const PAGES = ["hub", "ost", "voice", "picture", "students", "multiplayer"];

/** Screenshots a page once it sets `window.previewReady`, as PNG bytes. */
async function screenshot(page, path, width, height) {
  await page.send("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await page.send("Page.navigate", {
    url: `http://localhost:${PORT}/scripts/preview/${path}`,
  });
  for (let i = 0; ; i++) {
    await new Promise((resolve) => setTimeout(resolve, 250));
    const { result } = await page.send("Runtime.evaluate", {
      expression: "window.previewReady === true",
    });
    if (result.value) break;
    if (i > 120) throw new Error(`${path} never got ready`);
  }
  const { data } = await page.send("Page.captureScreenshot", {
    format: "png",
  });
  return Buffer.from(data, "base64");
}

/**
 * An .ico holding PNGs, which every browser since IE 9 reads: one file for
 * the tab at each size, without the 150 KB a 192-pixel bitmap took.
 */
function icoOf(pngs) {
  const header = Buffer.alloc(6 + 16 * pngs.length);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(pngs.length, 4);
  let offset = header.length;
  pngs.forEach(({ size, data }, i) => {
    const entry = 6 + 16 * i;
    header.writeUInt8(size % 256, entry);
    header.writeUInt8(size % 256, entry + 1);
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(data.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += data.length;
  });
  return Buffer.concat([header, ...pngs.map(({ data }) => data)]);
}

const server = await createServer({
  server: { port: PORT, strictPort: true },
  logLevel: "error",
});
await server.listen();

const profile = mkdtempSync(join(tmpdir(), "preview-"));
const browser = spawn(browserPath, [
  "--headless=new",
  `--remote-debugging-port=${DEBUG_PORT}`,
  `--user-data-dir=${profile}`,
  "--hide-scrollbars",
  "--no-first-run",
  "about:blank",
]);

try {
  const page = await openPage();
  await page.send("Page.enable");
  // Transparent where a page draws nothing, for the icons' round corners.
  await page.send("Emulation.setDefaultBackgroundColorOverride", {
    color: { r: 0, g: 0, b: 0, a: 0 },
  });

  mkdirSync(join(OUT, "previews"), { recursive: true });
  for (const name of PAGES) {
    const png = join(profile, `preview-${name}.png`);
    const shot = await screenshot(page, `preview.html?page=${name}`, 1200, 630);
    writeFileSync(png, shot);
    const jpg =
      name === "hub" ? "preview.jpg" : join("previews", `${name}.jpg`);
    await run("ffmpeg", [
      ...["-v", "error", "-y", "-i", png],
      ...["-q:v", String(JPEG_QUALITY), join(OUT, jpg)],
    ]);
  }

  // Mari is drawn once at full size and scaled down: the Spine runtime
  // drawing her 16 pixels wide would alias.
  const icon = join(profile, "icon.png");
  const bleed = join(profile, "icon-bleed.png");
  writeFileSync(icon, await screenshot(page, "icon.html", 512, 512));
  writeFileSync(bleed, await screenshot(page, "icon.html?bleed", 512, 512));
  /**
   * Her scaled to a size. The big ones take a 256-colour palette, a third
   * of the bytes with no difference to see (the corners' soft edge goes,
   * which doesn't show at these sizes); the tab sizes are tiny either way.
   */
  const scaled = async (from, size, palette = false) => {
    const file = join(profile, `icon-${size}.png`);
    const scale = `scale=${size}:${size}:flags=lanczos`;
    const filter = palette
      ? `${scale},split[a][b];[a]palettegen=reserve_transparent=1:stats_mode=full[p];` +
        "[b][p]paletteuse=dither=sierra2_4a:alpha_threshold=128"
      : scale;
    await run("ffmpeg", [
      ...["-v", "error", "-y", "-i", from],
      ...["-vf", filter, file],
    ]);
    return readFileSync(file);
  };
  const small = [];
  for (const size of [16, 32, 48]) {
    small.push({ size, data: await scaled(icon, size) });
  }
  writeFileSync(join(OUT, "favicon.ico"), icoOf(small));
  writeFileSync(join(OUT, "logo192.png"), await scaled(icon, 192, true));
  writeFileSync(join(OUT, "logo512.png"), await scaled(icon, 512, true));
  writeFileSync(
    join(OUT, "apple-touch-icon.png"),
    await scaled(bleed, 180, true)
  );

  page.close();
  console.log(`Drew the previews and icons into ${OUT}/`);
} finally {
  browser.kill();
  await server.close();
  // Chrome may hold the profile a moment after it's told to quit.
  setTimeout(() => rmSync(profile, { recursive: true, force: true }), 1000);
}
