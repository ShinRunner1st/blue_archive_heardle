/**
 * Copies what is on in Blue Archive right now, on Global and on JP - the
 * pickup banners, the event and the raids, each with its start and end -
 * from SchaleDB into now-dist/now.json, for the hub's "Now in Global" panel
 * ("Now in JP" when the student games follow JP). `npm run
 * global-now` then puts it on its own Worker (now-worker/), where requests
 * are free; the game reads it from there and never asks SchaleDB itself.
 *
 * The event's logo and each raid boss's picture come along, converted to
 * small WebP files in now-dist/img/ named after their source's bytes, so
 * they can be cached for a year. Needs ffmpeg on the PATH for that.
 *
 * A GitHub Action (.github/workflows/global-now.yml) runs this every six
 * hours. With --if-changed it compares the result with the live copy and
 * reports `changed=true|false` to the Action, so the Worker is only deployed
 * when something moved. If SchaleDB changes its format, this stops with an
 * error and the live copy stays as it was.
 *
 *   node scripts/build-global-now.mjs [--if-changed]
 */
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import {
  appendFileSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);

const SCHALEDB = "https://schaledb.com/data";
const IMAGES = "https://schaledb.com/images";
const NOW_DIR = "now-dist";
const LIVE_URL = "https://ba-heardle-now.shinrunner1st.workers.dev/now.json";

/**
 * The file for fifteen minutes, so a banner's end shows on time within that;
 * the pictures for a year, since a changed one gets a new name. One rule per
 * path: Cloudflare joins the values of two rules that both match.
 */
const HEADERS = `/*
  Access-Control-Allow-Origin: *
/now.json
  Cache-Control: public, max-age=900
/img/*
  Cache-Control: public, max-age=31536000, immutable
`;

/** Twice the size the hub shows them at. */
const RAID_WIDTH = 390;

/** The raid kinds as Global names them in the game. */
const RAID_KINDS = {
  Raid: "Total Assault",
  EliminateRaid: "Grand Assault",
  MultiFloorRaid: "Final Restriction Release",
  TimeAttack: "Joint Firing Drill",
  WorldRaid: "World Raid",
};

const HEADERS_OUT = { "User-Agent": "baheardle.com build script" };

async function getJson(path) {
  const response = await fetch(`${SCHALEDB}/${path}`, {
    headers: HEADERS_OUT,
  });
  if (!response.ok) throw new Error(`${path}: ${response.status}`);
  return response.json();
}

function check(condition, what) {
  if (!condition) throw new Error(`SchaleDB's format changed: ${what}`);
}

const isTime = (value) => Number.isInteger(value) && value > 1.5e9;

function span(entry, what) {
  check(isTime(entry.start) && isTime(entry.end), `${what} start and end`);
  return { start: entry.start, end: entry.end };
}

/** A list keyed by id, or an object keyed by id, as a lookup by id. */
function byId(list) {
  const entries = Array.isArray(list) ? list : Object.values(list ?? {});
  return new Map(entries.map((entry) => [entry.Id, entry]));
}

/**
 * The servers the hub can follow: SchaleDB's name for each, and the language
 * of the event logos there.
 */
const SERVERS = {
  global: { region: "Global", logo: "En" },
  jp: { region: "Jp", logo: "Jp" },
};

/** What is on in one server now, as the hub shows it. */
function buildNow(config, server, localization, raids, students) {
  const { region, logo } = SERVERS[server];
  const global = config.Regions?.find((entry) => entry.Name === region);
  check(global, `no ${region} region in config`);
  for (const key of ["CurrentGacha", "CurrentEvents", "CurrentRaid"]) {
    check(Array.isArray(global[key]), `${region}.${key} is not a list`);
  }
  check(localization.EventName, "no EventName in localization");

  const studentsById = byId(students);
  const raidLists = {
    Raid: byId(raids.Raid),
    EliminateRaid: byId(raids.Raid),
    MultiFloorRaid: byId(raids.MultiFloorRaid),
  };

  const banners = global.CurrentGacha.map((gacha) => {
    check(Array.isArray(gacha.characters), "a banner's characters");
    return {
      students: gacha.characters.map((id) => ({
        id,
        name: studentsById.get(id)?.Name ?? `Student ${id}`,
      })),
      ...span(gacha, "a banner's"),
    };
  });

  const events = global.CurrentEvents.map((current) => {
    check(Number.isInteger(current.event), "an event's id");
    // Reruns are the event's id plus 10000.
    const base = current.event % 10000;
    const name =
      localization.EventName[current.event] ??
      localization.EventName[base] ??
      `Event ${base}`;
    return {
      name: current.event >= 10000 ? `${name} (Rerun)` : name,
      ...span(current, "an event's"),
      // Resolved to a file of ours in main(), or dropped.
      logo: `eventlogo/${base}_${logo}.webp`,
    };
  });

  const raidsNow = global.CurrentRaid.map((raid) => {
    check(typeof raid.type === "string", "a raid's type");
    const boss = raidLists[raid.type]?.get(raid.raid);
    return {
      kind: RAID_KINDS[raid.type] ?? raid.type,
      ...(boss?.Name ? { name: boss.Name } : {}),
      ...(typeof raid.terrain === "string" ? { terrain: raid.terrain } : {}),
      ...span(raid, "a raid's"),
      ...(boss?.DevName
        ? { picture: `raid/Boss_Portrait_${boss.DevName}_Lobby.png` }
        : {}),
    };
  });

  return { banners, events, raids: raidsNow };
}

/**
 * SchaleDB's picture at `path`, or null when it has none: it answers a
 * missing picture with its page, so the type is checked, not the status.
 */
async function getImage(path) {
  const response = await fetch(`${IMAGES}/${path}`, { headers: HEADERS_OUT });
  const type = response.headers.get("content-type") ?? "";
  if (!response.ok || !type.startsWith("image/")) return null;
  return Buffer.from(await response.arrayBuffer());
}

/**
 * Copies SchaleDB's picture at `path` into now-dist/img/ as WebP, `width`
 * pixels wide if given, and returns its path there; null if there is none.
 */
async function copyImage(path, width, work) {
  const source = await getImage(path);
  if (!source) {
    console.warn(`No picture at ${path}; left out.`);
    return null;
  }
  const stem = path
    .split("/")
    .pop()
    .replace(/\.\w+$/, "");
  const hash = createHash("sha256").update(source).digest("hex").slice(0, 10);
  const file = `img/${stem}.${hash}.webp`;
  const input = join(work, `in-${hash}`);
  writeFileSync(input, source);
  await run("ffmpeg", [
    ...["-v", "error", "-y", "-i", input],
    ...(width ? ["-vf", `scale=${width}:-2`] : []),
    ...["-c:v", "libwebp", "-quality", "75", "-map_metadata", "-1"],
    join(NOW_DIR, file),
  ]);
  return file;
}

async function main() {
  const [config, localization, raids, students] = await Promise.all([
    getJson("config.min.json"),
    getJson("en/localization.min.json"),
    getJson("en/raids.min.json"),
    getJson("en/students.min.json"),
  ]);
  // Each server's, by the name the game uses: { global: ..., jp: ... }.
  const now = Object.fromEntries(
    Object.keys(SERVERS).map((server) => [
      server,
      buildNow(config, server, localization, raids, students),
    ])
  );

  // Only this run's pictures: the Worker would otherwise keep old ones.
  rmSync(join(NOW_DIR, "img"), { recursive: true, force: true });
  mkdirSync(join(NOW_DIR, "img"), { recursive: true });
  const work = mkdtempSync(join(tmpdir(), "global-now-"));
  try {
    for (const { events, raids: raidsNow } of Object.values(now)) {
      for (const event of events) {
        const logo = await copyImage(event.logo, null, work);
        if (logo) event.logo = logo;
        else delete event.logo;
      }
      for (const raid of raidsNow) {
        if (!raid.picture) continue;
        const picture = await copyImage(raid.picture, RAID_WIDTH, work);
        if (picture) raid.picture = picture;
        else delete raid.picture;
      }
    }
  } finally {
    rmSync(work, { recursive: true, force: true });
  }

  writeFileSync(join(NOW_DIR, "now.json"), JSON.stringify(now));
  writeFileSync(join(NOW_DIR, "_headers"), HEADERS);
  for (const [server, { banners, events, raids: raidsNow }] of Object.entries(
    now
  )) {
    console.log(
      `${server}: ${banners.length} banner(s), ${events.length} event(s), ${raidsNow.length} raid(s).`
    );
  }

  if (process.argv.includes("--if-changed")) {
    let live = null;
    try {
      const response = await fetch(LIVE_URL, { cache: "no-store" });
      if (response.ok) live = await response.text();
    } catch {
      // Not there yet, or down: deploy.
    }
    const changed = live !== JSON.stringify(now);
    console.log(changed ? "Changed: deploy." : "Unchanged: nothing to do.");
    if (process.env.GITHUB_OUTPUT) {
      appendFileSync(process.env.GITHUB_OUTPUT, `changed=${changed}\n`);
    }
  }
}

await main();
