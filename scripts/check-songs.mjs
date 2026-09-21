/**
 * Verifies every song in the list still resolves on YouTube.
 *
 * A removed or privated video means an unplayable round with no way out, so
 * this runs on a schedule in CI rather than waiting for a player to hit it.
 * Uses the public oEmbed endpoint, which needs no API key: it answers 200 for
 * a playable video and 401/403/404 otherwise.
 */
import { readFileSync } from "node:fs";

const CONCURRENCY = 8;
const TIMEOUT_MS = 10_000;
const RETRIES = 2;

function loadSongs() {
  const source = readFileSync("src/constants/songs.ts", "utf8");

  // Slice out the array literal by its brackets rather than by stripping a
  // prefix: the declaration is not always the first thing in the file (a
  // leading comment already broke this once), and this survives reformatting.
  const start = source.indexOf("[");
  const end = source.lastIndexOf("]");

  if (start === -1 || end <= start) {
    throw new Error("Could not find the song array in src/constants/songs.ts");
  }

  // The array is a plain literal with no type syntax, so evaluating it is both
  // accurate and immune to reformatting - unlike converting it to JSON with
  // regexes. The input is a checked-in file in this repo.
  const songs = new Function(`return ${source.slice(start, end + 1)}`)();

  if (!Array.isArray(songs) || songs.length === 0) {
    throw new Error("Parsed no songs - the song list format has changed");
  }

  // A silent partial parse would report every song as fine, so check the shape
  // rather than trusting the count.
  const malformed = songs.find(
    (song) => typeof song?.youtubeId !== "string" || !song.youtubeId
  );

  if (malformed) {
    throw new Error(
      `Song entry has no youtubeId: ${JSON.stringify(malformed)}`
    );
  }

  return songs;
}

async function check(song) {
  const url =
    "https://www.youtube.com/oembed?format=json&url=" +
    encodeURIComponent(`https://www.youtube.com/watch?v=${song.youtubeId}`);

  for (let attempt = 0; attempt <= RETRIES; attempt += 1) {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: { "user-agent": "ba-heardle-link-check" },
      });

      if (response.ok) return null;

      // 5xx and rate limiting are about YouTube, not the video: retry.
      if (response.status >= 500 || response.status === 429) {
        if (attempt < RETRIES) {
          await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
          continue;
        }
        return null;
      }

      return { ...song, status: response.status };
    } catch (error) {
      if (attempt < RETRIES) {
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
        continue;
      }
      // A network failure is not evidence the video is gone.
      console.warn(`  ? ${song.themeNo} ${song.name}: ${error.message}`);
      return null;
    }
  }

  return null;
}

const songs = loadSongs();
console.log(`Checking ${songs.length} songs...`);

const broken = [];
const queue = [...songs];

await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    while (queue.length > 0) {
      const song = queue.shift();
      const failure = await check(song);
      if (failure) {
        broken.push(failure);
        console.log(
          `  DEAD ${failure.themeNo} ${failure.artist} - ${failure.name} (${failure.youtubeId}) [${failure.status}]`
        );
      }
    }
  })
);

if (broken.length === 0) {
  console.log("All songs resolve.");
  process.exit(0);
}

broken.sort((a, b) => Number(a.themeNo) - Number(b.themeNo));

const summary = broken
  .map(
    (s) =>
      `- Theme ${s.themeNo}: ${s.artist} - ${s.name} — https://youtu.be/${s.youtubeId} (HTTP ${s.status})`
  )
  .join("\n");

console.log(`\n${broken.length} unplayable song(s):\n${summary}`);

if (process.env.GITHUB_OUTPUT) {
  const { appendFileSync } = await import("node:fs");
  appendFileSync(
    process.env.GITHUB_OUTPUT,
    `count=${broken.length}\nsummary<<EOF\n${summary}\nEOF\n`
  );
}

process.exit(1);
