-- Accounts, step 1 (docs/accounts.md, sections 2 and 3): who has which
-- Google or Discord, and their sessions. The profile, progress and
-- missions come in later migrations, each only adding.
--
-- D1 counts a row written for every row and index entry a write touches,
-- so the indexes are only those a lookup needs. Secrets (session tokens,
-- sign-in codes) are kept as their SHA-256, never themselves.

CREATE TABLE accounts (
  id TEXT PRIMARY KEY,            -- 128 random bits, base32
  public_id TEXT NOT NULL UNIQUE, -- what other players see; 80 random bits
  created_at INTEGER NOT NULL,    -- ms since 1970
  seen_day INTEGER NOT NULL       -- days since 1970 last used, once a day at most
) STRICT;

CREATE TABLE identities (
  provider TEXT NOT NULL CHECK (provider IN ('google', 'discord')),
  subject TEXT NOT NULL,          -- Google's sub, Discord's user id; nothing else of theirs
  account_id TEXT NOT NULL REFERENCES accounts (id) ON DELETE CASCADE,
  linked_at INTEGER NOT NULL,
  PRIMARY KEY (provider, subject)
) STRICT;
CREATE INDEX identities_account ON identities (account_id);

CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,    -- SHA-256 of the token
  account_id TEXT NOT NULL REFERENCES accounts (id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL     -- 90 days from last use, pushed back once a day at most
) STRICT;
CREATE INDEX sessions_account ON sessions (account_id);

-- The one-time code a sign-in sends the page back with, for a minute.
CREATE TABLE sign_in_codes (
  code_hash TEXT PRIMARY KEY,     -- SHA-256 of the code
  account_id TEXT NOT NULL REFERENCES accounts (id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL
) STRICT;
