# Accounts: the plan

Status: **approved by the user** (2026-10-02), with the four open
decisions settled (see the end). Step 0 (save format 2) is being built;
nothing else is, until the user approves the next step. Once approved, it is built in the order at the end, each step on its
own stacked branch, and nothing is public until the privacy policy and
account deletion are in. The release held since main 4a460a1 waits for it.

What the user decided (2026-10-02):

- Sign in with **Google** or **Discord**; one account can have both.
- The account keeps the **profile, cosmetics and progress** (statistics,
  missions, achievements). Settings and local preferences stay in the
  browser.
- In rooms, a signed-in player shows their **profile and cosmetics**. No
  levels until there is a concrete progression design.
- **Guests** play rooms as now, with a name and a picture. The difference
  is that nothing of theirs is kept online; they must never feel like
  second-class players. _Changed 2026-10-03 (Guest limits in
  `docs/plan.md`): guests clear only starter missions, an account starts
  fresh, and the save file is gone._
- **D1** keeps accounts and progress; **Durable Objects** keep only live
  rooms, never anything permanent. D1 reads and writes are measured before
  anything more is stored.
- The **privacy policy** and **account deletion** come before accounts are
  open to anyone.

## 1. Where everything lives

```
Browser (localStorage)
├── settings and preferences: volume, dark mode, cursor and its colour,
│   character, server, Quick answer, room presets, jukebox
├── a guest's whole progress, kept for good as today (not temporary)
├── a signed-in player's copy of their account's progress, so the game
│   works offline and loads without waiting
└── the session token

Cloudflare D1 (the accounts Worker)
├── accounts, and the Google / Discord identities linked to each
├── sessions (only a hash of each token)
├── profile: name, "Sensei" switch, favourite student, cosmetics picked,
│   and a summary of the record for others to see
├── progress: the save, compressed, one row per account
└── missions cleared, one row per mission, with when

Durable Objects (the rooms, nothing permanent)
├── the room, its settings and the players connected
├── answers and scores, while the game lasts
├── each player as shown: a guest's name and picture, or a signed-in
│   player's pass (section 7)
└── chat later, kept only while the room is open
```

Changes from the first sketch:

- **A guest's progress is not temporary.** Today every player keeps
  everything in their browser for good, and a guest still does. Only a
  guest's room identity (name and picture) is for the room alone.
- **Statistics are not stored as tables.** Every statistic, badge and
  mission is worked out from the rounds, in the browser, as the profile
  does now. D1 keeps the rounds (the save), which is authoritative, and a
  small summary worked out from it, as a cache (section 3).
- **No cookies, and no Google or Discord script on our pages.** Signing in
  is a redirect to their page and back. The session is a token in
  localStorage, sent with each request. The page check keeps failing on
  any cookie.

## 2. Signing in: Google, Discord, one account

**The accounts Worker**, `ba-heardle-accounts` (`accounts-worker/`), holds
the D1 database `ba-heardle-accounts`. It serves at **`api.baheardle.com`**,
a Custom Domain like the site's. Google asks for its sign-in addresses to
be on a domain verified in Search Console, and baheardle.com already is; a
workers.dev address can't be verified. It has no workers.dev address at all
(`workers_dev: false`), so sign-ins, and scanners, have one way in.

**Which pages it takes:** a deployed Worker lets only the site's own pages
call it, and sends a sign-in back only to them (`SITE_ORIGINS` in
`src/accounts/api.ts`: baheardle.com, its test address and its preview).
A local dev server's (`http://localhost:<port>`) are let in only by
`npm run accounts` (its `LOCAL_DEV`, honoured on localhost only), as a
page anywhere else could be handed a sign-in's one-time code.

**Scopes:** Google's `openid` only (its `sub`, a number for the person),
and Discord's `identify` (its user id). We keep only those ids: no email,
no provider name or avatar. The name on the card is the one the player
types, as now.

**The flow** (no cookies on either side):

1. The page makes a random `nonce`, keeps it in sessionStorage, and goes to
   `api.baheardle.com/auth/<google|discord>/start?nonce=…&back=/ost`.
2. The Worker sends the browser on to Google or Discord, with a `state`
   it signs (HMAC): the nonce, the page to come back to, a time limit of
   10 minutes, and, for linking, the account to link to.
3. Google or Discord sends the browser back to
   `api.baheardle.com/auth/<provider>/callback`. The Worker checks the
   `state`, swaps the code for the provider's user id (one fetch, with the
   client secret kept as a Worker secret), and throws the provider's
   tokens away.
4. It finds the identity, or makes an account for a new one, and a
   one-time code good for 60 seconds. It sends the browser back to the
   page with the code and the nonce in the address's `#` part, which
   never reaches a server or a Referer.
5. The page checks the nonce is its own (so nobody can sign a player in
   to someone else's account), sends the code to
   `POST /auth/session`, and gets the session token.

**Sessions:** a 32-byte random token. D1 keeps its SHA-256 only. A session
lasts 90 days from its last use, pushed back at most once a day, so a
request writes nothing. Sign out deletes it.

**The session token is a credential**, as good as the account to whoever
holds it. So, without exception:

- It travels only in the `Authorization: Bearer` header of a request to
  `api.baheardle.com`, over HTTPS. **Never in an address** (no query
  string, no `#` part; the one-time sign-in code is what goes in the `#`,
  and it is spent within 60 seconds), never in a form field, a share text,
  a save file or a room message.
- It is **never logged**: the Worker logs no headers, no request bodies
  from `/auth/*`, and no tokens or codes; errors name what failed, not
  what was sent. Workers Logs and `console` calls are checked for it in
  review.
- It is **never in the page**: not in the DOM, an attribute, a title or
  anything a screenshot or the page check could pick up; the settings show
  only "Signed in with Google".
- It sits in localStorage, where any script on our origin could read it.
  So the site stays as it is: **a strict Content-Security-Policy, only the
  build's own scripts, and no outside script, ever** (no analytics, no
  provider SDKs, no widgets). The page check already fails on any script
  not from the build, and keeps doing so.
- The save file, the "Download my data" file and the room pass never
  include it. Signing out, deleting the account, or the server finding it
  expired removes it from localStorage at once.

**One account, more identities:**

- **Link:** a signed-in player presses "Link Discord" (or Google). The
  page asks `POST /auth/link` for a link ticket (60 seconds), and the
  flow above carries it in `state`; the callback adds the identity to
  that account.
- **Already used:** if that Discord or Google is on another account, it
  isn't moved. The page says so; merging two accounts can come later.
- **Unlink:** allowed while another identity is left, so nobody locks
  themselves out.
- **New identity, no account:** signing in makes a new account. Before
  that, the page says "Already have an account with the other one? Sign in
  with it and link this one."

**Account ids** are 128 random bits (base32), never a running number, so
none can be guessed. Other players see a separate public id,
for profiles later, so the account id never leaves the account.

## 3. The data: tables, and why so few

D1 counts a row written for every row and every index entry an `INSERT`,
`UPDATE` or `DELETE` touches. The free plan's tightest limit is 100,000 a
day (section 6). So the tables are shaped for few writes:

- **Progress is one row**, the whole save, gzipped by the browser
  (`CompressionStream`). Writing it costs one row whatever its size. The
  Worker never opens it, so it stays far inside the free plan's 10 ms of
  CPU a request; it only checks the size (1 MB at most; D1's limit is 2 MB a
  row) and the format (below).
- **Statistics are worked out, not stored.** The profile, badges, missions
  and Sensei card already come from the rounds. Storing each number would
  cost writes after every round, for numbers the browser has.
- **The progress (the save) is the source of truth.** `profiles.summary`
  (the overview's totals as JSON) is a **denormalized cache** of it, kept
  only so other players can see a profile without the save. It is never
  read back into progress, never merged, and never trusted over the save:
  the page rebuilds it from the save on every sync, and if it is missing,
  stale or from an older format it is simply rebuilt. Losing it loses
  nothing.
- **Missions cleared are rows**, because they are few (39 now, never more
  than one write each per account) and the room pass (section 7) and a
  profile need them without the save.

```sql
-- accounts-worker/migrations/0001_accounts.sql
CREATE TABLE accounts (
  id TEXT PRIMARY KEY,           -- 128 random bits, base32
  public_id TEXT NOT NULL UNIQUE, -- what other players see
  created_at INTEGER NOT NULL,   -- ms since 1970
  seen_day INTEGER NOT NULL      -- day number last used, once a day at most
) STRICT;

CREATE TABLE identities (
  provider TEXT NOT NULL CHECK (provider IN ('google', 'discord')),
  subject TEXT NOT NULL,         -- Google's sub, Discord's user id
  account_id TEXT NOT NULL REFERENCES accounts (id) ON DELETE CASCADE,
  linked_at INTEGER NOT NULL,
  PRIMARY KEY (provider, subject)
) STRICT;
CREATE INDEX identities_account ON identities (account_id);

CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,   -- SHA-256; the token is never kept
  account_id TEXT NOT NULL REFERENCES accounts (id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL    -- pushed back at most once a day
) STRICT;
CREATE INDEX sessions_account ON sessions (account_id);

CREATE TABLE profiles (
  account_id TEXT PRIMARY KEY REFERENCES accounts (id) ON DELETE CASCADE,
  name TEXT NOT NULL,            -- cleaned as room names are (cleanName)
  sensei INTEGER NOT NULL,       -- "Sensei" after the name
  student INTEGER,               -- favourite student; null for the letter
  title TEXT NOT NULL,           -- cosmetics.json ids
  banner TEXT NOT NULL,
  frame TEXT NOT NULL,
  background TEXT NOT NULL,
  card_colors TEXT NOT NULL,
  summary TEXT NOT NULL,         -- JSON cache of the overview's totals,
                                 -- rebuilt from progress; never authoritative
  updated_at INTEGER NOT NULL
) STRICT;

CREATE TABLE progress (
  account_id TEXT PRIMARY KEY REFERENCES accounts (id) ON DELETE CASCADE,
  format INTEGER NOT NULL,       -- the save format; never goes down
  revision INTEGER NOT NULL,     -- one more on each write
  data BLOB NOT NULL,            -- the save's JSON, gzipped
  updated_at INTEGER NOT NULL
) STRICT;

-- The account's progress as it was before the last merge (section 5).
CREATE TABLE progress_backups (
  account_id TEXT PRIMARY KEY REFERENCES accounts (id) ON DELETE CASCADE,
  format INTEGER NOT NULL,
  revision INTEGER NOT NULL,
  data BLOB NOT NULL,
  saved_at INTEGER NOT NULL
) STRICT;

CREATE TABLE missions_cleared (
  account_id TEXT NOT NULL REFERENCES accounts (id) ON DELETE CASCADE,
  mission TEXT NOT NULL,         -- missions.json id, never renamed
  cleared_at INTEGER NOT NULL,
  PRIMARY KEY (account_id, mission)
) STRICT, WITHOUT ROWID;
```

The settings that stay in the browser (cursor colour, character, volume
and the like) have no table. The cursor colour and character are
unlocked by missions but are how the player's own screen looks, not what
others see.

**Changing the tables later:** numbered migrations in
`accounts-worker/migrations/`, applied by `wrangler d1 migrations apply`
in CI before the Worker deploys. Only adding: a new table or a new column
with a default. Removing or renaming waits for a later release, once no
deployed code reads it. Before each migration on production, CI notes a
Time Travel bookmark (D1 keeps 7 days of history on the free plan), so it
can be undone.

## 4. Missions, achievements and the save format, over time

**Mission and cosmetic ids are forever.** This is already the rule (saves
keep them); with accounts it matters more, as D1 keeps them too.

- **Changing what a mission asks** gives it a **new id**. The old one is
  marked `"retired": true` in `missions.json`, not removed.
- **A retired mission** can't be cleared any more and isn't listed as one
  to do. Players who cleared it see it under "Retired", and what it
  unlocked stays theirs. A new player can't get that cosmetic, unless a
  new mission unlocks it too.
- **A cosmetic** works the same way: retired, never deleted, still worn by
  anyone who has it.
- **Nothing is deleted from the content files.** `content.test.ts` checks
  every id against a committed list of every id ever shipped
  (`src/content/ids.lock.json`), so a removal or rename fails CI.
- **Ids a page doesn't know** (from a newer page on another device) are
  kept when saves merge, never dropped.

**The save format** gets a number that only goes up. Today's save file is
format 1. **Format 2** comes first (step 0 in section 10), before any
account:

- Every round gets an **id** (random, 6 bytes: it only has to differ
  within its own list) and the time it was dealt, so two copies of the
  same progress merge without doubling or losing a round.
- **Smaller**: an OST round keeps the song's theme number, not the whole
  song (name, artist and so on are 240 bytes of a round now).
- **Room games** become a list (an id, when, and whether it was won), not
  two counts, so two devices' games add up instead of overwriting.
- Format 1 still reads: the page converts it, and the rounds' ids are made
  from their contents and order, so the same rounds convert to the same
  ids on every device.

**An old page and a newer save:** the Worker refuses a write with a lower
format than the one stored (409). The page then asks the player to reload,
rather than overwriting what it can't read.

## 5. Moving today's saves to an account, without losing anything

**Before anything happens**, on the first sign-in in a browser:

1. The page keeps a copy of its whole save under a backup key
   (`backup.beforeAccount`) and offers it as a save-file download.
2. The account's copy, if it has one, goes to `progress_backups` before
   it changes.

Then, by what each side has:

| This browser | The account | What happens                                       |
| ------------ | ----------- | -------------------------------------------------- |
| progress     | nothing     | The browser's progress becomes the account's.      |
| nothing      | progress    | The account's comes to this browser.               |
| progress     | progress    | Merged (below), after the player sees both counts. |
| nothing      | nothing     | Nothing to do.                                     |

**The merge** (also used when two devices sync):

- **Rounds:** every round from both, joined by id. The same round on both
  sides is kept once.
- **Daily puzzles:** one per day for each game and mode. If both sides
  played the same day, the finished one stays; if both finished, the
  earlier one. The other stays in the backups, not lost.
- **Missions:** everything cleared on either side, with the earliest
  date.
- **Room games:** both lists, joined by id.
- **Unknown fields and ids** from a newer page: kept.

After it, the browser's save **is** the account's copy, kept in the same
localStorage keys as today, so the games read it as they always have and
work offline.

_Changed 2026-10-03 (Guest limits in `docs/plan.md`): signing in no
longer merges the browser's guest progress; it's deleted and the
account's loaded. Signing out always clears the browser, and the save
file below is gone. What follows is how it was built first._

**Signing out** asks each time, keeping it by default: keep this progress in this browser (it plays on as a
guest, and a later sign-in merges again, without doubling, thanks to the
ids), or clear it from this browser (for a shared computer). It stays in
the account either way.

**The save file** (Settings) stays. Importing one while signed in merges
it into the account, the same way.

## 6. Syncing, and what it costs on the free plan

**When the page syncs:**

- **On load:** `GET /me` (the profile, and the progress's revision). The
  save only downloads if the revision is newer than this browser's.
- **After play:** at most once every 5 minutes while rounds are played,
  and when the page is hidden (`fetch` with `keepalive`, which carries
  the session header; past its 64 KB limit, the 5-minute sync covers it).
  Only if the save changed since it was last sent: a hidden tab with
  nothing new sends nothing (step 6).
- **A write names the revision it built on** (in `X-Base`, so the
  upload's address and its CORS preflight stay the same; step 6), and
  goes straight up without reading the account first. If another device wrote
  meanwhile, the Worker answers 409 with its copy; the page merges
  (section 5) and sends again.

**The free plan's limits** (Cloudflare, checked again before building).
These are **separate quotas**, each counted on its own; using one doesn't
use another:

| Quota                       | Free plan, a day               | Used by                                                                                              |
| --------------------------- | ------------------------------ | ---------------------------------------------------------------------------------------------------- |
| **Worker requests**         | 100,000, all our Workers' code | the accounts Worker (every call), and the rooms Worker (one per connection, the WebSocket's upgrade) |
| **Durable Object requests** | 100,000                        | the rooms only: each connection, and incoming messages (20 to a request)                             |
| Durable Object rows written | 100,000                        | the rooms only (their SQLite storage)                                                                |
| **D1 rows read**            | 5,000,000                      | the accounts Worker only                                                                             |
| **D1 rows written**         | 100,000 (index entries count)  | the accounts Worker only                                                                             |
| D1 storage                  | 500 MB a database, 5 GB in all | the accounts Worker only (up to 10 databases)                                                        |
| Static file requests        | free, no limit                 | the site, the audio and pictures, Now in Global (no code runs)                                       |

Per request, also: 10 ms of CPU (the accounts Worker never opens a save),
and 2 MB a D1 row (we stop a save at 1 MB).

So the **only quota the accounts and the rooms share is Worker requests**,
and the rooms use few of those: one per connection, about 8 to 10 for an
8-player game, reconnects included. Their messages, the 50 to 75 requests
a game in `docs/multiplayer.md`, are **Durable Object** requests, a quota
the accounts never touch. D1 and the rooms' storage are separate too.
Confirmed on Cloudflare (below): a 2-player game's two connections were
two rooms Worker requests, and the rooms Worker made no D1 call.

Past a limit, Cloudflare refuses, never bills, and it resets at 00:00 UTC.
**Every quota is a UTC day**, so a day's use is added up from 00:00 to
24:00 UTC: `wrangler d1 info`'s `*_24h` figures are a rolling 24 hours,
and the dashboard shows whatever range is picked, so neither is a quota
day unless it's set to one.
The page then plays on from its own copy and syncs the next day; nothing
depends on the Worker being there.

**How it was measured** (2026-10-02, step 6), two ways:

1. **Locally**, the real Worker on D1's local engine (workerd), which
   reports each query's rows in its `meta`: `npm run accounts:measure`,
   then `node scripts/measure-accounts.mjs` (`EACH=Sign-in` prints every
   query), and a production build in Chrome counting every request the
   Worker answered.
2. **On Cloudflare**, on the preview (the accounts Worker at its
   workers.dev address, its own D1 database, the preview's own rooms),
   with the user signing in and playing through each case in turn in
   Chrome, while:

   - D1's own analytics were read **per minute** (the same figures as
     the dashboard and `wrangler d1 info`), so each case's rows are its
     minutes' rows;
   - the Workers' invocations were read per minute and version, and the
     Durable Objects' by event type;
   - `wrangler tail` noted each request's time, method, path and status
     only (no headers, no query), to say which requests made each
     minute. It's best-effort: it dropped 1 of about 95, and wasn't
     running for an hour;
   - the zone's analytics gave the paths that reached `api.baheardle.com`.

   `wrangler d1 insights` was left out: its per-statement figures missed
   whole statements and counted more runs than were made, so it only
   shows which statements ran, not how many rows.

**1. Each request's D1 cost, locally.** A save of 1,000 rounds, 10 to 11
missions:

| What                                    | Requests | Rows read                                       | Rows written                            |
| --------------------------------------- | -------- | ----------------------------------------------- | --------------------------------------- |
| Opening the site (`GET /me/profile`)    | 1        | 2-4                                             | 0 (+0-2 once a day: last used, session) |
| A sync (`PUT /me/progress`)             | 1        | 4                                               | 1                                       |
| The summary changed (`PUT /me/profile`) | 1        | 4                                               | 1                                       |
| A new mission with it                   | 1        | 15                                              | 2                                       |
| A room pass (`GET /room-pass`)          | 1        | 16 (about 44 with all 39 missions)              | 0                                       |
| A merge: 409, download, merged up       | 3        | 11                                              | 3                                       |
| Signing in, a new account               | 3        | 4                                               | 12                                      |
| Signing in, returning                   | 3        | 5                                               | 6 (7 on a new day)                      |
| First sync of a new account's profile   | 1        | 3                                               | 12 (one per mission, once)              |
| Download my data                        | 1        | 37                                              | 0                                       |
| Delete account                          | 1        | 41                                              | 18                                      |
| The daily run                           | 0        | about one per account, session and sign-in code | the deletions                           |

**2. The same on Cloudflare** (the preview, 2026-10-02, UTC). Requests
include CORS preflights; the accounts were new, with a save of a few
rounds and one or two missions, so the costs that grow with missions
(the room pass, a mission's write, the download and the delete) were at
their small end:

| Case (minutes, UTC)                                                                                               | Requests (preflights) | Rows read | Rows written | Against table 1                                                 |
| ----------------------------------------------------------------------------------------------------------------- | --------------------- | --------- | ------------ | --------------------------------------------------------------- |
| A. Two new accounts (Discord, then Google after a sign-out), each with its first upload and profile (23:13-23:14) | 24 (5)                | 53        | 33           | 12 + 2 + 2 each, and 1 for the sign-out: 33                     |
| B. A returning Discord sign-in, that account deleted, a returning Google sign-in, Discord linked (23:23-23:24)    | 24 (1)                | 81        | 23           | 6 each returning; the link's identity 3; the small delete 5     |
| C. Two openings, three tab switches with nothing played (23:29)                                                   | 2 (0)                 | 8         | 0            | 4 an opening; **0 requests** for the switches                   |
| D. A sync after two rounds, then a profile change with a mission cleared (23:34-23:35)                            | 3 (0)                 | 12        | 3            | the sync 4 and 1; the profile 1 and the mission 1               |
| E. A second browser's returning sign-in and sync, then this one's upload refused (409) and merged (23:40-23:42)   | 21 (6)                | 58        | 14           | the merge alone: 4 requests and a preflight, 17 read, 3 written |
| F. The page's state and a room pass, then a 2-player game of 5 rounds (23:46-23:48)                               | 7 (3)                 | 16        | 1            | the room pass 0 written; the rooms no D1 at all                 |
| G. The Account tab, Download my data, Delete account (00:54)                                                      | 5 (2)                 | 51        | 11           | under the full account's 37 + 41 read and 18 written            |
| A signed-in tab's first requests of a new UTC day (00:53, not itemised: the tail wasn't running)                  | 7                     | 21        | 5            | includes the day's "last used" write                            |

Every case is at or under table 1, and the writes match it row for row
where they can be told apart. The rooms side of F, from the Durable
Objects' own figures: **2 rooms Worker requests** (one per connection),
and **49 Durable Object invocations**, 2 connections and 47 hibernation
events (45 messages and 2 closes). The quota counts incoming messages 20
to a request (Cloudflare's pricing page), so that's about **4-6 Durable
Object requests** (closes aren't documented either way, so they're
counted); the dashboard shows only the 49 raw invocations, so the 20 to 1
is documented, not measured. `docs/multiplayer.md` already counts that
way.

**Signing in's writes, statement by statement.** D1 counts a row written
for the row and one for each index entry the statement adds; every table
here is an ordinary (rowid) table, so a `TEXT` or composite primary key
is an index of its own (`sqlite_autoindex_…`), as is each `UNIQUE` and
each `CREATE INDEX`. Measured, per statement:

| Request                    | Statement                                         | Logical writes                                               | Rows written (measured) |
| -------------------------- | ------------------------------------------------- | ------------------------------------------------------------ | ----------------------- |
| Google's answer, new       | `SELECT … FROM identities` (none yet)             | -                                                            | 0                       |
|                            | `INSERT INTO accounts`                            | the row, its `id` key, `public_id` UNIQUE                    | 3                       |
|                            | `INSERT INTO identities`                          | the row, its `(provider, subject)` key, `identities_account` | 3                       |
|                            | `DELETE FROM sign_in_codes WHERE expires_at < ?`  | none expired                                                 | 0                       |
|                            | `INSERT INTO sign_in_codes`                       | the row, its `code_hash` key                                 | 2                       |
| The session                | `DELETE FROM sign_in_codes … RETURNING`           | the code's row                                               | 1                       |
|                            | `INSERT INTO sessions`                            | the row, its `token_hash` key, `sessions_account`            | 3                       |
|                            | `UPDATE accounts SET seen_day … AND seen_day < ?` | none the same day; 1 on a later day                          | 0 (1)                   |
| **New account**            |                                                   |                                                              | **8 + 4 = 12**          |
| Google's answer, returning | `SELECT`, then the code's `DELETE` and `INSERT`   | the code's row and key                                       | 0 + 0 + 2               |
| The session                | as above                                          |                                                              | 1 + 3 + 0 (or 1)        |
| **Returning**              |                                                   |                                                              | **2 + 4 = 6 (7)**       |

The plan's 3-5 counted rows, not index entries. So the real cost is **12
for a new account and 6 (7 on a new day) for a returning one**, locally
and on Cloudflare (A and B above). (Making `sessions` and `sign_in_codes`
`WITHOUT ROWID` would drop their key entries, 12 to 10 and 6 to 4; it
needs a rebuilt table, so it isn't worth a migration now.)

**3. What a browser sends**, in requests, preflights included. First as
built in step 3 (locally), then with the cheaper sync (below), built in
step 6, locally and on the preview:

| What the player does                     | Step 3            | Now, locally      | Now, on Cloudflare                                      | Why, now                                                                                     |
| ---------------------------------------- | ----------------- | ----------------- | ------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Signs in (new account, Account tab open) | 12 (4 preflights) | 12 (4 preflights) | 12 (4 preflights); 8 with the preflights already kept   | the two redirects, the session, the account's state, the first upload and profile, `GET /me` |
| Signs in, returning                      | -                 | -                 | 8, or 12 with its 4 preflights                          | the same, with the save downloaded in place of the first upload                              |
| Opens the site                           | 1, or 2           | 1, or 2           | 1 (the preflight kept)                                  | the account's state; its preflight once the browser no longer keeps it                       |
| Switches tab, nothing played             | 1                 | **0**             | **0**                                                   | nothing changed since the last upload, so nothing is sent                                    |
| A sync with something to send            | 3 (1 preflight)   | **1**             | **1**                                                   | the upload alone; its address is fixed, so its preflight is reused                           |
| Opens Multiplayer                        | 3 (1 preflight)   | 3 (1 preflight)   | 2 (1 preflight), with the state read as the page opened | the room pass and its preflight                                                              |
| Another device wrote first (rare)        | 3 + preflight     | 4                 | 4, and a preflight                                      | the upload refused (409), the state, the download, the merged upload                         |
| Links a second provider                  | -                 | -                 | 6 (1 preflight)                                         | the link ticket, the two redirects, the state, `GET /me`                                     |

**Preflights.** The Worker answers a preflight with
`Access-Control-Max-Age: 7200`, two hours, browsers' cap, so a page asks
once per address, not each call; every request, the check included,
counts against the free plan. Measured on the preview in Chrome 154 (headless, a dummy
token, each preflight counted at the Worker): one preflight per address,
then none for repeated calls, a plain reload, a hard reload, a new tab,
`keepalive` uploads, an upload from a hidden tab, and calls 5 and 15
minutes after the first. **Whether it's still reused after 30 minutes or
more was not observed** (the test was stopped first). In the user's own
Chrome, the session's 86 requests had 17 preflights: 12 were an
address's first in that browser, and 5 repeated an address the same
window had asked about under two hours before (4 to 101 minutes
earlier). Their cause wasn't found: the page's requests and the Worker's
answers were the same each time, and none of the cases tried repeats
them, so they're taken as the browser not keeping its own cache, not as
something the page does. The usual day below counts a preflight for the
opening, the uploads and the room pass, 3 of its 10 requests; the
session's share was 20%.

**The cheaper sync** (step 6, the user's go-ahead), `progressSync.ts`:
once this browser is joined and nothing waits to be merged, a sync with
no state read as the page opened (the 5-minute timer, a hidden tab, a
sign-out's save) sends nothing if the save hasn't changed since it was
last sent, and otherwise sends it straight up on the revision it last
matched, without reading the account first. A stale revision is refused
(409), and the next try reads the state, downloads, merges and backs up
as before; a newer format is still refused, and every request still
needs the session. The upload's `base`, `format` and `backup` moved from
the address to `X-Base`, `X-Format` and `X-Backup` (the Worker still
takes the address's, from older pages). The page opening still reads
the state, so it still takes in another device's writes. One thing it
no longer notices between openings: another device's write while this
tab sends nothing; it's taken in as the page next opens, as a merge
already was.

**A usual signed-in day**: opening the site, 3 syncs with play, any
number of tab switches, a summary change, a Multiplayer visit. Each part
is measured; how often a player does each is a guess.

| Part                         | Worker requests | D1 rows read                  | D1 rows written            |
| ---------------------------- | --------------- | ----------------------------- | -------------------------- |
| Opening, with its preflight  | 2               | 2-4 (4 on Cloudflare)         | 0, or 1-2 on a new UTC day |
| 3 syncs, and one preflight   | 4               | 12                            | 3                          |
| Tab switches, nothing played | 0               | 0                             | 0                          |
| A summary change             | 1               | 4 (15 with a new mission)     | 1 (2 with a new mission)   |
| A Multiplayer visit          | 3               | the room pass: 16 to about 44 | 0                          |
| **The day**                  | **about 10**    | **35-64, measured range**     | **4-8, measured range**    |
| **For planning**             | **10**          | **50, the range's middle**    | **6, the range's middle**  |

The ranges are measured: each part's cost is measured, and the day is
their sum. Reads: 35 at the low end (an account of 10 missions, the
opening's smaller read) to 64 (all 39 missions in the room pass); a day
that clears a mission reads about 11 more. Writes: 4 (the same UTC day,
no mission) to 8 (a new UTC day's 2 and two new missions). The preview's
new accounts, with one or two missions, read less, as their room pass
was small. The planning values are the ranges' middles, a choice for the
sums below, not a measurement.

**Exceptional flows**, counted apart from the usual day, as how often
they happen is unknown. The daily cleanup's first run on Cloudflare
(2026-10-02, 04:23:55 UTC) succeeded in 2.9 ms of CPU, but shared its
minute with other reads, so its statements were then run again by hand
on the production database, each giving its own count: 1 row read
each, 0 written, with nothing expired. All three are full scans (the
query plan says `SCAN`; `expires_at` and `seen_day` have no index, as
an index costs a write), so a run reads a row for every session,
sign-in code and account there is. The Account tab's figure is from
production the same day: 415 rows for 64 openings in one minute, when
switching between the profile's tabs read the account at every visit
(it's read once while the profile is open since).

| Flow                             | Worker requests                                                           | D1 rows read                              | D1 rows written                                             |
| -------------------------------- | ------------------------------------------------------------------------- | ----------------------------------------- | ----------------------------------------------------------- |
| Signing in, a new account        | 12 (8 with preflights kept)                                               | 4, and its first sync                     | **12**, and 12 for a first profile's missions (once)        |
| Signing in, returning            | 8 (12 with its preflights)                                                | 5                                         | **6** (7 on a new UTC day)                                  |
| A conflict: 409, download, merge | 4, a preflight, and 1 more as the page next opens (it takes the merge in) | 11-17, and 1-2 then                       | 3 (the merged save and its backup)                          |
| A room pass                      | 1, and a preflight once                                                   | 16 to about 44                            | 0                                                           |
| Linking a second provider        | 6 (1 preflight)                                                           | a few                                     | 3                                                           |
| Download my data                 | 1, and a preflight                                                        | up to 37                                  | 0                                                           |
| Delete account                   | 1                                                                         | up to 41                                  | up to 18                                                    |
| Opening the Account tab          | 1 (once while the profile is open)                                        | about 6.5                                 | 0                                                           |
| The daily cleanup (04:23 UTC)    | 1 scheduled run                                                           | 1 a row in the 3 tables (3 on 2026-10-02) | 0 with nothing expired; a deletion's own when something has |

**Traffic nobody asked for.** Taken from the same Worker-request quota,
and counted on its own line: scanners. Within minutes of
`api.baheardle.com` getting its certificate (which goes into the public
certificate logs scanners read), and through the workers.dev address
too (turned off since), about **180 requests in the first 2.5 hours** asked for `/.env`,
`/.git/config`, `/config.json`, `/CLAUDE.md`, `/AGENTS.md`, `setup.php`
and the like, from the Netherlands, Germany and the US. Each got a 404
and cost D1 nothing, but each was a Worker request (10 more were
redirected or answered by Cloudflare itself and never reached it). How
many come in a usual day once the address is older is **not yet
measured**; the dashboard's invocations, all versions, are the figure to
watch after the release.

**The Worker-request quota, in theory.** This is a theoretical
calculation from these measurements, **not a production capacity**: it
holds only if nothing else used the quota, and how often players open
the site or play is a guess.

- Quota: **100,000 Worker requests a UTC day**, for all our Workers' code
  together (the accounts and the rooms Workers; the site, audio, pictures
  and Now in Global are static files and don't count).
- Used: **R × N + rooms + exceptional flows + unsolicited traffic**, R
  the requests of a signed-in player's usual day (10 for planning; more
  for a player who opens the site more often, each opening 1-2), N the
  signed-in players that day.
- Headroom: **100,000 - all of it**.

| Signed-in players a day (N) | R × N at R = 10 | Left of 100,000, before the other lines | At R = 25 (step 3's sync) |
| --------------------------- | --------------- | --------------------------------------- | ------------------------- |
| 1,000                       | 10,000          | 90,000                                  | 25,000 used               |
| 2,000                       | 20,000          | 80,000                                  | 50,000 used               |
| 5,000                       | 50,000          | 50,000                                  | over the quota            |
| 10,000                      | 100,000         | 0: the ceiling, with nothing else       | over the quota            |

The other lines, from the same 100,000:

- **the rooms Worker:** one request per connection, reconnects included,
  for guests and signed-in players alike (about 8-10 for an 8-player
  game, so a busy day of 1,000 games is about 10,000);
- **exceptional flows** (above): sign-ins, conflicts, links, the Account
  tab, downloads and deletions, the daily cleanup;
- **unsolicited traffic** (above): scanners, at a daily rate not yet
  measured;
- **more openings** of the site than assumed, 1-2 requests each.

Guests cost the accounts Worker nothing: they never call it (confirmed
on Cloudflare: the page check's visit to every page of the preview made
no accounts request). They cost the Worker-request quota only through
the rooms.

So the earlier "about 16,000 signed-in players a day" from 6 requests
was wrong in two ways: it counted API calls only, and it read a
theoretical ceiling as a capacity. With step 3's sync the ceiling was
about 4,000; **with the cheaper sync it is about 10,000 signed-in
players a day, theoretically, before the rooms, the exceptional flows
and the unsolicited traffic take their share** - a calculation, not a
production capacity.

**The other quotas, in theory**, with the planning values and the same
caveat:

- **D1 writes:** 100,000 ÷ 6 = about **16,000** usual days, before
  sign-ins (12 or 6-7 each) and the other flows.
- **D1 reads:** 5,000,000 ÷ 50 = about **100,000** usual days; far
  inside.
- **D1 storage:** the developer save (every song, every mode on both
  servers, about 4,300 rounds) is **66 KB gzipped in format 2**, against
  505 KB as a save file (measured 2026-10-02). Without ids it would be
  25 KB: the ids are most of it, about 9 bytes a round, as random digits
  don't compress; the theme numbers in place of whole songs saved a fifth
  of the rest. A keen player of 1,000 rounds is about 15 KB, so 500 MB
  holds about **25,000 to 30,000 accounts**; a second database, or Workers
  Paid ($5 a month, 10 GB a database), comes after that. Measured again on
  real saves before it opens.
- **Durable Object requests:** unchanged by accounts; still the rooms'
  own limit, as in `docs/multiplayer.md`.

**Rate limits:** as for the rooms, the Worker's rate-limit binding, per
address (hashed): 10 sign-ins and 60 other calls a minute.

## 7. Profiles and cosmetics in rooms

**A signed-in player's pass:** when `/multiplayer` opens, the page asks
`GET /room-pass` for a pass, signed with a key the accounts and rooms
Workers share (`ROOM_PASS_KEY`, HMAC-SHA-256). It holds the public id, the
name, the favourite student, the cosmetics picked (only ones the account's
missions unlock), and a time limit of 12 hours. The page sends it with
`join`, and the room checks the signature, with no call to D1. The room
shows what the pass says, so nobody can wear what their account hasn't
unlocked by editing a message. `PROTOCOL` goes up.

**A guest** joins as now, with a name and a picture from their local
profile, and also sends the cosmetics they picked. The room checks only
that each exists (in `cosmetics.json`), not that it was unlocked, as a
guest's missions are worked out in their browser just as a signed-in
player's are. `PROTOCOL` goes up for this too.

**How cards look:** the same card for everyone, each wearing its player's
cosmetics, and no "guest" mark. The difference is only that a signed-in
player's are kept with the account.

**Kick** also keeps out the kicked account, not only that browser, and a
signed-in player can come back from another device as the same player.

**Tapping a card** to see a signed-in player's profile (their summary, by
public id, `GET /profiles/:publicId`, one request) comes after the rest,
once the request counts are measured.

**What the rooms never do:** write to D1 or keep anything after a room
closes. Room games stay counted by each page, as now, and sync with the
rest of the progress.

**How much to trust it:** missions are worked out in the browser, so a
player who edits their own save can still clear any mission and sync it.
For a signed-in player the pass stops the easy forgery (editing a room
message), not that; a guest's cosmetics are taken on trust (decision 1),
as their missions are.
Checking every save on the server would need far more than the free
plan's 10 ms of CPU a request. With no leaderboards and only cosmetics at
stake, this is accepted.

## 8. Privacy, the policy and deleting an account

All of this is built and live **before** sign-in is shown to anyone.

**A privacy policy page**, `/privacy`, a seventh page from `pages.ts`
(Google's and Discord's sign-in screens link to it, and so do About and
the footer). In plain words:

- **What we keep for an account:** the Google or Discord id (a number, not
  the email or name), the name and picture chosen, the cosmetics, the
  progress, the missions, and when the account was made and last used.
- **What we don't keep:** email addresses, Google or Discord names and
  pictures, passwords (there are none), IP addresses in our database or
  logs, and no cookies, ads, analytics or tracking. Cloudflare sees
  addresses to deliver the site, and the rate limits give Cloudflare's
  rate limiter a hash of one as its key, counting in one-minute windows;
  the policy says so under its own heading, not as something never kept,
  as Cloudflare doesn't publish how long the limiter keeps a key.
- **Who sees what:** other players in a room see the name, picture and
  cosmetics, and later the profile's summary. Nobody sees the progress.
- **Where:** Cloudflare (D1 and Workers).
- **How long:** until the account is deleted, or **after 2 years without
  being used** (no sign-in or sync), when it is deleted the same way.
  Sessions end after 90 days unused. After a deletion, D1's Time Travel
  (always on) can still restore the database to a moment before it for 7
  days on the Workers Free plan (30 on Paid, which the policy would say
  first); Cloudflare's docs say nothing of after that, so the policy only
  says it can't be brought back that way.
- **The player's rights:** download everything, delete everything, at any
  time, from the profile.
- **Guests:** everything stays in the browser, as today.
- **Children:** Google and Discord accounts are for 13 and over; the site
  isn't aimed at younger children.
- **A contact address** for privacy questions (the user to provide one).

**Deleting an account** (Profile, Account, Delete account): it says what
goes, asks twice, then one D1 batch deletes the account, and with it every
identity, session, profile, progress, backup and mission row. Passes run
out within 12 hours. The page signs out and asks whether to keep the
progress in this browser as a guest. Google and Discord kept nothing for
us, so there's nothing to revoke there; the policy says how to remove the
site from a Google or Discord account's connected apps.

**Inactive accounts:** a scheduled run of the accounts Worker, once a day,
deletes accounts whose `seen_day` is over 2 years old, as a deletion
does. It reads the accounts table (about one row each), with no index on
`seen_day`, which would cost a write each time it moves. The profile says
"Kept while you play; deleted after 2 years unused."

**Download my data:** the account as JSON (identities' providers, the
profile, the missions) and the save file.

**Also changed:** About's privacy card, the README's Privacy, and a What's
new entry. `public/_headers` gains `api.baheardle.com` in `connect-src`,
and the page check allows it, still failing on any cookie or outside
script.

## 9. What the user sets up

- A **Google Cloud** project's OAuth client (web), the consent screen
  (app name, the site, the privacy policy, baheardle.com as the authorized
  domain), and the scope `openid` only, which needs no review.
- A **Discord application**, with its redirect address and the privacy
  policy.
- **`api.baheardle.com`** as the accounts Worker's Custom Domain.
- The secrets, with `wrangler secret put`: the two client secrets, the
  `state` signing key and `ROOM_PASS_KEY` (also on the rooms Worker).
- A **contact address** for the privacy policy.

## 10. Build order

Each step its own branch, stacked; sign-in stays hidden (on only in dev and
on the preview) until step 6.

0. **Save format 2** (section 4): round ids, the smaller rounds, room
   games as a list, format 1 converted; the merge, tested on its own. No
   account yet; players notice nothing.
1. **The accounts Worker:** D1 and its first migration, Google and Discord
   sign-in, sessions, linking and unlinking, rate limits. _Built on
   `feat/accounts-worker` (README, "Accounts (in testing)"). Choices made
   while building it, within the plan:_
   - _The first migration has only this step's tables (accounts,
     identities, sessions) and `sign_in_codes`, where the one-time code
     the page comes back with is kept (hashed) for its minute; the
     profile, progress and missions tables come with their steps._
   - _One identity from each provider per account: linking a second
     Google to an account that has one says so (`has`)._
   - _No PKCE: the Worker is a confidential client (its secret never
     leaves it), the `state` is signed and short-lived, and the page's
     nonce stops a sign-in being slipped into someone else's page._
   - _Rate limits: 10 sign-ins and 60 other calls a minute per address;
     syncs get theirs with step 3._
   - _The preview signed in against the Worker's workers.dev address
     until step 6's hardening; it uses `api.baheardle.com` now, the
     Worker's only address._
   - _A local stand-in for Google's and Discord's pages (`npm run
accounts`, localhost only), so the whole flow is tried without
     their keys._
2. **The profile in the account:** name, picture, cosmetics and the
   summary, synced from Customize. _Built on `feat/account-profile`
   (migration `0002_profiles.sql`; `src/accounts/profile.ts`,
   `src/helpers/profileSync.ts`). How it works:_
   - _The profile is the name, the "Sensei" after it, the favourite
     student, and the card title and colours, banner, frame and
     background. The cursor's colour and the character stay this
     browser's settings._
   - _**The later change wins.** Every change to the profile here marks
     when (`profile.editedAt`); the account keeps the time of the change
     it holds (`edited_at`, a column the plan's table gains). A sync reads
     the account's (one request) and takes it in if it's later, or sends
     this browser's if it's later (one more, one row written); the Worker
     keeps the picks only if they're at least as late as its own, so an
     older change from another device can't undo a newer one. A browser
     never changed since this step gives way to an account that has a
     profile; the first to sign in gives the account its own._
   - _**When:** once as a signed-in page opens, after Customize saves,
     when the Sensei card closes having changed something, and right
     after signing in. Failing quietly: the profile is always kept in the
     browser, and the next sync catches up._
   - _**A pick not unlocked here** (its mission cleared on another device
     only, until progress syncs in step 3) is kept as it is, shown as the
     default until it's unlocked here too; Customize saves only the kinds
     the player changed, so it can't save the default over it._
   - _**The summary** is worked out from this browser's saves at each
     sync (`profileSummary.ts`) and sent when it has changed since it last
     went. The Worker keeps it, numbers only, and never hands it back:
     `GET /me/profile` has the picks only, and nothing reads a summary
     into the progress. Until progress syncs (step 3), it is the totals of
     whichever device synced last._
   - _The Worker checks what comes in: the name cleaned as the rooms clean
     theirs (20 characters), a student id a whole number, cosmetics ones
     that exist (else the default), the edit time no more than a day
     ahead of its own clock._
3. **Progress in the account:** the first sign-in's backups and merge,
   syncing, the 409 retries, signing out. _Built on
   `feat/account-progress` (migration `0003_progress.sql`;
   `src/accounts/progress.ts`, `src/helpers/progressSync.ts`). How it
   works:_
   - _**The browser's save stays where it was**, so the games read it as
     ever and play on offline. The account keeps a copy, the save file's
     format 2, gzipped (`GET`/`PUT /me/progress`); the revision rides in a
     header, and the profile's read says it too, so a page opening needs
     one request to know whether to download._
   - _**First time in a browser** (`progress.revision` absent): its save
     is copied aside first (`backup.beforeAccount`, downloadable from the
     Account tab); if that fails, nothing is changed. Then the four cases
     of section 5: only the browser's goes up; only the account's comes
     down; both are merged (`mergeSaves`, the account's as `base`) and the
     account keeps a copy of what it had (`progress_backups`); neither,
     nothing._
   - _**After:** a changed save goes up built on the revision this
     browser last matched; if another device wrote meanwhile (409), the
     account's comes down, is merged, and the merge goes up (its backup
     kept), up to four tries._
   - _**The browser's save is only changed before the page draws**
     (the games hold their rounds in memory): a signed-in page waits for
     the sync, 5 s at most (it took under 1 s in testing), then draws.
     After that, a merge goes to the account only, and the browser takes
     it in as it next opens._
   - _**When:** as the page opens; 5 minutes after the last save while
     playing; and as the tab is hidden or closed (`keepalive`, under
     60 KB). A save that hasn't changed isn't sent._
   - _**Nothing counted twice:** rounds and multiplayer games are joined
     by id, so the same save on two devices merges to itself (tested,
     with a save file carried over); one daily a day by section 5's rule._
   - _**Open rounds:** as the plan says, both are kept. Nothing new was
     needed: the stats, streaks and missions count finished rounds only,
     and the games resume only the newest, so an older open round from
     another device stays in the save, unfinished and uncounted._
   - _**What this page doesn't know** in the account's save (a newer
     page's fields, lists, JP fields or missions) is kept aside
     (`progress.extra`) and put back in every save sent. Changing what a
     round itself holds needs the format raised, as the checks drop a
     round's unknown fields; a page never writes over a newer format._
   - _**Signing out** saves the newest progress first, then asks: keep it
     in this browser (the default; it plays on as a guest, and a later
     sign-in merges again, by id) or clear it (offered only once it's
     saved; the copy put aside goes too, and the page reloads)._
   - _**A save file imported while signed in** replaces this browser's
     progress as ever, then is joined with the account's as the page
     opens again (both copied aside), so nothing in the account is lost._
   - _**The summary** is worked out after the progress syncs, from the
     browser's save once it has the account's; while the browser is a
     step behind, the account's summary is left as it was._
   - _**Open question for the user:** Reset stats, signed in, clears the
     mode here and in the account, but another signed-in device that
     still has those rounds brings them back as it merges (merges only
     ever add). The Reset card says so; making a reset stick everywhere
     would need a new rule (a record of what was reset)._
4. **Room passes:** the pass, `PROTOCOL` up, kicks by account. _Built on
   `feat/room-passes` (migration `0004_missions.sql`;
   `src/accounts/roomPass.ts`, `src/accounts/missions.ts`,
   `src/helpers/roomPass.ts`, `src/helpers/roomLook.ts`), `PROTOCOL` 5,
   with guests' cosmetics (decision 1) as the user asked. How it works:_
   - _**Missions in the account:** `missions_cleared`, which section 3
     planned and no step had built yet. The page sends its cleared
     missions with the profile (`PUT /me/profile`) when one is new since
     they last went; the Worker reads the account's rows and adds only
     the new ones, so each costs one write, once, and none is ever taken
     away. Signing out forgets what was sent, so another account gets
     its own._
   - _**The pass:** `GET /room-pass` reads the account's public id, its
     profile and its missions (one session read and three small
     queries, about 40 rows, no write) and signs `{public id, name,
favourite student, title, banner, frame, background, name effect,
expiry}` with
     `ROOM_PASS_KEY` (HMAC-SHA-256, its own kind, so a sign-in's state
     can't pass for one), good for 12 hours. Each cosmetic is the
     profile's pick only if one of the account's missions unlocks it,
     else the default. No account id, provider id or token is in it._
   - _**The page** asks for it as `/multiplayer` opens, signed in only,
     and keeps it in memory (never storage, an address or the page). If
     the profile or the missions changed since, it brings the account up
     to date first, so a pick or a mission from a moment ago shows; a
     join waits 4 s at most, then goes in as a guest would. A guest's
     page never loads that code or makes the request._
   - _**The room** checks the pass in the rooms Worker before reading
     the room (WebCrypto, no D1, no extra request), and a pass changed,
     out of time or signed with another key makes the player a guest.
     The room shows the pass's name and cosmetics, and keeps the public
     id on the player only while the room is open (never sent to a
     page); nothing goes to D1._
   - _**Kicks** keep the browser out as before and the account too, from
     any device, through a restart; a locked room lets the account back
     in from another device; a signed-in player joining from a second
     device or tab is the same player there (score, host and all), and
     the first is told `elsewhere`._
   - _**Guests** send the cosmetics unlocked in their browser with their
     hello; the room checks each exists and every card wears them._
   - _**The picture** in a room stays the one picked for the visit
     (Entry's, the favourite by default) for everyone: any student may
     be anyone's picture, so it isn't the pass's to decide. The pass
     carries the favourite student as planned._
5. **Privacy:** the policy page, deletion, download, About and README,
   retired missions and cosmetics, the ids lock. _Built on `feat/privacy`
   (`src/accounts/privacy.ts`, `src/helpers/accountData.ts`,
   `src/helpers/unlocks.ts`, `src/components/PrivacyPage/`). How it
   works:_
   - _**`/privacy`**, a seventh page (`SITE_PAGES`; not on the game bar,
     which lights no pill there), its text in `src/content/privacy.json`
     with the contact privacy@baheardle.com, which the user forwards to
     their inbox with Cloudflare Email Routing. Linked from the footer
     (in place, no reload), About, and the Account tab before and after
     signing in; in the sitemap; a lazy chunk; and a step of the page
     check._
   - _**Download my data**: `GET /me/data` sends everything kept (the
     account and when it was last used, the Google or Discord ids, each
     session's end, the profile with its summary, the missions with
     when, the progress and its backup gzipped); the page opens the
     progress and saves one readable JSON file,
     `baheardle-account-<date>.json`. No token, hash or account id is in
     it._
   - _**Delete account**: says what goes, asks again, then `DELETE /me`
     deletes the account and every row of it in one batch (each table
     named, not only the cascade), signs every device out, and asks
     whether this browser keeps its progress as a guest (the default) or
     clears it._
   - _**The daily run**: a cron (04:23 UTC) deletes accounts whose
     `seen_day` is over 730 days old, 50 to a batch, and the sessions and
     sign-in codes that ran out. A sign-in now marks the account used too
     (it was only the calls after it), as the policy counts one._
   - _**Retired**: a mission or cosmetic is marked `"retired": true`,
     never removed. A retired mission can't be cleared, shows only to
     whoever cleared it, under Retired in its tab, and isn't counted in
     the totals; a cosmetic keeps working for whoever has it, and
     `formerMissions` lets a new mission take one over without taking it
     from anyone. `src/content/ids.lock.json` holds every mission and
     cosmetic id ever shipped, and the content test fails on a removal, a
     rename or a new id not added to it._
   - _**Also**: About's privacy card and the README's Privacy say an
     account is optional and what it keeps; What's new has an Accounts
     entry for the release; the CSP's `connect-src` has
     `api.baheardle.com`; the footer fits one line on a phone with the
     new link._
6. **Measured and opened:** the preview's numbers against section 6, then,
   when the user says so, the release with everything held since 4a460a1.
   _Measured on `feat/preview-measure`, 2026-10-02, on the preview with the
   user's own Google and Discord sign-ins (section 6): every case at or
   under the local figures, and scanners found, given their own line in
   the quota. Not yet observed: a preflight's reuse past 15 minutes, and
   the daily cleanup on Cloudflare. Then hardened before the release: a
   deployed Worker takes only `SITE_ORIGINS` (localhost only with `npm run
accounts`), its workers.dev address is off, and Discord's sign-in is
   off (its client id emptied) until the release puts it back, as
   Discord's apps have no testing mode. Released on 2026-10-02
   (fast-forward of `feat/preview-measure`), with Discord's client id
   back; Google's app is published once /privacy is live._

## Decisions (settled 2026-10-02)

1. **A guest's cosmetics in rooms:** (b), guests wear the cosmetics their
   browser has unlocked, checked only to exist (section 7).
2. **Signing out:** keeps this browser's copy, asking each time.
3. **Inactive accounts:** deleted after 2 years unused (section 8).
4. **Tapping a card** for a profile: after the first account release.
