-- Accounts, step 3 (docs/accounts.md, sections 3, 5 and 6): the progress
-- in the account. One row an account: the whole save (format 2, the same
-- as the save file's), gzipped by the page, which the Worker never opens.
-- Writing it costs one row whatever its size.
--
-- A write names the revision it built on; one built on an older revision
-- is refused, and the page merges and sends again. The format only goes
-- up: a page with an older format can't write over a newer one.
CREATE TABLE progress (
  account_id TEXT PRIMARY KEY REFERENCES accounts (id) ON DELETE CASCADE,
  format INTEGER NOT NULL,        -- the save format (src/helpers/saveFormat.ts)
  revision INTEGER NOT NULL,      -- one more on each write; 0 is none yet
  data BLOB NOT NULL,             -- the save's JSON, gzipped; 1 MB at most
  updated_at INTEGER NOT NULL
) STRICT;

-- The account's progress as it was before the last merge was written over
-- it: a way back, should a merge ever go wrong.
CREATE TABLE progress_backups (
  account_id TEXT PRIMARY KEY REFERENCES accounts (id) ON DELETE CASCADE,
  format INTEGER NOT NULL,
  revision INTEGER NOT NULL,
  data BLOB NOT NULL,
  saved_at INTEGER NOT NULL
) STRICT;
