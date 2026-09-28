# Plan

Features agreed with the user on 2026-09-27 and 28. `CLAUDE.md` imports this
file, so it loads every session. Build in the order below: later parts reuse
earlier ones. When the user decides something new, update this file; when a
feature ships, add it to "What the game has" in `CLAUDE.md` and remove it here.

## Build order

Only a merge to `main` redeploys Vercel, so releases stay rare. Each group gets
its own branch, made off the previous group's branch (stacked), even before that
group is merged. Nothing merges until the user says so; then everything built
so far goes to `main` in one release. Mark a step done here, with its branch
name, when it's built.

1. **Group 1: small features.** Save export and import, per-song record, daily
   calendar, result picture, recap card.
2. **Group 2: seasonal.** Christmas and New Year backgrounds, their pictures
   on the Worker and R2.
3. **Group 3: new ways to play the OST.** Jukebox, four-choice answers, time
   attack.
4. **Group 4: storage.** The R2 bucket `ba-heardle-audio`, served at
   `audio.baheardle.com`: the game falls back to it when the Worker fails,
   and `npm run songs` uploads new files to it. Its dashboard setup (the
   `Access-Control-Allow-Origin` header rule and the usage alerts) was done
   on 2026-09-28.
5. **Group 5: Badle.** The student game, its pictures and the Sensei card.

   _Groups 1 to 5 were released together on 2026-09-28, after `npm run songs`
   put Group 5's 264 pictures on the Worker and R2._ The old-domain cleanup
   in "Dates to remember" in `CLAUDE.md` is still to do after 2026-12-10, on
   its own.

6. **Group 6: dream plan. Next up.** Make its branch off `main`. The user
   messages SchaleDB first, then Voice line mode. The user checks the Durable
   Objects and PartyServer free-tier limits, then Multiplayer.

Any time: `npm run songs` when new OSTs come out.

## Keeping new features cheap, private and fair

- **Worker first.** The audio Worker only serves static files, and those
  requests are free and unlimited (`audio-worker/wrangler.jsonc`). Its limits
  (checked 2026-09-28, free plan): 20,000 files per Worker version and 25 MiB
  per file. The OST and pictures use 694, 958 with the student icon sheets
  and portraits.
- **R2 as backup.** A copy of everything on the Worker is on Cloudflare R2
  (bucket `ba-heardle-audio`, at `audio.baheardle.com`), and the game falls
  back to it if the Worker fails; `npm run songs` uploads to both. Files that
  don't fit on the Worker also go to R2. The `r2.dev` address stays off.
  - R2 has no spending cap: past the free amount (10 GB, 1M writes, 10M reads
    a month) it charges the user's card, which worries them. Keep R2 reads
    off the normal path, keep files cacheable, and name any new R2 cost when
    proposing a feature.
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

All of Phase 1 (1 to 5) is released. Each new mode's rounds go into the save file too
(`GAME_MODES` in `src/types/mode.ts`), and new share pictures reuse
`src/helpers/picture/canvas.ts`.

## Phase 2: new ways to play the OST

All of Phase 2 (6 to 8: Jukebox, four-choice answers, time attack) is released. What was agreed is now in
"What the game has" in `CLAUDE.md`. Choices made while building it:

- The header keeps Daily and Endless; a switch under the header, always in
  the same place, picks Classic, 4-Choice or Time Attack, since more buttons
  don't fit beside the logo on a phone.
- After testing, the user moved the Jukebox to the ☰ menu: keeping it to the
  result screen didn't stop anyone, since another mode's result screen was a
  click away. Its list is flat and searchable, filtered by album chips.
- 4-Choice and time attack both offer 1, 2, 3, 5 or 7 second clips
  (`CLIP_OPTIONS`); 4-Choice starts at 3.
- Time attack shows each answer before the next song: briefly when right,
  with the clock stopped; 2 seconds when wrong or passed, with it running, so
  spamming answers doesn't pay. It has Quit, share text, a share picture and
  a recap picture (best run by clip length).
- A player name in Settings goes on every share picture. It's a setting like
  the volume, so it isn't in the save file.
- The song record on the result card stays with Daily and Classic: it counts
  tries.

## Timed: seasonal touches

9. **Seasonal touches** on set dates: Christmas and New Year backgrounds
   and student birthdays (built), the Blue Archive anniversary. Pictures go on
   the Worker (`pictures/`, see the README). Add a season to `SEASONS` in
   `src/constants/seasons.ts`.

## Phase 3: Badle (guess a student)

All of Phase 3 (the data script, the icon sheet, Gameplay, Lore and the
birthday note) is released. What was
agreed is now in "What the game has" in `CLAUDE.md`, and the data's details
in the README's Student data. Choices made while building it:

- **Data** from SchaleDB's `students.json`, `localization.json` and
  `items.json`, Global only, checked against puttimeth/blue-archive-wordle's
  converted data on 2026-09-28 (all 262 matched on height, birthday, year and
  release order). Hoshino (Armed) keeps her first entry, the Tank.
  - EX cost is level 1's: what the student list shows and players quote.
  - Fav SSR Gift is the gift sharing the most tags, counting the student's
    personal tags; ties keep both (a shared one is "close"), and the four
    guests from other series have none.
  - Birthday: the right month is "close", with an arrow towards the day.
    Year has arrows between numbered years; "Suspended" and "Drop out" only
    match themselves.
- **UI**: a second switch beside the Classic/4-Choice/Time Attack one, OST or
  Students, then Gameplay or Lore. No limit on guesses, as in the other
  "-dle" games; Give up needs a second press. Share text only, no share
  picture.
- **Daily** uses the OST's day numbers (`DAILY_EPOCH`), with its own schedule
  for each way to play.
- **Icon sheet**: 80 px cells with 72 px icons (shown at up to 36 px),
  transparent round each student, on a faint square that suits day and
  night. ffmpeg's WebP keeps transparency exactly, so it is rounded to six
  steps: 447 KB for 262 students, where a flat colour made 324 KB and
  SchaleDB's separate icons come to 2 MB. It falls back to R2 if the Worker
  fails, like the audio.
- **Bundle**: the student table (9.6 KB gzipped) and its UI ship in the main
  bundle, 63 to 84 KB gzipped, rather than a lazy chunk: that would be one
  more Vercel request, and the header, stats and character all need the
  student game's state.
- **Birthdays**: a note under the switches; icons only in the student game,
  so OST players never download the sheet.
- **After testing**, the user asked for: the search box fixed at the top
  (the student game's play area is top-aligned, and Give up is always there,
  the search box's height); icons in the cells where SchaleDB has them
  (schools but Sakugawa, roles, gifts; not weapons, and the damage icon is
  the same for all four types), in a second sheet with transparency; the
  OST/Students switch on a row of its own, with the way-to-play row under it
  keeping its height when empty; the OST badges moved into the ☰ menu; and
  the Jukebox playing on in the student game, in a corner player.
- **Second round of feedback**: one row for both switches, the way-to-play
  slot keeping its width when empty and the game switch showing icons on a
  narrow phone; Sakugawa gets Schale's emblem (from the wiki); a Defense
  column, with damage and defense as coloured dots (Composite's green is a
  guess); share pictures and recaps for Students; the Jukebox paused for
  real when it stops. And a new **Sensei card**: a licence-style picture of
  the player's record with a favourite student's portrait. The portraits
  are a file each on the Worker (a card shows one; about 7.5 KB each, 2 MB
  in all), which also puts 2 MB on R2, well inside its free 10 GB.
- **Third round**: Sakugawa takes ETC's icon (Schale's emblem, on SchaleDB,
  so the wiki download went); types are SchaleDB's sword and shield drawn
  on their colour's circle in the clue sheet, and a new type needs only its
  colour added; a grid of every student beside the search box, by name;
  Give up set apart; both switches the same height on a phone; a "Sensei"
  switch under the player name; album covers in the Jukebox; whole songs
  kept in Cache Storage (the 30 played last).
- **After the release** (branches `fix/icon-sheet`, then `feat/solve-timer`):
  the icon sheet keeps its transparency; a solve clock times each find,
  from the first letter typed, as a second score beside the guesses. A
  student Time Attack was turned down for the clue game (a find takes too
  many guesses for a 3-minute run); students get one with Voice line mode.
- **New students:** rerun `npm run students` after each Global update.

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
- Keep the student table current after each Global update (`npm run
students`).
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
