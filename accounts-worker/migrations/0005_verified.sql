-- Verified stats, Phase 1 (docs/verified-stats.md, section 10): a record
-- the server keeps itself, apart from the progress (the browser's save),
-- which never reads or writes these tables. Dailies the server issued and
-- judged, the account's daily time zone, room results from receipts the
-- rooms signed, and a summary of each.
--
-- Each table is keyed by its primary key alone, WITHOUT ROWID, with no
-- other index: D1 counts a row written for every index entry a write
-- touches, and nothing in Phase 1 looks across accounts. They go with the
-- account.

-- The account's daily time zone (section 4): an IANA name, the page's own,
-- set at its first verified daily and changed only forwards.
CREATE TABLE verified_clock (
  account_id TEXT PRIMARY KEY REFERENCES accounts (id) ON DELETE CASCADE,
  zone TEXT NOT NULL,             -- such as Asia/Bangkok
  set_at INTEGER NOT NULL         -- ms since 1970, when set or last changed
) STRICT, WITHOUT ROWID;

-- One verified daily attempt per account, day and daily (section 5), made
-- before the player plays it and finished when the server has judged it.
CREATE TABLE verified_daily (
  account_id TEXT NOT NULL REFERENCES accounts (id) ON DELETE CASCADE,
  day INTEGER NOT NULL,           -- the puzzle number, in the account's zone
  game TEXT NOT NULL,             -- verifiedDaily.ts: ost, voice.global, ...
  attempt_id TEXT NOT NULL,       -- 128 random bits, base32
  started_at INTEGER NOT NULL,    -- ms since 1970, the server's clock
  finished_at INTEGER,            -- when judged, or closed as abandoned
  outcome TEXT CHECK (outcome IN ('won', 'lost', 'abandoned')), -- null while open
  tries INTEGER,                  -- tries used, or Students' guesses
  guesses TEXT,                   -- the moves judged, as JSON
  time_verified INTEGER,          -- 1 when the finish came straight away (section 6)
  PRIMARY KEY (account_id, day, game)
) STRICT, WITHOUT ROWID;

-- Each daily's totals (section 7), and the rooms' under the game 'rooms',
-- kept with every finish, close and receipt, so reading them scans no history.
CREATE TABLE verified_summary (
  account_id TEXT NOT NULL REFERENCES accounts (id) ON DELETE CASCADE,
  game TEXT NOT NULL,             -- a verified daily, or 'rooms'
  played INTEGER NOT NULL,
  won INTEGER NOT NULL,           -- for 'rooms': first places
  abandoned INTEGER NOT NULL,
  spread TEXT NOT NULL,           -- JSON: wins by tries, or rooms by place
  best_streak INTEGER NOT NULL,
  best_time INTEGER,              -- ms, the fastest verified time won
  first_day INTEGER NOT NULL,     -- the first puzzle number counted
  PRIMARY KEY (account_id, game)
) STRICT, WITHOUT ROWID;

-- Room results from receipts the rooms signed (section 8): one per
-- account and game, so a receipt counts once however often it's sent.
CREATE TABLE verified_room (
  account_id TEXT NOT NULL REFERENCES accounts (id) ON DELETE CASCADE,
  game_id TEXT NOT NULL,          -- the room's 128 random bits for the game
  game TEXT NOT NULL,             -- ost, voice, halo or weapon
  answers TEXT NOT NULL,          -- typed or choice
  rounds INTEGER NOT NULL,
  players INTEGER NOT NULL,
  place INTEGER NOT NULL,         -- 1 is first; ties share
  score INTEGER NOT NULL,
  ended_at INTEGER NOT NULL,      -- ms since 1970, the room's clock
  PRIMARY KEY (account_id, game_id)
) STRICT, WITHOUT ROWID;
