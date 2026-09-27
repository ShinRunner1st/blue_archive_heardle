# Plan

Features agreed with the user on 2026-09-27 and 28. `CLAUDE.md` imports this
file, so it loads every session. Build in the order below: later parts reuse
earlier ones. When the user decides something new, update this file; when a
feature ships, add it to "What the game has" in `CLAUDE.md` and remove it here.

## Keeping new features cheap, private and fair

- **Worker first.** The audio Worker only serves static files, and those
  requests are free and unlimited (`audio-worker/wrangler.jsonc`). Its limit is
  the number of files: about 20,000 per Worker on the free plan (check). The
  OST uses 691.
- **R2 as backup.** Keep a copy of the OST on Cloudflare R2 and fall back to it
  if the Worker fails; `npm run songs` uploads to both. Files that don't fit on
  the Worker also go to R2. Serve R2 through our own domain: the free `r2.dev`
  address is rate-limited.
- **Pictures go in sprite sheets on the Worker**: one image holding many icons,
  cached for a year.
  - Tested on 2026-09-28 with 32 SchaleDB icons at the same WebP quality: the
    same picture quality as separate files (SSIM 0.985 for both), about 5%
    smaller, and one request instead of one per icon.
  - Make each cell a multiple of 16 px with a few pixels of empty space around
    the icon, so neighbours don't bleed in when the browser scales the sheet.
  - Size icons for how big they show on screen, doubled for phone screens.
  - A new student changes the whole sheet, so players download it again after
    each update. That is accepted.
  - Not base64 in the bundle: Vercel would serve it, it is 33% bigger, and it
    downloads again after every deploy. Not one file per student: the file name
    would show the answer in DevTools.
- **Nothing loads from other sites.** The page never requests anything from
  SchaleDB, YouTube or anywhere else: it would send players' IPs away, and file
  names like `hoshinoswimsuit_title.mp3` give the answer away.
- **Outside data is copied at build time** by a script (like `npm run songs`),
  cut down to the fields we use and checked. If the source changes format, the
  script stops and the live site keeps working.

## Phase 1: small, no new files to host

Save export and import (1), the per-song record (2), the daily calendar (3)
and the result picture (4) are built, on the branch `feat/save-export-import`
until released. Each new mode's rounds go into the save file too
(`GAME_MODES` in `src/types/mode.ts`).

5. **Personal recap card** in stats, for every mode. It reuses the result
   picture's drawing code in `src/helpers/picture/canvas.ts`.

## Phase 2: new ways to play the OST

6. **Jukebox.**
   - Opens only from the result screen, never while a round or a time attack
     run is going, and closes when the next round starts, so it can't be used
     to check the clip while guessing. Players can still look songs up
     elsewhere; this only keeps the game itself from being the shortcut.
   - Lists every song, grouped or sorted by OST volume, with an "Other" group
     for songs not on Vol.1-8. Every song can be played.
   - Songs guessed right in any mode stand out (brighter); the rest are dimmed.
     Never mark missed songs apart from songs not played yet: that would show
     what's left in the endless bag. The bright songs still hint a little: in
     the first endless cycle, a song guessed right there won't come up again
     until the cycle ends. Players could track that themselves anyway.
   - Plays full songs with the result screen's player. Each song downloads
     once; the Worker already sends a one-year cache header, so replays need no
     request.
7. **Four-choice answers**, in endless and time attack only (never daily).
   - One try per song, with a short clip of about 1-3 seconds.
   - Its own stats and win streak. Streak places work; no badges are earned.
   - The wrong choices should sound close: same artist or nearby theme
     numbers. Four random songs are too easy.
8. **Time attack**: as many songs as possible in 3 minutes.
   - One try per song. Before starting, the player picks the clip length,
     random start on or off, and typed or four-choice answers.
   - Random start stays inside the 16-second clip: that keeps the single-clip
     rule, and full songs are too big to wait for.
   - The next song loads during the current one; the timer pauses while a song
     loads.
   - Streak places: the background moves up as the run's score grows and goes
     back to the start for each new run.
   - Its own stats. No badges, and the start screen says so.

## Timed: seasonal touches

9. **Seasonal touches** on set dates: Christmas and New Year backgrounds, the
   Blue Archive anniversary, student birthdays. Pictures go on the Worker. Have
   Christmas ready before 2026-12-25. Birthdays can use the Badle student table
   (Phase 3).

## Phase 3: Badle (guess a student)

For players who want a Badle here too (other Blue Archive "-dle" games exist).
Daily and endless, like the OST game. Each guess shows how its attributes
compare with the answer, with up/down arrows for numbers.

- **Gameplay mode:** School, Role, Damage Type, Weapon Type, EX Skill Cost,
  Release Order. Each costume is its own answer, because their kits differ.
  Hoshino (Armed) has two entries, one per form (Tanker with EX cost 4,
  Attacker with EX cost 6): keep the first.
- **Lore mode:** Height, School, Birthday, Year, Weapon Type, Fav SSR Gift,
  Club, Release Order. Default costumes only (names without brackets): 144 on
  Global, and Shiroko\*Terror counts as her own student.
- **Data:** SchaleDB (`students.json`, `localization.json` and `items.json` at
  schaledb.com/data/en/).
  - Its FAQ allows reusing data, images and voice clips, but not community
    translations without asking. Global students use the official English
    text, so that should be fine.
  - Global only (`IsReleased[1]`).
  - Its format can change without notice, which is why we copy it at build
    time.
- **Conversions:**
  - Height: `"145cm"` becomes a number.
  - Birthday: `"January 2nd"` becomes a month and a day.
  - EX cost is a list with one cost per skill level: pick one level.
  - Club, school, role and damage type names come from `localization.json`
    (`Kohshinjo68` becomes "Problem Solver 68").
  - Fav SSR Gift: match `FavorItemTags` against `items.json`.
  - Release Order: `DefaultOrder` (Global kept JP's order).
- **Pictures:** student icons in one sprite sheet on the Worker.
- **Reference repos:**
  - puttimeth/blue-archive-wordle has converted data to check ours against. It
    has no licence, so don't copy from it.
  - starsbit/bardle is GPL-3.0: read it, but don't copy it.
  - bluekiseki/BA-mobilization-trends-public is MIT, but it holds schedules,
    not student data.
- **New students:** rerun the data script after each Global update, like
  `npm run songs`.

## Dream plan (big, after the plan above)

### Voice line mode: guess the student from their voice

Build after Badle: it reuses the student table and the sprite sheet.

- The same modes as the OST: daily, endless, endless four-choice, time attack,
  time attack four-choice.
- **Hints:** a title call is about 1 second and every student says the same
  words, so a longer clip doesn't help. Each miss gives a hint instead: school,
  then club, then silhouette. There is also a no-hint mode, with its own stats.
  - Make silhouettes at build time, in their own sheet in a different order
    from the icons. Never darken the real icon with CSS: DevTools could undo it.
- **Answers:** the student's picture and name. Each costume is its own answer
  (each has its own recording), with no "partly right" colour for the right
  student in the wrong costume.
- **Global only.** 261 of the 263 Global entries have a title call ("Blue
  Archive!"); Hoshino (Armed)'s second form and Hatsune Miku don't.
- **Which lines:** the title call plus a few chosen lines per student, so it
  fits on the Worker (about 4 Lobby lines each is about 1,300 files). SchaleDB
  has 17,291 clips for Global (about 750 MB), far too many. Skip lines where
  the student says their own name.
- **Getting the files:** tell SchaleDB first, then download the chosen clips
  once, slowly (they are on r2.schaledb.com). Convert them to Ogg with hashed
  names, like the OST.

### Multiplayer: private rooms, played like AMQ

- **Rooms and settings:** the host picks the settings, creates the room and
  shares a short code, like Among Us or Kahoot. Settings: number of songs, OST
  or Voice, typed or four-choice, clip length, guess time, max players. Only
  the host can change them in the room. If the host leaves, another player
  becomes host.
- **Each round:**
  1. The room tells everyone to load the clip.
  2. Each player says when they're ready.
  3. The room starts the clip for everyone at once. Slow players skip that song
     after about 10 seconds.
- **Fair:** the room holds the answer, marks the guesses, and sends the answer
  only at the reveal. Nobody sees it early, not even the host.
- **Built with PartyServer (PartyKit)** on Cloudflare Durable Objects, over
  WebSocket, one Durable Object per room. The page stays on Vercel; clips still
  come from the Worker.
- **Never hit the free tier's limits** (100,000 Durable Object requests a day;
  check the duration limit too):
  - Hibernation on, so a room sleeps between messages. Round timers use
    alarms, not timers in code.
  - Few messages: only final guesses, nothing while a player types, and no text
    chat to begin with.
  - Cap players per room and songs per game. Close rooms that are empty or
    idle.
  - Rough cost: a game of 8 players and 20 songs is about 70 requests, so about
    1,400 games a day.
  - If the limit is hit anyway, show "Multiplayer is resting until tomorrow".
    The rest of the site doesn't depend on it.
- **Privacy:** update the About box and the README. Room data lives only while
  the room is open, and nicknames aren't kept. Still no accounts.

## Still considering

- A short list of one-off missions.
- Speech-bubble lines for the characters.

## Always

- Keep the song list current as new OSTs come out (`npm run songs`).
- Avoid leaderboards and accounts, even once multiplayer adds a server: they
  break the privacy promise.

## Turned down (don't suggest again)

- "We moved" notice and past daily puzzles: the old site had almost no players.
- Lifetime "guessed" marks in All OST: its "Guessed" tag already marks this
  round's wrong guesses, so the two would clash.
- Other UI languages: one person can't maintain translations.
- Practice pools (one volume or artist): too grindy, and the badges don't cover
  every song.
- Hard mode that hides the arrows and tags: too small a change.
- "Challenge a friend" link: players wouldn't use it.
- A "missed songs" shelf in the Jukebox: it shows the endless bag.
- A music visualiser: the player already has bars.
- YouTube, as a fallback or even as a link: the video ID gives the answer away,
  and it brings Google cookies and tracking.
- Base64 images in the bundle: Vercel would serve them.
- Badle extras: one shared daily share line, hints after misses, the birthday
  student as the daily answer.
- A lore quiz: every question would have to be written by hand.
- Pass-and-play multiplayer.
- Peer-to-peer (WebRTC) multiplayer: some players can't connect, players would
  see each other's IPs, and the host could cheat.
