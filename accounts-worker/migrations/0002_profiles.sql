-- Accounts, step 2 (docs/accounts.md, section 3): the profile in the
-- account. One row an account, written in one go (an upsert), so a sync
-- costs one row written.
--
-- The picks are what the player chose; whether each is unlocked is the
-- missions', worked out from the progress, checked where it matters (the
-- room pass, step 4). `summary` is a cache only: the profile's totals,
-- worked out from the progress by the page, for other players to see
-- later. The progress is the source of truth; nothing reads the summary
-- back into it, and a missing or stale one is simply sent again.

CREATE TABLE profiles (
  account_id TEXT PRIMARY KEY REFERENCES accounts (id) ON DELETE CASCADE,
  name TEXT NOT NULL,             -- empty for none; cleaned, 20 at most
  sensei INTEGER NOT NULL,        -- 1: "Sensei" after the name
  student INTEGER,                -- favourite student; null for the letter
  title TEXT NOT NULL,            -- cosmetics.json ids
  banner TEXT NOT NULL,
  frame TEXT NOT NULL,
  background TEXT NOT NULL,
  card_colors TEXT NOT NULL,
  summary TEXT NOT NULL,          -- JSON cache of the totals; never authoritative
  edited_at INTEGER NOT NULL,     -- when the picks were last changed, on the page
  updated_at INTEGER NOT NULL     -- when the row was last written
) STRICT;
