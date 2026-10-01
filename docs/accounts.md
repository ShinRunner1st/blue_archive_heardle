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
  second-class players.
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
workers.dev address can't be verified.

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

- Every round gets an **id** (random, 8 bytes) and the time it ended, so
  two copies of the same progress merge without doubling or losing a
  round.
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
- **A write names the revision it built on.** If another device wrote
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
To be confirmed on the dashboard when it's measured (below).

Past a limit, Cloudflare refuses, never bills, and it resets at 00:00 UTC.
The page then plays on from its own copy and syncs the next day; nothing
depends on the Worker being there.

**A signed-in player's day, estimated:**

| What                               | Worker requests | D1 rows read | D1 rows written  |
| ---------------------------------- | --------------- | ------------ | ---------------- |
| Opening the site (`/me`)           | 1               | 3            | 0-1 (once a day) |
| Downloading progress (new only)    | 0-1             | 1            | 0                |
| Syncing, about 3 times             | 3               | 6            | 3-6              |
| A room pass, per Multiplayer visit | 0-1             | 40           | 0                |
| **A usual day**                    | **about 5**     | **about 50** | **about 5**      |
| Signing in (rarely)                | 3               | 3            | 3-5              |

So the free plan holds about:

- **Worker requests:** 100,000 ÷ 5 = **20,000** signed-in players a day,
  less the rooms' connections that day (a busy day of 1,000 eight-player
  games is about 10,000).
- **D1 writes:** 100,000 ÷ 5 = **20,000** players a day.
- **D1 reads:** 5,000,000 ÷ 50 = **100,000** players a day.
- **D1 storage:** the developer save (every song, every mode on both
  servers, about 2,900 rounds) is **31 KB gzipped**, against 505 KB as a
  save file. Format 2 is smaller still. At about 20 KB for a keen player,
  500 MB holds about **25,000 accounts**; a second database, or Workers
  Paid ($5 a month, 10 GB a database), comes after that.
- **Durable Object requests:** unchanged by accounts; still the rooms'
  own limit, as in `docs/multiplayer.md`.

**Measured before it opens:** the preview build runs a script that signs
in, syncs, merges and asks for passes, and logs each D1 query's `meta`
(rows read and written) and the dashboard's counts. If the numbers are
higher than above, this section and the sync rules change before
anything goes public.

**Rate limits:** as for the rooms, the Worker's rate-limit binding, per
address (hashed): 10 sign-ins and 30 syncs a minute.

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
  pictures, passwords (there are none), IP addresses (Cloudflare sees them
  to deliver the site; the rate limits keep a scrambled form for a
  minute), and no cookies, ads, analytics or tracking.
- **Who sees what:** other players in a room see the name, picture and
  cosmetics, and later the profile's summary. Nobody sees the progress.
- **Where:** Cloudflare (D1 and Workers).
- **How long:** until the account is deleted, or **after 2 years without
  being used** (no sign-in or sync), when it is deleted the same way.
  Sessions end after 90 days unused. After a deletion, Cloudflare's Time Travel history keeps the
  data for up to 7 days more, then it's gone.
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
   sign-in, sessions, linking and unlinking, rate limits.
2. **The profile in the account:** name, picture, cosmetics and the
   summary, synced from Customize.
3. **Progress in the account:** the first sign-in's backups and merge,
   syncing, the 409 retries, signing out.
4. **Room passes:** the pass, `PROTOCOL` up, kicks by account.
5. **Privacy:** the policy page, deletion, download, About and README,
   retired missions and cosmetics, the ids lock.
6. **Measured and opened:** the preview's numbers against section 6, then,
   when the user says so, the release with everything held since 4a460a1.

## Decisions (settled 2026-10-02)

1. **A guest's cosmetics in rooms:** (b), guests wear the cosmetics their
   browser has unlocked, checked only to exist (section 7).
2. **Signing out:** keeps this browser's copy, asking each time.
3. **Inactive accounts:** deleted after 2 years unused (section 8).
4. **Tapping a card** for a profile: after the first account release.
