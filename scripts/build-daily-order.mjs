/**
 * Builds the daily puzzle schedule.
 *
 * Daily mode used to shuffle the song list at runtime. That made the schedule
 * a function of the list's length, so adding a single song reshuffled 340 of
 * 341 days: today's track would change mid-deploy, two players on the same day
 * would see different songs, and every past puzzle number would stop meaning
 * anything.
 *
 * The order is checked in instead. Existing entries are NEVER reordered - new
 * songs are appended, shuffled among themselves - so adding songs cannot touch
 * a day that has already been played.
 *
 * Run `npm run build:daily-order` after changing the song list. A test fails
 * if the two ever drift apart.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";

import { obscure, reveal } from "../src/helpers/obscure.ts";
import { loadSongs } from "./lib/songs.mjs";

const OUTPUT_PATH = "src/constants/dailyOrder.ts";

/**
 * Fixed seed. Only ever used to shuffle songs that are not in the schedule yet,
 * so changing it cannot disturb days already scheduled - but there is no reason
 * to change it either.
 */
const SEED = 20260921;

/** Small deterministic PRNG, so a given batch always shuffles the same way. */
function mulberry32(seed) {
  let state = seed >>> 0;

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled(items, seed) {
  const random = mulberry32(seed);
  const out = [...items];

  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }

  return out;
}

/**
 * Reads the schedule already checked in, or an empty one on first run. It is
 * stored scrambled (see src/helpers/obscure.ts), so reading the code doesn't
 * give away the days ahead.
 */
function loadExistingOrder() {
  if (!existsSync(OUTPUT_PATH)) return [];

  const source = readFileSync(OUTPUT_PATH, "utf8");
  const stored = source.match(/const ORDER =\s*"([^"]*)"/);
  const text = stored && reveal(stored[1]);

  if (!text) throw new Error(`Could not read the order in ${OUTPUT_PATH}`);

  return text.split(",");
}

function render(order) {
  return `import { reveal } from "../helpers/obscure";

/**
 * The order daily puzzles are dealt in, by theme number.
 *
 * GENERATED FILE - do not edit by hand. Run \`npm run build:daily-order\` after
 * changing the song list.
 *
 * Entries are never reordered, only appended. A day that has already been
 * played therefore always resolves to the same song, however much the song
 * list grows afterwards.
 *
 * Stored scrambled, so the days ahead can't be read off the code.
 */
const ORDER = "${obscure(order.join(","))}";

export const dailyOrder: string[] = (reveal(ORDER) ?? "").split(",");
`;
}

const songs = loadSongs();
const existing = loadExistingOrder();

const known = new Set(songs.map((song) => song.themeNo));
const scheduled = new Set(existing);

const added = songs
  .map((song) => song.themeNo)
  .filter((themeNo) => !scheduled.has(themeNo));

// A theme that left the song list keeps its slot: removing it would shift every
// day after it and change puzzles people have already played. The app resolves
// an unknown entry to a deterministic stand-in for that one day only.
const orphaned = existing.filter((themeNo) => !known.has(themeNo));

const order =
  existing.length === 0
    ? // First run: seed the whole schedule in one shuffle.
      shuffled(
        songs.map((song) => song.themeNo),
        SEED
      )
    : [...existing, ...shuffled(added, SEED + existing.length)];

writeFileSync(OUTPUT_PATH, render(order), "utf8");

console.log(`Songs in list:      ${songs.length}`);
console.log(`Already scheduled:  ${existing.length}`);
console.log(`Appended:           ${added.length}`);

if (orphaned.length > 0) {
  console.warn(
    `\nWARNING: ${
      orphaned.length
    } scheduled theme(s) are no longer in the song list:\n  ${orphaned.join(
      ", "
    )}\n` + "Their slots are kept so the rest of the schedule does not shift."
  );
}

console.log(`\nWrote ${order.length} entries to ${OUTPUT_PATH}`);
