# Profiles from a card

A design, not built. Asked for with accounts (decision 4 in
`docs/accounts.md`: "tapping a card for a profile, after the first account
release"); its four choices were settled with the user on 2026-10-02
(section 1). Nothing here changes the live site, the database, its
migrations or any Worker until the user approves the build, a step at a
time, as accounts and verified stats were.

## 1. What it is, and the four choices

In a multiplayer room, tapping a **signed-in** player's card opens their
profile, read-only, in a pop-up like the player's own:

- **their card**: name, "Sensei", favourite student, title, banner,
  frame and background (what the room already shows);
- **their verified record** (`docs/verified-stats.md`): for each daily
  they've played verified, played, won, best streak and the fastest
  verified find, room games and first places, "Verified since …";
- **their profile summary**, marked "From their own saves, not
  verified": rounds played, days played, dailies won, best streaks, songs
  guessed, students found, missions, badges, room games.

The user's choices (2026-10-02):

1. **What's shown:** the card, the verified record, and the summary,
   labelled as the player's own, unverified.
2. **By default:** shown, with a switch on the Account tab to hide it.
3. **Who can look:** anyone in the room with them, guests too.
4. **How a tap finds it:** a ticket the room signs, so pages never learn
   an account's public id.

A guest's card opens nothing: it has no account behind it, and shows on
the card all there is.

What's **not** in it, now or later without a new design: a web address
for a profile, a search, a list of players, anything across rooms, any
ranking, a player's time zone, their dailies one by one or their guesses,
and their Google or Discord account.

## 2. Boundaries kept

- **The summary stays a cache.** `profiles.summary` is shown, labelled as
  the player's own numbers, and is still never read back into progress,
  verified stats or anything else. The verified record stays the server's.
- **The rooms never write to D1** and keep nothing after they close; they
  only sign a ticket from the room pass they already hold.
- **Public ids stay off pages.** The room has each signed-in player's
  public id from their pass; it never sends it on (a test checks this
  today). The ticket carries it signed, and only the accounts Worker
  reads it.
- **The session token** is never involved in viewing someone else's
  profile; a guest has none.

## 3. How a tap becomes a profile

1. A room's view marks each card that has a profile to show (`profile:
true`: signed in, and not hidden by its player's switch as their pass
   says). Others aren't tappable.
2. Tapping one sends the room `{ t: "profile", id }`, the player's room
   id (never a public id).
3. The room checks that player is in this room (here, or away in the
   game's roster) with an account and a pass that doesn't hide it, then
   signs a **profile ticket** and sends it **only to the asker**:
   `{ t: "profile", id, ticket }`.
4. The page sends the ticket to the accounts Worker,
   `POST /profile-view` `{ ticket }`, and shows the answer.
5. The page keeps each profile it was given for as long as it's in the
   room, so tapping the same card again asks for nothing.

**The ticket**: signed with `ROOM_PASS_KEY` (shared already) under its own
kind, `profile-view`, so it can't pass for a room pass, a receipt, a
sign-in's state or a link ticket. It holds the profile's public id and
when it stops being taken (5 minutes). The accounts Worker checks the
signature, the kind and the time, finds the account by its public id
(`accounts.public_id` is UNIQUE, so one row), and checks its switch again,
as it may have changed since the pass was made. A ticket handed on works
only for those 5 minutes, and only shows what anyone in that room could
see.

**The answer**: `{ name, sensei, student, look, summary, verified }`,
with `verified` as the profile tab's `GET /verified` has it, less the
time zone, today and the current streaks (each would read the player's
recent dailies, up to about 50 rows a game). No public id, no account
id, no dates but "since".

A ticket for a hidden or deleted account, or an expired or changed one,
answers 404 with nothing in it.

## 4. The switch

"Players in a room can see my profile", on the Account tab, on by
default. Kept with the account, not in the browser, so it holds on every
device:

- **migration 0006**: `accounts.profile_shown INTEGER NOT NULL DEFAULT 1`
  (every account, existing ones included, starts shown, as chosen);
- `PUT /me/profile-shown` `{ shown }`: one row written;
- the room pass gains it (`h: 1` when hidden), so a room doesn't mark or
  sign for a hidden profile; the accounts Worker checks the column too, so
  turning it off works at once, even with a pass made before;
- Download my data gains it; Delete account and the two-year cleanup take
  it with the row.

## 5. Messages and protocol

- Page to room: `{ t: "profile", id }`, at most one a second from a
  page (the room drops faster ones; the flood limit of 40 in 10 s still
  closes a connection).
- Room to page: `{ t: "profile", id, ticket }`, on the asker's connection
  only; nothing for a guest, a hidden profile or someone not in the room.
- `PlayerView.profile: boolean`.
- `PROTOCOL` 6 to 7: a page on 6 is asked to reload, as always.

## 6. Privacy

The policy changes first, as it says it will ("If others can ever see
more, such as your profile's record, this page will say so first"):

- **Who sees what**: players in a room with you, guests too, can tap your
  card to see your name, picture and cosmetics, your verified results'
  totals and your profile's summary from your own saves, marked as such;
  only while you're in the same room, and never your Google or Discord
  account, time zone, single dailies or guesses. You can turn it off on
  the Account tab.
- **What's kept**: the switch, with the account; in Download my data.
- About, the README and What's new say the same.

## 7. What it costs (estimates, to measure)

Per view, from measured statements of the same shape:

| What                                     | Worker requests                                           | D1 rows read                                            | D1 rows written |
| ---------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------- | --------------- |
| A view                                   | 1 accounts, and its preflight once a page                 | about 15 (the account, the profile, up to 12 summaries) | 0               |
| The room's part                          | 0 (a message on an open connection, 1/20 of a DO request) | none (no D1)                                            | none            |
| Turning the switch                       | 1                                                         | about 3 (the session and the row)                       | 1               |
| A room of 8, everyone taps everyone once | 56                                                        | about 840                                               | 0               |

No session check for a view (guests can look), so no session read. The
room pass grows by one field; the rooms Worker's Durable Object rows
don't change.

So a busy evening of 100 such rooms would be about 5,600 requests and
84,000 rows read: about 6% of a day's Worker requests and 2% of D1's
daily reads, on top of everything else. That is a calculation, not a
capacity; the page's keeping of profiles for the room is what holds it
there.

## 8. Building it

Each step only once the user approves it, on its own stacked branch:

1. **The accounts Worker**: migration 0006, the `profile-view` ticket's
   format and checks (`src/accounts/profileView.ts`), `POST
/profile-view`, `PUT /me/profile-shown`, the pass's new field, the
   download's; tests; `accounts:measure`.
2. **The rooms**: `PlayerView.profile`, the `profile` message and its
   ticket on the asker's connection only, `PROTOCOL` 7; tests.
3. **The page**: tappable cards for signed-in players, the read-only
   profile pop-up (from the profile's own parts, the summary labelled),
   kept for the room; the Account tab's switch; tests; screenshots at
   1920×1080, 945, 911 and a phone, with eight players.
4. **Privacy**: the policy, About, the README, What's new.
5. **Measured on the preview**, with the preview accounts stack
   (`chore/accounts-preview`), before any release.
