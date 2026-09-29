/**
 * Copies what is on in Blue Archive Global right now - the pickup banners,
 * the event and the raids, each with its start and end - from SchaleDB into
 * now-dist/now.json, for the hub's "Now in Global" panel. `npm run
 * global-now` then puts it on its own Worker (now-worker/), where requests
 * are free; the game reads it from there and never asks SchaleDB itself.
 *
 * A GitHub Action (.github/workflows/global-now.yml) runs this every six
 * hours. With --if-changed it compares the result with the live copy and
 * reports `changed=true|false` to the Action, so the Worker is only deployed
 * when something moved. If SchaleDB changes its format, this stops with an
 * error and the live copy stays as it was.
 *
 *   node scripts/build-global-now.mjs [--if-changed]
 */
import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const SCHALEDB = "https://schaledb.com/data";
const NOW_DIR = "now-dist";
const LIVE_URL = "https://ba-heardle-now.shinrunner1st.workers.dev/now.json";

/** Fifteen minutes: a banner's end shows on time within that. */
const HEADERS = `/*
  Cache-Control: public, max-age=900
  Access-Control-Allow-Origin: *
`;

/** The raid kinds as Global names them in the game. */
const RAID_KINDS = {
  Raid: "Total Assault",
  EliminateRaid: "Grand Assault",
  MultiFloorRaid: "Final Restriction Release",
  TimeAttack: "Joint Firing Drill",
  WorldRaid: "World Raid",
};

async function getJson(path) {
  const response = await fetch(`${SCHALEDB}/${path}`, {
    headers: { "User-Agent": "baheardle.com build script" },
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

function buildNow(config, localization, raids, students) {
  const global = config.Regions?.find((region) => region.Name === "Global");
  check(global, "no Global region in config");
  for (const key of ["CurrentGacha", "CurrentEvents", "CurrentRaid"]) {
    check(Array.isArray(global[key]), `Global.${key} is not a list`);
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
    };
  });

  return { banners, events, raids: raidsNow };
}

async function main() {
  const [config, localization, raids, students] = await Promise.all([
    getJson("config.min.json"),
    getJson("en/localization.min.json"),
    getJson("en/raids.min.json"),
    getJson("en/students.min.json"),
  ]);
  const now = buildNow(config, localization, raids, students);

  mkdirSync(NOW_DIR, { recursive: true });
  writeFileSync(join(NOW_DIR, "now.json"), JSON.stringify(now));
  writeFileSync(join(NOW_DIR, "_headers"), HEADERS);
  console.log(
    `${NOW_DIR}/now.json: ${now.banners.length} banner(s), ${now.events.length} event(s), ${now.raids.length} raid(s).`
  );

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
