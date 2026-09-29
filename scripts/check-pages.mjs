/**
 * Opens the built site in a headless Chrome and goes through every page on
 * both servers, the way a player would, to catch what the unit tests can't
 * see: a page that throws, a file that doesn't load, or a picture cut from
 * its sheet in the wrong place or squashed (as Global's halos were once).
 *
 *   npm run build && npm run check:pages
 *   npm run check:pages -- --url https://baheardle.com
 *
 * With --url it checks a deployed site instead, as after a deployment or a
 * change of domain.
 *
 * It serves build/ with `wrangler dev` and the site's own Worker config, so
 * the pages get the live site's headers (a picture or request blocked by the
 * Content-Security-Policy fails here) and the pictures come from the Worker
 * like on the live site: a sheet not uploaded yet (`npm run songs`) fails
 * here too. Chrome is found at CHROME_PATH or the usual places; GitHub's
 * Ubuntu runners have it. On a failure it saves screenshots in
 * check-pages-output/ and exits with 1.
 */

import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import puppeteer from "puppeteer-core";

const PORT = 4317;
const urlArg = process.argv.indexOf("--url");
const REMOTE =
  urlArg === -1 ? undefined : process.argv[urlArg + 1]?.replace(/\/+$/, "");
const BASE = REMOTE ?? `http://localhost:${PORT}`;
const OUT = "check-pages-output";
const SERVERS = ["global", "jp"];

const CHROMES = [
  process.env.CHROME_PATH,
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
].filter(Boolean);

/** The newest What's new id, so its pop-up stays shut. */
const LATEST_NEWS = /id: "([^"]+)"/.exec(
  readFileSync("src/constants/whatsNew.ts", "utf8")
)[1];

const failures = [];
let checked = 0;
const fail = (where, message) => failures.push(`${where}: ${message}`);

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Stops the server and what it started: on Windows, killing wrangler alone
 * would leave its workerd running.
 */
function stopPreview(preview) {
  if (process.platform === "win32") {
    spawn("taskkill", ["/pid", String(preview.pid), "/t", "/f"], {
      stdio: "ignore",
    });
  } else {
    preview.kill();
  }
}

/** Serves build/ as the live site does, until the check is over. */
async function startPreview() {
  if (!existsSync("build/index.html")) {
    throw new Error("No build/ - run `npm run build` first.");
  }
  const preview = spawn(
    process.execPath,
    [
      "node_modules/wrangler/bin/wrangler.js",
      "dev",
      "--config",
      "site-worker/wrangler.jsonc",
      "--port",
      String(PORT),
      "--show-interactive-dev-session=false",
    ],
    { stdio: "ignore", env: { ...process.env, WRANGLER_SEND_METRICS: "false" } }
  );
  for (let tries = 0; tries < 120; tries++) {
    try {
      if ((await fetch(BASE)).ok) return preview;
    } catch {
      // Not up yet.
    }
    await wait(500);
  }
  stopPreview(preview);
  throw new Error("wrangler dev didn't start");
}

/** Waits for the page to settle after a click or a load. */
async function settle(page) {
  await page
    .waitForNetworkIdle({ idleTime: 500, timeout: 20000 })
    .catch(() => undefined);
  await wait(400);
}

/** Clicks the first button whose text is `text`; false if there's none. */
async function clickButton(page, text) {
  for (const button of await page.$$("button")) {
    const label = await button.evaluate((el) => el.textContent?.trim());
    if (label === text) {
      await button.click();
      await settle(page);
      return true;
    }
  }
  return false;
}

/** Moves to a page by the game bar, as a player would. */
async function openPage(page, path) {
  for (const link of await page.$$("nav a")) {
    const href = await link.evaluate((el) => new URL(el.href).pathname);
    if (href === path) {
      await link.click();
      await settle(page);
      return;
    }
  }
  fail(path, "no link to it in the game bar");
}

/**
 * Checks everything on screen drawn from a picture: every <img> has loaded,
 * and every cell cut from a sheet (a background with a size in pixels) is
 * cut at the sheet's own proportions, inside the sheet, and has something
 * drawn in it.
 */
async function checkPictures(page, where) {
  const problems = await page.evaluate(async () => {
    const found = [];
    let seen = 0;
    const describe = (el) =>
      el.getAttribute("aria-label") ||
      el.getAttribute("title") ||
      el.getAttribute("alt") ||
      el.className?.toString().slice(0, 40) ||
      el.tagName;

    for (const img of document.querySelectorAll("img")) {
      if (!img.closest("[hidden]") && img.getClientRects().length === 0) {
        continue;
      }
      seen++;
      if (!img.complete || img.naturalWidth === 0) {
        found.push(`image didn't load: ${img.currentSrc || img.src}`);
      }
    }

    const sheets = new Map();
    const sheetOf = (src) => {
      if (!sheets.has(src)) {
        sheets.set(
          src,
          new Promise((resolve) => {
            const image = new Image();
            image.crossOrigin = "anonymous";
            image.onload = () => {
              const canvas = document.createElement("canvas");
              canvas.width = image.naturalWidth;
              canvas.height = image.naturalHeight;
              const context = canvas.getContext("2d", {
                willReadFrequently: true,
              });
              context.drawImage(image, 0, 0);
              resolve({ image, context });
            };
            image.onerror = () => resolve(null);
            image.src = src;
          })
        );
      }
      return sheets.get(src);
    };

    for (const el of document.querySelectorAll("*")) {
      const style = getComputedStyle(el);
      const url = /url\("?([^")]+)"?\)/.exec(style.backgroundImage)?.[1];
      const size = /^([\d.]+)px ([\d.]+)px$/.exec(style.backgroundSize);
      if (!url || !size) continue;
      const box = el.getBoundingClientRect();
      if (box.width === 0 || box.height === 0) continue;

      seen++;
      const sheet = await sheetOf(url);
      if (!sheet) {
        found.push(`sheet didn't load: ${url}`);
        continue;
      }
      const { image, context } = sheet;
      const scaleX = Number(size[1]) / image.naturalWidth;
      const scaleY = Number(size[2]) / image.naturalHeight;
      if (Math.abs(scaleX - scaleY) / scaleX > 0.01) {
        found.push(
          `${describe(el)} is cut from a squashed sheet (${size[0]} for a ` +
            `${image.naturalWidth}x${image.naturalHeight} sheet)`
        );
        continue;
      }
      const [x, y] = style.backgroundPosition
        .split(" ")
        .map((value) => -parseFloat(value) / scaleX);
      const width = el.clientWidth / scaleX;
      const height = el.clientHeight / scaleX;
      if (
        x < -1 ||
        y < -1 ||
        x + width > image.naturalWidth + 1 ||
        y + height > image.naturalHeight + 1
      ) {
        found.push(`${describe(el)} is cut from outside its sheet`);
        continue;
      }
      const pixels = context.getImageData(
        Math.max(0, Math.round(x)),
        Math.max(0, Math.round(y)),
        Math.max(1, Math.round(width)),
        Math.max(1, Math.round(height))
      ).data;
      let drawn = 0;
      for (let i = 3; i < pixels.length; i += 4) {
        if (pixels[i] > 16) drawn++;
      }
      if (drawn < (pixels.length / 4) * 0.02) {
        found.push(`${describe(el)} is blank in its sheet`);
      }
    }
    return { found, seen };
  });
  checked += problems.seen;
  for (const problem of problems.found) fail(where, problem);
}

/** Checks the page has something in its play area. */
async function checkShown(page, where) {
  const text = await page.evaluate(
    () => document.querySelector("main")?.innerText.trim() ?? ""
  );
  if (text.length < 20) fail(where, "the play area is empty");
}

async function snap(page, name) {
  mkdirSync(OUT, { recursive: true });
  await page.screenshot({ path: join(OUT, `${name}.png`) });
}

async function checkServer(browser, server) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  let where = `${server} /`;

  page.on("pageerror", (error) => fail(where, `error: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") fail(where, `console: ${message.text()}`);
  });
  page.on("requestfailed", (request) => {
    const reason = request.failure()?.errorText ?? "";
    // A player cut short by the next page is not a fault.
    if (reason.includes("ERR_ABORTED")) return;
    fail(where, `request failed (${reason}): ${request.url()}`);
  });
  page.on("response", (response) => {
    if (response.status() >= 400) {
      fail(where, `${response.status()} for ${response.url()}`);
    }
  });

  await page.evaluateOnNewDocument(
    (server, news) => {
      if (sessionStorage.getItem("checked")) return;
      sessionStorage.setItem("checked", "1");
      localStorage.clear();
      localStorage.setItem("firstRun", "false");
      localStorage.setItem("whatsNew", news);
      localStorage.setItem("server", server);
    },
    server,
    LATEST_NEWS
  );

  const step = async (name, action) => {
    where = `${server} ${name}`;
    const before = failures.length;
    await action();
    await checkShown(page, where);
    await checkPictures(page, where);
    if (failures.length > before) {
      await snap(page, `${server}-${name.replace(/[^\w-]+/g, "_")}`);
    }
  };

  await step("hub", async () => {
    await page.goto(`${BASE}/`, { waitUntil: "networkidle2" });
    await settle(page);
  });
  await step("ost", () => openPage(page, "/ost"));
  await step("voice", () => openPage(page, "/voice"));
  await step("students grid", async () => {
    await openPage(page, "/students");
    const grid = await page.$('button[aria-label="Browse all students"]');
    if (!grid) return fail(where, "no student grid button");
    await grid.click();
    await settle(page);
  });
  await page.keyboard.press("Escape");
  await wait(300);

  await step("picture daily halo", () => openPage(page, "/picture"));
  await step("picture daily weapon", () => clickButton(page, "Weapon"));
  await step("picture endless weapon", () => clickButton(page, "Endless"));
  await step("picture endless weapon shape", () =>
    clickButton(page, "Silhouette")
  );
  await step("picture endless halo shape", () => clickButton(page, "Halo"));
  await step("picture endless halo", () => clickButton(page, "Silhouette"));

  await page.close();
}

const chrome = CHROMES.find((path) => existsSync(path));
if (!chrome) {
  console.error("No Chrome found; set CHROME_PATH.");
  process.exit(1);
}

rmSync(OUT, { recursive: true, force: true });
const preview = REMOTE ? undefined : await startPreview();
const browser = await puppeteer.launch({
  executablePath: chrome,
  headless: true,
  args: ["--no-sandbox"],
});
try {
  for (const server of SERVERS) await checkServer(browser, server);
} finally {
  await browser.close();
  if (preview) stopPreview(preview);
}

if (failures.length > 0) {
  console.error(`${failures.length} problem(s) on the pages:`);
  for (const failure of failures) console.error(`- ${failure}`);
  console.error(`Screenshots are in ${OUT}/.`);
  process.exit(1);
}
console.log(
  `Checked the hub and every game on ${SERVERS.join(" and ")}: ` +
    `nothing broke, and all ${checked} pictures shown were whole.`
);
