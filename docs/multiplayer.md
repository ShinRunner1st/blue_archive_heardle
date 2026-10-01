# Multiplayer: player flow and request flow

How a multiplayer game goes, first as players see it, then as the page and
the room talk, with what each step costs on Cloudflare's free plan. The code
is `src/helpers/room.ts` (the game), `rooms-worker/index.ts` (the Durable
Object), `src/types/room.ts` (the messages and timings) and
`src/components/Multiplayer/` with `src/hooks/useRoom.ts` (the page). The
README's Multiplayer and Multiplayer rooms sections have the rest.

## Player flow

1. **Entry** (`/multiplayer`). The player types a name (the one typed for
   the last room, or else the one in Settings, to start with) and picks a
   picture: a student from the grid, or their
   name's first letter. Then type a friend's code and **Join**, or **Make a
   room**: its settings show in a few words above the button, and the
   **⚙** beside it opens the settings pop-up (below) to change them first,
   a password too. A link `/multiplayer?room=ABCD` fills the code in. A
   room with a password opens a pop-up, "This room has a password", its
   box ready to type in ("That isn't the room's password" under it for a
   wrong one, the pop-up staying for another try). Alerts (a room that
   couldn't be joined, Reconnecting, "press Leave to go", the idle
   warning) float over the top of the screen and move nothing, and each
   screen starts scrolled to its top.
2. **Lobby.** The room's code, big ("Room code · 🔑 password" or "· 🔒
   locked" over it when it isn't open), with Copy code and Copy link on
   one row (each says "Copied ✓" for a moment); the settings in a few
   words ("OST · Typed · 10 songs · 20s each · random start · up to 8
   players"); a card for each player with their picture, the host's
   crown, and the places still free. Only the host sees the **⚙**, a
   pop-up (two columns on a wide screen) with chips for the game (one
   row), answers, picture kind, silhouette, where songs start (Random or
   From the top), the OST's albums (Every song, or any of Vol.1-8; the
   hint counts their songs, and a game is no longer than they are),
   Voice's lines (All lines or Title calls) and the room's server, a slider with a number box for
   rounds (5-30), time to answer (5-40 s) and most players (2-8), and
   **Who can join**: Open, Password (with its box; left empty, the room
   keeps the one it has) or Locked. At its top, **Presets**: the settings
   saved under a name in this browser, twenty at most, a row each in a
   list that scrolls past three and a half; a tap uses one, ⧉ copies it
   as a code for a friend, × deletes it. The box under it saves the
   settings showing; if a preset holds them already it says "Saved as
   ...", and the button renames it. **Import** swaps the box for one to
   paste a friend's code in. Nothing is sent until **Save**. **Start**
   needs two players.
   - **Locked**: nobody new can join ("That room is locked"), but
     everyone in the room then can still come back, by a reload or a new
     tab. **Password**: only with it; a reload in the lobby sends it
     again by itself. A new room can have a password, not a lock. A **✕**
     on each other player's card kicks them, "Kick?" asking again: they're
     told "The host took you out of that room", and their browser can't
     come back to it, from that tab or another.
   - While in a room, the logo and the game bar are dimmed; pressing one,
     or Back, stays on the page and says "You're in a room: press Leave
     to go." During a game the ☰ Jukebox waits ("opens again once the
     game is over"), and the browser asks before a reload or a closed
     tab.
   - If nobody does anything in the lobby for 10 minutes (joins, changes
     the settings, starts), it closes and everyone is sent out: "The room
     closed: nothing had happened in it for 10 minutes." The last minute
     shows a warning with **I'm still here**, which starts the 10 minutes
     again.
3. **First round loads.** Everyone's page downloads the first song (the
   whole song, 1-3 MB), line or picture sheet. The room waits until all
   have it, or 10 s.
4. **Count-in**, before the first round only. 3, 2, 1 over the stage; the
   song starts on every page at the same moment (the room sends the start
   time; each page counts from when the message came). Later rounds follow
   their reveal after a second, with no count.
5. **Answering.** A song plays for the whole time to answer with no play,
   pause or seek (only the volume); a voice line plays whole and, once it
   has played through, can be played again (button or Space; the button
   keeps its place, hidden, until then); a picture shows. The four
   answers of 4-Choice appear only now, in four empty places that were
   there from the start, so nothing moves. The player picks (typed
   search, empty again each round, the grid, or one of four with a tap or
   1-4) and presses **Submit** (or Enter), or **Skip**, which sends no
   answer (a pick after it still goes, as any change does).
   **Quick answer** (the ⚡ toggle beside Submit, remembered in the
   browser) sends the first pick as it's made. After that the player can
   pick again as often as they like, as in Anime Music Quiz: each change
   goes as it's made, 0.4 s apart at least (one sooner waits, and the
   latest pick goes), and the room takes one every 0.3 s at most. Each
   card shows live when that player's latest answer reached the room
   ("3.24s"), or "thinking…", never what. Each player's score is big on
   the card's right, with a medal on the corner for the top three. No line
   of text under the stage keeps changing: the clock, the cards and the
   Submit button say how it's going. The volume keeps one place, a row at
   the stage's foot, from loading to the reveal.
   - Once everyone has answered, or the last one they waited on leaves,
     the clock drops to 3 s.
   - When the time is up, a pick never sent, or a change still waiting
     its 0.4 s, is sent by itself, and the page says its time is up only
     after it, so the room doesn't reveal first.
   - The latest answer the room took counts, timed by when it reached the
     room (A at 3.2 s then C at 7.8 s is C at 7.8 s). The room's own clock
     decides: nothing before the song starts, for another round, after the
     time and its 1.5 s grace, or after the reveal; a tick before the
     time is up moves nothing.
   - **Leave** and the host's **End game** are small, at either end of a
     row under the cards, and each needs a second tap within 3 s. End game
     asks the others, "End the game? 1/2" with **Yes** and **No** in the
     row's middle: it ends once more than half of the players here say
     yes (the host counting as one, so two players both), and the ask
     goes after 20 s, or once too many say no.
6. **Reveal.** The answer takes the stage, where the song played: a song's
   album cover, name, artist and theme number, or the student's icon (a
   picture game's halo or weapon, the real one after a silhouette), name,
   school and club, with the volume beside it (and Play again for a
   line). Its border is green or red for the player's own answer. The
   four are marked, typed answers show what the player said, and every
   card what each player said, green or red, with the time of right
   answers. The song plays again from its start point, or the line
   again. Meanwhile each page downloads the next round (it started
   downloading as soon as this round began).
7. **Next round** starts by itself after 6 s, once everyone has the next
   one; a slow connection is waited for until 12 s, then left to catch up
   (its song starts where everyone else's is). A second's wait, the clock
   full, and the next song plays.
8. **Standings** after the last round (or once the players agree to end
   early): the top three who named any on a podium (second, first,
   third, in solid gold, silver and bronze), the rest in rows under it
   ("–" for nobody's place who named none), ties on answers and time
   sharing a place; every
   answer, with the pictures of who named it. **Back to the lobby** takes
   each player there when they like: they see the lobby, with who is still
   on the results, and the host stays host. The room is a lobby again (and
   the host can start) once everyone has gone back, or after 30 s.

Throughout, the screen keeps one layout: the stage and the answers are the
same height in every phase, so nothing jumps.

**Coming and going.** A reload or a dropped connection comes back as the
same player, with their score (the tab keeps a token for the room). A
player whose tab closed can open the room again in the same browser and
gets their place back: the browser keeps the last tab's token for each
room a few hours, and sends it as `back`. A name alone never brings anyone
back, so nobody else can take a player's place and score by typing their
name; they join as a new player ("Aru 2"), or find the room full. Anyone
can join halfway through a game, if there's room. If the host leaves,
whoever joined next becomes host. **Leave** leaves at once.

## Request flow

Each arrow is a WebSocket message. Page to room costs 1/20 of a Durable
Object request; room to page is free. Each connection costs one Worker
request and one Durable Object request.

```
page                          Worker / room (Durable Object)
 | WebSocket /room/ABCD?make=1 -> Worker: checks the origin, counts the
 |                                 address (6 rooms, 40 connections a
 |                                 minute), wakes the room       [1 W + 1 DO]
 | hello {name, icon, create, access?}
 |                             -> makes the lobby, on the socket  [0 rows]
 |   (joining: hello {token, back?, password?}, back being a closed tab's
 |    token; a wrong password: error "password")
 | <- room {view, endsIn}          (every change sends every player a view;
 |                                  in the lobby, endsIn is when it closes)
 | settings {…, access?} (host, on Save)
 |                             -> on the sockets                  [0 rows]
 | stay           ("I'm still here", in the last minute)
 | tick           (10 min idle) -> closes: error "idle" to all    [0 rows]
 | start (host)                -> deals every round; writes the game,
 |                                 sets the tidy alarm           [2 rows]
 | <- room {loading, current: file}
 | ready {round 0}             -> once everyone's in, or 10 s:
 | <- room {playing, startsIn, endsIn, current + choices, next: file}
 | ready {round 1}             (the next song, downloaded early)
 | guess {pick}   (Submit, Skip, or a pick with Quick answer)
 |                             -> all answered: time cut to 3 s
 | <- room {playing, settling, endsIn, each latest answer's time}
 | guess {pick}   (each change, 0.4 s apart at least; the room takes one
 |                 per 0.3 s; at time-up, a pick not sent yet)
 | end (host), vote {yes} (each) -> over, once more than half agree
 | tick           (time-up)    -> reveal once every page has ticked,
 |                                 or 1.5 s after time-up; scores; writes
 |                                 the game                      [1 row]
 | <- room {reveal, endsIn (6 s), maxIn (12 s), answers}
 | tick           (6 s, if this page has the next song)
 | tick           (12 s, if still waiting)
 |                             -> next round: playing, as above
 | ...                         (last round -> over)          [1 row]
 | <- room {over, endsIn (30 s)}
 | again          (each player's Back to the lobby)
 | tick (30 s) or the last again -> back to the lobby; deletes the game
 |                                 and the alarm                 [~2 rows]
 | ping every 30 s             -> "pong" without waking the room  [free]
```

The room has no clock of its own: an alarm per phase would be a row
written each. Each page sends a tick when one of the phase's times passes
(the room's times are sent as "in so many ms", so a page's own clock being
off doesn't matter), and every message moves the room on if something is
due. A page that never ticks (asleep, or gone) holds nothing up: the first
tick from anyone after the time-up plus 1.5 s moves on.

**Floods.** The Worker counts rooms made (6) and connections (40) per
address a minute before a room wakes, and the room closes a connection
that sends over 40 messages in 10 s; both answer "wait a minute". Each
connection's count rides on its own socket (`countMessage` in room.ts, the
socket's attachment in the Worker), so one page flooding never counts
against another, and a room sleeping between messages doesn't forget it.

**When players leave.** In the lobby nothing is stored, so the room is
gone with its last connection, and one left open with nobody doing
anything closes after 10 minutes, on the first page's tick. In a game, the last to leave sets the alarm
for 30 s (1 row); if nobody is back by then, the room deletes everything
(1-2 rows). While a game is on, the alarm looks every 30 minutes whether
anyone is still there, for a room abandoned all at once.

**After a new version of the Worker.** Every connection drops. Pages
reconnect by themselves (1, 2, 4, 8, 16 s). A game is read back from its
last write and plays its round again, loading; a lobby, which wrote
nothing, is made again by the first page back (that one reconnection counts
as making a room). It comes back with its password if that page knew it;
a lock can't come back (who was in went with the lobby), so a locked lobby
comes back open.

## What a game costs

| Game                                         | DO requests | Rows written | Games a day (free plan) |
| -------------------------------------------- | ----------- | ------------ | ----------------------- |
| 8 players, 20 songs                          | about 45    | about 25     | about 2,200             |
| the same, the usual few changes a round      | 50 to 75    | about 25     | 1,300 to 2,000          |
| the same, everyone clicking through all game | about 400   | about 25     | about 250               |
| 4 players, 10 songs                          | about 12    | about 15     | about 6,500             |
| A lobby nobody starts                        | 1 a player  | 0            | -                       |

The free plan's daily limits: 100,000 Durable Object requests, 100,000 rows
written, 13,000 GB-s of duration (a hibernating room isn't billed; each
message is milliseconds), 5 GB stored, and 100,000 Worker requests (one per
connection). Requests are now the tighter limit; before this design, alarms
and a write at every phase made writes the tighter, at about 750 twenty-song
games a day. They reset at 00:00 UTC; past one, Cloudflare refuses, never
bills. A page making or joining a room then says it couldn't reach the
rooms and Multiplayer may be resting until tomorrow; a page in a game, after
"Reconnecting…" and five tries (about 30 s), that its connection may have
dropped or the allowance run out, to try again tomorrow; and a room whose
writes fail tells everyone in it Multiplayer is resting until tomorrow.

Downloads cost nothing here: songs, lines and pictures come from the audio
Worker's static files, free and unlimited, with R2 only as the backup. A
song is 1-3 MB per player per round, where a Heardle clip was 0.2 MB.
