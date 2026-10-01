-- Accounts, step 4 (docs/accounts.md, sections 3 and 7): the missions the
-- account has cleared, one row each, so a room pass can say which
-- cosmetics the account has unlocked without opening the progress. The
-- page sends its cleared missions with the profile when they change; a row
-- is only ever added (a mission stays cleared), so each costs one write
-- once. They go with the account.
CREATE TABLE missions_cleared (
  account_id TEXT NOT NULL REFERENCES accounts (id) ON DELETE CASCADE,
  mission TEXT NOT NULL,          -- missions.json id, never renamed
  cleared_at INTEGER NOT NULL,    -- when the account first had it
  PRIMARY KEY (account_id, mission)
) STRICT, WITHOUT ROWID;
