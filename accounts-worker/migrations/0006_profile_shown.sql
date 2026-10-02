-- Profiles from a card (docs/room-profiles.md, section 4): whether players
-- in a room with this account may see its profile. Shown by default, as
-- the user chose, existing accounts included; turned off on the Account
-- tab. On `accounts`, which every account has a row in (not every one has
-- a profile yet). No index: it's only ever read with its row.
ALTER TABLE accounts ADD COLUMN profile_shown INTEGER NOT NULL DEFAULT 1;
