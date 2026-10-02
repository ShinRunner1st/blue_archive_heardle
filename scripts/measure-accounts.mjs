/**
 * What accounts cost on Cloudflare's free plan, measured (docs/accounts.md,
 * sections 6 and 10, step 6): a signed-in player's day played against the
 * accounts Worker, each request's D1 rows read and written as D1 itself
 * counts them, against the plan's estimates.
 *
 *   npm run accounts:measure          (in one terminal)
 *   node scripts/measure-accounts.mjs (in another)
 *
 * The Worker reports each answer's cost in X-D1-* headers only when run
 * with MEASURE on localhost; a deployed one never does. The rows are the
 * same queries a deployed Worker runs, on D1's own engine.
 */
import { gzipSync } from "node:zlib";

const WORKER = process.env.WORKER ?? "http://localhost:8788";
const SITE = "http://localhost:3100";
const RUN = Date.now().toString(36);

const rows = [];
let requests = 0;

// The Worker takes 60 calls a minute from one address (API_LIMIT): a
// minute's rest before going over, so no answer is the limit's 429.
let sinceRest = 0;
let restedAt = Date.now();
async function paced() {
  if (++sinceRest < 55) return;
  const wait = restedAt + 61_000 - Date.now();
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
  sinceRest = 1;
  restedAt = Date.now();
}

/** One request; its cost noted under `what`. */
async function call(what, method, path, { token, body, raw, extra } = {}) {
  await paced();
  const headers = { Origin: SITE, ...extra };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined && !raw) headers["Content-Type"] = "application/json";
  const response = await fetch(`${WORKER}${path}`, {
    method,
    headers,
    body: raw ?? (body === undefined ? undefined : JSON.stringify(body)),
    redirect: "manual",
  });
  requests += 1;
  const read = Number(response.headers.get("X-D1-Read") ?? NaN);
  if (Number.isNaN(read)) {
    throw new Error(
      "No X-D1 headers: run the Worker with `npm run accounts:measure`."
    );
  }
  rows.push({
    what,
    request: `${method} ${path.split("?")[0]}`,
    status: response.status,
    read,
    written: Number(response.headers.get("X-D1-Written")),
    queries: Number(response.headers.get("X-D1-Queries")),
    each: JSON.parse(response.headers.get("X-D1-Each") ?? "[]"),
  });
  return response;
}

/** A whole sign-in with the local stand-in: three requests. */
async function signIn(who, what) {
  const nonce = "abcdefghijklmnop1234";
  const start = await call(
    `${what}: start`,
    "GET",
    `/auth/google/start?${new URLSearchParams({
      nonce,
      back: `${SITE}/ost`,
    })}`
  );
  const state = new URL(start.headers.get("Location")).searchParams.get(
    "state"
  );
  const back = await call(
    `${what}: Google's answer`,
    "GET",
    `/auth/google/callback?${new URLSearchParams({
      state,
      code: `fake:${who}`,
    })}`
  );
  const code = new URLSearchParams(
    new URL(back.headers.get("Location")).hash.slice(1)
  ).get("auth");
  const session = await call(`${what}: session`, "POST", "/auth/session", {
    body: { code },
  });
  return (await session.json()).token;
}

/** A save as the page sends it: format 2, gzipped, about a keen player's. */
function save(rounds) {
  return gzipSync(
    JSON.stringify({
      app: "ba-heardle",
      version: 2,
      rounds: {
        endless: Array.from({ length: rounds }, (_, i) => ({
          id: (i * 7919).toString(16).padStart(12, "0"),
          at: 1790000000000 + i,
          solution: String((i % 340) + 1),
          currentTry: 1 + (i % 6),
          didGuess: i % 3 !== 0,
          guesses: [],
          startTime: 0,
        })),
      },
    })
  );
}

const MISSIONS = [
  "first-daily",
  "daily-7",
  "daily-14",
  "daily-30",
  "ost-first-try",
  "ost-100",
  "voice-50",
  "picture-50",
  "room-first",
  "room-win",
];

const profile = (missions) => ({
  name: "Shin",
  sensei: true,
  student: 10004,
  title: "dependable",
  banner: "sakura",
  frame: "gold",
  background: "cherry",
  cardColors: "schale",
  editedAt: Date.now(),
  summary: { roundsPlayed: 1000, songsGuessed: 300, server: "global" },
  ...(missions ? { missions } : {}),
});

// A new player's first sign-in, then the page joining their save.
const token = await signIn(`measure-${RUN}`, "Sign-in, new account");
await call("First open: account state", "GET", "/me/profile", { token });
await call("First open: progress up", "PUT", "/me/progress", {
  extra: { "X-Base": "0", "X-Format": "2" },
  token,
  raw: save(1000),
});
await call("First open: profile, missions", "PUT", "/me/profile", {
  token,
  body: profile(MISSIONS),
});

// A usual day: opening the site, three syncs, a room pass, a profile sync.
await call("Day: open the site", "GET", "/me/profile", { token });
for (let i = 1; i <= 3; i++) {
  await call(`Day: sync ${i}`, "PUT", "/me/progress", {
    extra: { "X-Base": String(i), "X-Format": "2" },
    token,
    raw: save(1000 + i * 10),
  });
}
await call("Day: summary changed", "PUT", "/me/profile", {
  token,
  body: profile(),
});
await call("Day: a new mission", "PUT", "/me/profile", {
  token,
  body: profile([...MISSIONS, "ost-all"]),
});
await call("Day: room pass", "GET", "/room-pass", { token });

// Another device wrote first: refused, downloaded, merged, sent again.
await call("Merge: refused (409)", "PUT", "/me/progress", {
  extra: { "X-Base": "1", "X-Format": "2" },
  token,
  raw: save(1005),
});
await call("Merge: download", "GET", "/me/progress", { token });
await call("Merge: merged up, backed up", "PUT", "/me/progress", {
  extra: { "X-Base": "4", "X-Format": "2", "X-Backup": "1" },
  token,
  raw: save(1040),
});

// Verified stats (docs/verified-stats.md, section 12): dailies started and
// finished, late, closed, room receipts and the record, over a week and a
// streak, on the Worker's clock set by X-Measure-Now (measuring only).
const DAY = 24 * 60 * 60_000;
const T0 = Date.UTC(
  new Date().getUTCFullYear(),
  new Date().getUTCMonth(),
  new Date().getUTCDate(),
  12
);
const at = (days) => ({ "X-Measure-Now": String(T0 + days * DAY) });
const verified = (what, days, body) =>
  call(what, "POST", "/verified", { token, body, extra: at(days) });
const answerOf = async (game, day) =>
  (await fetch(`${WORKER}/__measure/answer?game=${game}&day=${day}`)).json();
const zone = "UTC";

const refused = await verified("Verified: start, wrong day (409)", 0, {
  action: "start",
  game: "ost",
  day: 1,
  zone,
});
const day0 = (await refused.json()).day;
/** Starts a daily on its day; returns its attempt. */
async function startOn(what, days, game) {
  const response = await verified(what, days, {
    action: "start",
    game,
    day: day0 + days,
    zone,
  });
  const body = await response.json();
  // A start the measure meant to issue: anything else is worth seeing.
  if (!body.attempt && body.status !== "done") {
    throw new Error(`${what}: ${response.status} ${JSON.stringify(body)}`);
  }
  return body.attempt;
}
/** Wins an attempt, sent `days` in: its own day's answer, from its token. */
const winOn = async (what, days, game, attempt) =>
  verified(what, days, {
    action: "finish",
    attempt,
    guesses: [await answerOf(game, Number(attempt.split("~")[0]))],
  });

let attempt = await startOn("Verified: first start (sets zone)", 0, "ost");
await winOn("Verified: finish, won", 0, "ost", attempt);
await winOn("Verified: finish sent again", 0, "ost", attempt);
await startOn("Verified: start, played already", 0, "ost");
attempt = await startOn("Verified: start, another daily", 0, "voice.global");
await verified("Verified: finish, lost", 0, {
  action: "finish",
  attempt,
  guesses: [0, 0, 0, 0],
});
await call("Verified: record", "GET", "/verified", { token, extra: at(0) });

attempt = await startOn("Verified: day 2, start", 1, "ost");
await winOn("Verified: day 2, finish (streak 2)", 1, "ost", attempt);
await startOn("Verified: day 2, start, left open", 1, "lore.global");
attempt = await startOn("Verified: day 4, start (closes 1)", 3, "ost");
await winOn("Verified: day 4, finish", 3, "ost", attempt);
attempt = await startOn(
  "Verified: day 4, start, to finish late",
  3,
  "gameplay.global"
);
await winOn("Verified: day 5, late finish", 4, "gameplay.global", attempt);
attempt = await startOn("Verified: day 5, start", 4, "halo.global");
await verified("Verified: day 7, finish too late (409)", 6, {
  action: "finish",
  attempt,
  guesses: [0, 0, 0, 0],
});
await call("Verified: record after a week", "GET", "/verified", {
  token,
  extra: at(6),
});

await paced();
const { publicId } = await (
  await fetch(`${WORKER}/me`, {
    headers: { Origin: SITE, Authorization: `Bearer ${token}` },
  })
).json();
const receipt = await (
  await fetch(`${WORKER}/__measure/receipt?public=${publicId}&place=2`, {
    headers: at(6),
  })
).text();
await verified("Verified: room receipt", 6, { action: "room", receipt });
await verified("Verified: room receipt again", 6, { action: "room", receipt });
const theirs = await (
  await fetch(`${WORKER}/__measure/receipt?public=aaaaaaaaaaaaaaaa`, {
    headers: at(6),
  })
).text();
await verified("Verified: another's receipt (403)", 6, {
  action: "room",
  receipt: theirs,
});

// A 30-day streak, then what its last win and the record cost.
const quiet = rows.length;
const counted = requests;
for (let days = 7; days < 36; days++) {
  const each = await startOn("streak", days, "ost");
  await winOn("streak", days, "ost", each);
}
rows.splice(quiet);
requests = counted;
attempt = await startOn("Verified: day 37, start", 36, "ost");
await winOn("Verified: day 37, finish (streak 30)", 36, "ost", attempt);
await call("Verified: record, 30-day streak", "GET", "/verified", {
  token,
  extra: at(36),
});

// Signing in again on a second device, and the Account tab.
const second = await signIn(`measure-${RUN}`, "Sign-in, returning");
await call("Account tab", "GET", "/me", { token: second });
await call("Download my data", "GET", "/me/data", { token: second });
await call("Delete account", "DELETE", "/me", { token: second });

// The daily run, over every account in the local database.
const tidy = await fetch(`${WORKER}/__measure/tidy`, {
  headers: { Origin: SITE },
});
rows.push({
  what: "Daily run (cron), local database",
  request: "scheduled",
  status: tidy.status,
  read: Number(tidy.headers.get("X-D1-Read")),
  written: Number(tidy.headers.get("X-D1-Written")),
  queries: Number(tidy.headers.get("X-D1-Queries")),
});

const pad = (text, n) => String(text).padEnd(n);
console.log(
  `${pad("What", 36)}${pad("Request", 22)}${pad("Status", 8)}${pad(
    "Read",
    7
  )}${pad("Written", 9)}Queries`
);
for (const row of rows) {
  console.log(
    `${pad(row.what, 36)}${pad(row.request, 22)}${pad(row.status, 8)}${pad(
      row.read,
      7
    )}${pad(row.written, 9)}${row.queries}`
  );
}
console.log(`\n${requests} requests to the accounts Worker.`);
if (process.env.JSON) console.log(JSON.stringify(rows));
// Each query's own cost, for the requests named (EACH="Sign-in").
if (process.env.EACH) {
  for (const row of rows.filter(({ what }) =>
    what.includes(process.env.EACH)
  )) {
    console.log(`
${row.what} (${row.request}): read ${row.read}, written ${row.written}`);
    for (const query of row.each ?? []) {
      console.log(
        `  read ${query.read}, written ${query.written}: ${query.sql}`
      );
    }
  }
}
