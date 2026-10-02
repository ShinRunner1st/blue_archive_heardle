# Verified stats

A design, not built. Its direction was approved on 2026-10-02 with the
scope below (Phase 1); nothing here changes the live site, the database,
its migrations or any Worker's configuration until the user approves the
build, a step at a time, as accounts were (`docs/accounts.md`).

The site has almost no player history yet, so this is the moment to start
a record the server keeps itself, before the player base grows. The local
save stays exactly as it is for play; verified stats are a second, separate
record.

## 1. What "verified" means, and what it doesn't

A **verified result** is one the server issued, timed and judged itself:

- the server recorded the attempt (who, which daily, which day, when)
  **before** the player played it;
- the server received the player's guesses and worked out the outcome with
  the shared rules code; the page never reports "won in 3";
- it is tied to one account, timestamped by the server's clock, and
  allowed once where the rules allow once (one attempt a daily a day);
- it never comes from a save file, an import, a merge or a sync.

So verified results stop **fabricated and imported history**, **replaying**
a daily, and rewriting a streak after the fact.

They are **not cheat-proof**, and nothing in this design claims they are:

- **Answers can be looked up.** The page has the daily schedules and the
  file names, and a clip's file can be traced to its song (as in
  multiplayer, where separate secret copies were turned down). A player who
  reads the bundle can look up an answer before guessing.
- **A modified page can manipulate play**: start an attempt late, after
  working the puzzle out, or never send a round it is losing.
- **Several accounts**: Google and Discord accounts are free.
- The checks below (days in range, guesses in the rules, times plausible)
  only refuse what the official page could never send. They make crude
  fakes fail; they don't make results trustworthy against a determined
  player.

What verified stats are fit for: a player's own record, and later their
profile shown to others, marked "Verified". What they would need before
any ranking: the leaderboards feature's own design (moderation, reports),
which is not part of this.

## 2. Phase 1: what's in and out

In:

- **Verified dailies for every game**, each server where the game has
  two: the OST's daily (one schedule), and Voice, Halo, Weapon, Students
  Gameplay and Students Lore, each on Global and on JP. Eleven dailies.
- **Verified streaks** for each of them.
- **Verified room results**, from receipts the room signs.
- **A Verified section on the player's own profile.**

Out (personal and unverified, as now, or later):

- Endless, Classic, 4-Choice and Time Attack: personal. Verified Endless is
  a later phase; Time Attack's clock stops while a song loads, which only
  the page sees, so it stays personal until it can be timed honestly.
- Missions and the cosmetics they unlock: personal, as now (guests wear
  theirs too). Verified achievements are Phase 2.
- Leaderboards: a later feature. Phase 1 adds no ranking, no query across
  accounts, no public list of anyone's results and no index for ranking.
- Other players' profiles (tapping a card): its own feature, which can show
  this section once both exist.

## 3. What's authoritative, and what stays the browser's

| The server's (verified)                                            | The browser's (personal, unverified)                         |
| ------------------------------------------------------------------ | ------------------------------------------------------------ |
| That a verified daily attempt exists, for which account, game, day | The whole local save, its rounds and every stat from it      |
| When it started and finished (the server's clock)                  | The page's clocks, including the Students solve clock        |
| Its outcome and tries, judged by the server from the guesses       | Every daily played as a guest, offline, or before sign-in    |
| Verified streaks, from verified dailies only                       | Local streaks, Endless, 4-Choice, Time Attack                |
| The account's daily time zone (section 4)                          | Missions, cosmetics, the room counts kept in the browser     |
| Room results, from receipts the room signed                        | `profiles.summary` (a cache from the saves, never read back) |

Nothing flows from the right-hand column into the left: progress sync,
`mergeSaves`, save import and the profile summary never read or write the
verified tables, and the verified code never reads them. Existing saves
are never made verified, however old. The record starts empty for
everyone on the day it launches ("Verified since …").

The answers themselves stay the shared schedules' (`dailyOrder.ts`,
`studentDailyOrder.ts` and the others, only ever appended to). The server
doesn't hide them or send them; it computes the same answer the page does
and judges against it.

## 4. The daily's day

The game's daily rolls over at the player's **local** midnight
(`dayNumber`, local calendar days since `DAILY_EPOCH`). The server can't
trust the device's clock or its time zone, and won't guess one from the
address. So each account gets one **daily time zone**, kept by the server,
and the server works out the day from its own clock.

1. **Setting it.** The first time an account starts a verified daily, the
   page sends its time zone's IANA name
   (`Intl.DateTimeFormat().resolvedOptions().timeZone`, such as
   `Asia/Bangkok`). The server checks it's a real zone (its own `Intl`
   accepts it) and keeps it. It is the player's choice, not checked
   against where they are.
2. **The account's day** is the local calendar date, **at the server's
   clock**, in that zone, counted from `DAILY_EPOCH` as `dayNumber` counts.
   Summer time follows from the zone's name, so it needs no change.
3. **Starting needs agreement.** The page sends the day it's showing; the
   server starts a verified attempt only if that equals the account's day.
   If not (a device clock that's wrong, or the zone below), the server
   answers with its day, nothing is written, and that daily is played
   locally, unverified, with a short note on why.
4. **The day never goes back.** The server never issues a day before the
   latest day the account already has a verified attempt for (one row
   read). This also covers the odd zone whose clocks go back across
   midnight.
5. **Changing the zone** (travel, a new device). When the page's zone
   differs from the kept one, it asks to change it. The change is taken
   only if, at that moment, the new zone's day is **the same as or later
   than** the account's current day in the old zone. Moving east is taken
   at once; moving west waits (the page asks again later) until the new
   zone's date has caught up.

What this rules out: replaying a day (one attempt per account, game and
day, section 5), and playing a missed day late to save a streak (that
needs a zone behind the account's current day, which is refused). What it
allows: a player who picks a zone far to the east sees each puzzle up to a
day early. That plays nothing twice and only moves puzzles earlier, so it
is accepted.

The zone is personal data (it says roughly where a player is): it goes
into the privacy policy, Download my data and Delete account (section 10).

## 5. A daily, issued and judged

**Issued** means: before the player plays, the server has written, for the
signed-in account, a row keyed by (account, day, game) holding a random
attempt id and the server's start time. That row is the attempt. Being
issued doesn't mean the server hides or sends the answer; it means the
attempt exists, belongs to one account, is unique, and was made first.

1. **Start**, as the daily first plays (the OST's first clip, Voice's
   first line, Picture's picture; in Students, the first guess sent, where
   the local clock starts too):
   - the request carries the session token (as every account call does),
     the game, the day and the page's zone;
   - the server checks the session, the day (section 4) and the game, and
     inserts the attempt;
   - if the account already has an attempt for that day and game: finished,
     it answers with that result and the page doesn't play it as verified;
     not finished (started on another of the player's devices), it answers
     with that attempt so this device can finish it.
   - The page doesn't start a verified attempt for a daily it already has
     guesses for locally (played as a guest, offline, or before signing
     in): that day stays personal.
2. **Play** is as now, in the page, with the page's own answer.
3. **Finish**, when the round ends on screen:
   - the request carries the attempt id, the guesses in order (with skips
     and Students' give-up as the page records them), and whether it is a
     retry of an earlier failed send;
   - the server checks the attempt is this account's, still open, and not
     past its deadline (section 6);
   - it checks the guesses against the game's rules from the shared code
     (each one a real answer of that pool, no more tries than the game
     allows, nothing after a right guess, a give-up last) and judges them
     against the day's answer from the shared schedule;
   - it records the outcome, tries, guesses and finish time, and updates
     the game's summary (section 7), in one batch. A finish that arrives
     twice gets the stored result again and writes nothing.

The page shows its own result as now; the server's answer only marks the
round verified (or says why not). Any disagreement, which the official
page shouldn't produce, leaves the local round as it is and the verified
one as the server judged it.

## 6. Offline, late finishes and the time

- **Never started online**: a daily played with no server start (offline,
  the accounts Worker unreachable, not signed in) stays personal for good.
  The server didn't issue it, so it can't be verified later.
- **Started online, finished offline**: the page keeps the finish and
  sends it when it can. The server takes it until the **end of the
  account's next day** (day + 1, in its zone). The outcome can still be
  judged, so it is verified.
- **The time** is always the server's: start to the finish's arrival. A
  page can make that longer, never shorter. It is marked **verified** only
  if the finish arrived on its first send and within the same day;
  otherwise the result is verified but its time is marked **unverified**
  and isn't used for best times.
- **Never finished**: past its deadline, an open attempt counts as played
  and lost (abandoned). It is closed lazily, with no daily scan: the next
  time that account starts a daily or opens its verified stats, its open
  attempts past their deadline (a few recent rows, by key) are closed and
  counted.

## 7. Verified streaks and the summary

- A verified streak follows the same rule as the game's local daily streak
  (`calStreaks`): consecutive days won; a loss, an abandoned attempt or a
  day with no verified attempt breaks it. Today, not yet played, doesn't.
- Each account keeps a **summary row per game** (11 at most): played, won,
  abandoned, the tries spread, the best streak, the best verified time
  (Students), and the first verified day. It is updated with each finish
  (and each lazy close), so reading stats never scans a year of rows.
- The **current streak** is read back from the game's recent attempts,
  newest first, until the first break: as many rows as the streak is long.
  A late finish (section 6) arriving out of order is handled the same way,
  as the streak is always read from the rows.

## 8. Room receipts

The room stays the judge of multiplayer, as now. It never writes to D1
and keeps no permanent account data; the receipt is how its result
reaches the account.

**What the room does.**

- When a game starts, it makes a random game id (128 bits), kept in the
  game record it already writes when the game starts.
- When the game reaches its standings after its last round, for each
  player who joined with a room pass, it signs a receipt and sends it **on
  that player's own connection only**. A game ended early by a vote gives
  no receipts; guests get none (their games stay in their browser's count).
- A receipt holds: its kind (`room-result`, so it can never pass for a
  room pass, a sign-in's state or a link ticket), the game id, the
  **account's public id from that player's room pass**, the game (OST,
  Voice or Picture, and its kind), typed or 4-Choice, the rounds, the
  players, the place (ties shared) and the score, when it ended (the
  room's clock), and when it stops being accepted (7 days later). It is
  signed with `ROOM_PASS_KEY` under that kind, so no new secret.

**What the accounts Worker checks, all of it.** A valid signature alone
is never enough:

1. the session: the request is from a signed-in account;
2. the signature, for the `room-result` kind;
3. the receipt hasn't expired;
4. **the receipt's public id is this account's** (read from `accounts`);
   a receipt for anyone else is refused, however valid its signature, so a
   receipt passed to someone else counts for nobody;
5. the values are in range (place no more than the players, score no more
   than the rounds);
6. **(account, game id) is new**: the row is inserted only if it isn't
   there. A receipt sent again, from any device, is answered "already
   counted" and writes nothing.

The page keeps a receipt until it's taken, so a game finished on a bad
connection still counts later, within the 7 days.

A change to the room's messages bumps `PROTOCOL`, as always.

## 9. The Verified section

On the player's own profile: for each game they've played verified, the
dailies played and won, the tries spread, the current and best streak,
the best verified time for Students, and rooms played and placed first
(and top three), with "Verified since …" and a line saying what verified
means (section 1, in a sentence). It reads `GET /verified` once as the
profile opens and keeps it while it's open, as the Account tab now does.
Local stats stay where they are, unchanged, as the player's own.

## 10. Data model (D1)

Four tables, all `WITHOUT ROWID` with only their primary key, so a row
written costs one row (to be measured; a table with a separate key was
measured at two). No other index: nothing in Phase 1 looks across
accounts.

| Table              | Primary key        | Columns                                                                                                           |
| ------------------ | ------------------ | ----------------------------------------------------------------------------------------------------------------- |
| `verified_clock`   | account            | zone (IANA name), set at                                                                                          |
| `verified_daily`   | account, day, game | attempt id, started at, finished at, outcome (won, lost, abandoned), tries, guesses (compact text), time verified |
| `verified_summary` | account, game      | played, won, abandoned, tries spread, best streak, best time, first day                                           |
| `verified_room`    | account, game id   | game, answers, rounds, players, place, score, ended at                                                            |

- Rooms' totals go into `verified_summary` under a `rooms` game, updated
  with each receipt.
- All four join `ACCOUNT_TABLES`: deleted with the account (Delete account
  and the two-year cleanup), and in Download my data.
- **Privacy policy first**, as the house rules say: the new data (verified
  attempts with their guesses and times, room results, the daily time
  zone), why, for how long (as long as the account), and that it is in the
  download and goes with deletion. Then the About box and the README.

## 11. The API

One address, `/verified`, for every call, so a page needs one preflight
for all of them (kept 7,200 s), as the single upload address does:

- `POST /verified` `{ action: "start", game, day, zone }`
- `POST /verified` `{ action: "finish", attempt, guesses, retry }`
- `POST /verified` `{ action: "room", receipt }`
- `GET /verified`: the account's summaries, recent attempts for the
  current streaks, and when the record began.

Each takes the session token in the Authorization header, as every
account call does, and nothing about the account in the address.

## 12. What it costs

Kept apart, as asked. **Measured** means on Cloudflare (`docs/accounts.md`
section 6, and `docs/multiplayer.md`); **estimate** means worked out from
measured statements of the same shape, as none of these requests exists
yet. Every estimate is measured with `npm run accounts:measure`, and on the
preview, before any release.

### The baseline (measured)

| What                                      | Worker requests                     | D1 reads                  | D1 writes                    |
| ----------------------------------------- | ----------------------------------- | ------------------------- | ---------------------------- |
| A signed-in player's usual day (accounts) | about 10                            | 35-64 (50 for planning)   | 4-8 (6 for planning)         |
| A session-checked request, for comparison | 1                                   | 2-4                       | 0, or 1 when it writes a row |
| An 8-player, 20-song room game (rooms)    | one per connection, about 8-10      | none (rooms never use D1) | none in D1                   |
| The same game's Durable Object use        | 45-75 DO requests, about 25 DO rows | -                         | -                            |

### Verified, added to the accounts Worker (estimates)

| Action                        | Worker requests                          | D1 reads                                               | D1 writes                                   |
| ----------------------------- | ---------------------------------------- | ------------------------------------------------------ | ------------------------------------------- |
| Start a daily                 | 1                                        | about 5 (session, zone, latest day, the attempt's key) | 1; +1 the first time (zone); +1 on a change |
| Finish a daily                | 1                                        | about 5, plus one per day of the current streak        | 2 (the attempt, the summary)                |
| A room receipt                | 1 per signed-in player per finished game | about 4 (session, public id, the key, the summary)     | 2 (the result, the summary)                 |
| Read verified stats           | 1 per profile opening                    | about 11 summaries and a few recent rows a game: 20-40 | 0 (2 when it closes an abandoned attempt)   |
| The preflight for `/verified` | at most 1 per page session               | 0                                                      | 0                                           |

### Rooms (estimates)

- **Rooms Worker requests**: none added.
- **Durable Object requests**: none added. A receipt is an outgoing
  message, which isn't billed as a request; signing it is a moment of the
  standings' own handling.
- **Durable Object rows**: none added. The game id rides in the record
  the room already writes as a game starts (to confirm when building).
- **Room-receipt traffic on the accounts Worker**: the row above, one
  request and 2 writes per signed-in player per finished game; none for
  guests.

### A day, put together (estimates on a measured baseline)

A signed-in player who plays 3 dailies, finishes 1 room game and opens
their profile twice:

| Part                         | Worker requests | D1 reads          | D1 writes    |
| ---------------------------- | --------------- | ----------------- | ------------ |
| The usual day (measured)     | 10              | 50                | 6            |
| 3 dailies (start and finish) | 6               | about 30-45       | 9            |
| 1 room receipt               | 1               | about 4           | 2            |
| 2 profile openings           | 2               | about 40-80       | 0            |
| The preflight                | 1               | 0                 | 0            |
| **Total**                    | **about 20**    | **about 125-180** | **about 17** |

A player who plays all 11 dailies adds about 22 requests and 33 writes to
the usual day.

**In theory**, with nothing else using the quotas (a calculation, not a
capacity): 100,000 Worker requests a day at about 20 is about 5,000 such
players (about 10,000 today at 10); 100,000 rows written at about 17 is
about 5,900 (about 16,000 today at 6); 5,000,000 rows read at about 180 is
about 28,000. The rooms Worker's connections and the scanners come out of
the same 100,000 requests; nothing else uses D1. So Phase 1 about halves
the request headroom, and writes become about as tight.

**Storage** (estimate): a daily row is about 100-150 bytes with its
guesses; at 1,000 players playing 3 dailies a day, about 0.15 GB a year.
The database's own limit, 500 MB, is the one that matters (5 GB is for
all databases): about three years at that rate, one at three times it.
Folding rows older than a season into the summary, or a second database,
comes before then.

## 13. Building it

Each step only once the user approves it, on its own stacked branch:

1. **Shared rules**: one module per game that gives a day's daily answer
   and judges a list of guesses, used by the page and the Worker, tested
   against the page's own results for every daily. _Built on
   `feat/verified-rules`: `roundRules.ts` holds what a guess, skip or
   give-up does in each game, which the hooks now play with;
   `verifiedDaily.ts` lists the 11 dailies, gives each one's answer from
   its schedule with its server named (never the page's setting), and
   judges a round's saved moves through the same functions, refusing any
   move the game would ignore (`day`, `shape`, `ignored`, `over`). About
   34 KB gzipped bundled for a Worker; not in the page's bundle yet._
2. **The accounts Worker**: the migration, `/verified`, the time zone
   rules, uniqueness, late finishes, lazy closing, receipts and every
   check in section 8, with tests; then `accounts:measure` for each row of
   section 12.
3. **The rooms**: the game id and the receipts, `PROTOCOL` bumped.
4. **The page**: start and finish around each daily (signed in only), the
   kept finishes and receipts, the Verified section.
5. **Privacy**: the policy, About, the README, What's new.
6. **Measured on the preview**, as accounts' step 6 was, before any
   release.
