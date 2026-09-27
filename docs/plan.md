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
   calendar, result picture, recap card. _Built on `feat/save-export-import`,
   not merged yet._
2. **Group 2: seasonal, merged before 2026-12-25.** Christmas and New Year
   backgrounds. _Built on `feat/seasonal-backgrounds` (stacked on Group 1), not
   merged yet; run `npm run songs` before merging to put the pictures on the
   Worker._ After 2026-12-10, the old-domain cleanup in "Dates to remember" in
   `CLAUDE.md` can ride along.
3. **Group 3: new ways to play the OST.** Jukebox, then four-choice answers,
   then time attack (it uses four-choice). _Built on `feat/ost-modes`
   (stacked on Group 2), not merged yet._
4. **Group 4: storage.** The user checks the Worker's file limit and makes an R2
   bucket on our own domain; then copy the OST to R2 and fall back to it.
5. **Group 5: Badle.** Data script, then the icon sprite sheet, then Gameplay
   mode, then Lore mode, then student birthday touches (they use the Badle
   student table).
6. **Group 6: dream plan.** The user messages SchaleDB first, then Voice line
   mode. The user checks the Durable Objects and PartyServer free-tier limits,
   then Multiplayer.

Any time: `npm run songs` when new OSTs come out.

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

All of Phase 1 (1 to 5) is built, on the branch `feat/save-export-import`
until released. Each new mode's rounds go into the save file too
(`GAME_MODES` in `src/types/mode.ts`), and new share pictures reuse
`src/helpers/picture/canvas.ts`.

## Phase 2: new ways to play the OST

All of Phase 2 (6 to 8: Jukebox, four-choice answers, time attack) is built,
on the branch `feat/ost-modes` until released. What was agreed is now in
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
   (built), the Blue Archive anniversary, student birthdays. Pictures go on the
   Worker (`pictures/`, see the README). Add a season to `SEASONS` in
   `src/constants/seasons.ts`. Birthdays can use the Badle student table
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
