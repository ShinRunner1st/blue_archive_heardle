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

6. **Group 6: Voice line mode.** Built on `feat/voice-lines`, with three
   rounds of the user's feedback on `feat/voice-feedback` stacked on it.

   _Released on 2026-09-28 (fast-forward of `feat/voice-feedback`), after
   `npm run songs` put its 1,305 lines, their text and the silhouette sheet
   on the Worker and R2._

**Planned**, in this order, each on its own branch stacked on the one
before (the first off `main`):

- **6.1. Halo and weapon guess**, each with normal, silhouette and Time
  Attack (see "Halo and weapon guess" below). First, since the next two
  describe the whole game and should include it. _Done on
  `feat/halo-weapon`, off `main` (the user called it done on 2026-09-29),
  not merged: its four sheets are not on the Worker or R2 yet, so run
  `npm run songs` before the merge._
- **6.2. New SEO text** (see "SEO, header and preview picture" below).
  _Done on `feat/seo-text`, off `feat/halo-weapon`, not merged._
- **6.3. New preview picture**, the link preview, drawn once 6.1 and 6.2
  settle what it shows, and a new icon and favicon. _Done on
  `feat/preview-picture`, off `feat/seo-text`, not merged._

**Future**, after the planned ones:

7. **Group 7: Multiplayer.** The user checks the Durable Objects and
   PartyServer free-tier limits first (see "Multiplayer" below).
8. **Group 8: move the site to Cloudflare Pages** (see "Moving off Vercel"
   below).

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
  from the first guess (the first letter typed, at first), as a second
  score beside the guesses. A
  student Time Attack was turned down for the clue game (a find takes too
  many guesses for a 3-minute run); students get one with Voice line mode.
- **New students:** rerun `npm run students` after each Global update.

## Phase 4: Voice line mode

All of it is released (2026-09-28). What was agreed is now in "What the game
has" in `CLAUDE.md`, and the lines' details in the README's Voice lines. The
first brief: the same modes as the OST, a hint for each miss (school, club,
silhouette) since a title call is a second long, each costume its own answer,
Global only, the title call and a few lobby lines per student so it fits on
the Worker, skipping lines where the student says their name, and SchaleDB
told before the one slow download. Choices made while building it:

- **One line per round**, dealt from the title call and up to four lobby
  lines, replayable. Daily is the same line for everyone.
- **Four tries** in Daily and Classic: the voice alone, then school, club and
  silhouette, one per miss or skip, each with a try to use it.
- **No hints is a way to play under Endless**, so there is one daily puzzle
  to share; Daily has hints. It keeps its own rounds and stats. A fourth pill
  (Classic, No hints, 4-Choice, Time Attack) didn't fit beside the game
  switch, so the switch keeps the OST's three and a Hints On/Off row above
  Classic picks it, as 4-Choice's clip length is picked in the OST.
- **The switch row** is now as wide as the play area (632 px with its
  padding), and the game switch shows icons only up to 600 px wide screens:
  with three games, the OST's own ways to play were squeezed too.
- **Lines:** idle lines before greetings, no seasonal ones. Newer students'
  lines come cut into parts, each its own clip and text; the longest part
  with 20 to 140 characters of text is taken from each line, so no joining.
  1,305 lines: 257 students have five, five have four (Hatsune Miku has no
  title call), about 50 MB as mono Vorbis, committed in `voices/` like
  `audio/`.
- **The lines' text** (official English) shows on the result, from one JSON
  file on the Worker read once a round is over: in the bundle it would be
  about 35 KB gzipped for everyone, and searchable during a round.
- **4-Choice:** two from the answer's school where there are; never the
  answer's other costumes, or two costumes of one student.
- **Silhouettes** are the icons as white shapes, 120 px in 128 px cells,
  shown at 60 px.
- **First feedback** (`feat/voice-feedback`):
  - The result has a card like the OST's now-playing one: the speaker's
    icon, name, school and club, the record with their voice, the line's
    words, and a player to seek in. It plays by itself only when the round
    ended on screen.
  - Share pictures (the round, the Time Attack run) and Share recap in
    Stats for every Voice mode; daily pictures name nobody.
  - Time Attack can play title calls only; runs keep which, and each kind
    has its own best. The typed answers get the grid of every student.
  - In Voice and Students, picking a name (list, grid, or Students' Random
    first guess, never the answer) fills the box, and Enter or Guess sends
    it, as in the OST. Voice's Skip and Guess sit under the box as the
    OST's do, and its results open upwards. Students' Guess is inside the
    box (a tick on a phone), as the row has no room.
  - On a 4-Choice result (OST and Voice), the answer's card is above the
    four, as the player was during the round.
  - The game switch reads OST, Voice, Students.
  - Arona's face for a win on try 5 (a find in five guesses in Students)
    was gloomy; it's a happy one now.
- **Second feedback** (same branch):
  - Every share picture and recap names its game and mode in the tag
    ("OST · 4-CHOICE", "VOICE · DAILY #3", "STUDENTS · LORE · ENDLESS"),
    and a recap's title does too ("Voice No hints report"), with "Schale
    activity report" and the date under it. A 4-Choice picture gives its
    clip length.
  - Students' clock starts with the first guess sent, not the first letter
    typed; a find on the first guess stays untimed.
  - Every form field has a name, which Chrome asked for, and the player
    name box no longer asks for autofill ("nickname" drew a warning).
  - A recap's tiles and bars sit lower, so the bars' heading doesn't crowd
    the date line.
  - Song lists (Jukebox, All OST) draw their first 30 rows with the pop-up
    and the rest straight after, so opening doesn't stall.
  - Arona's faces after a miss on try 3 and 4 looked pleased; they're
    worried ones now (07, then 06).
- **4-Choice by ear** (same branch): the wrong answers are dealt from the
  eight voices that sound most like the answer's, measured at build time
  (pitch and timbre, see the README's Voice lines), in place of two from
  the answer's school. Like the OST's 4-Choice (nearby theme numbers), a
  player who read the bundle could work out which of the four sits in the
  middle of the others; that is no easier than there, so it's accepted.
- **Third feedback** (same branch): the all-students grid opens about
  twice as fast (its tiles styled by class name, the first rows drawn
  first), and a security review added the headers in the README's
  Deploying: a Content-Security-Policy that allows only the site, the
  Worker and R2, and no framing by other sites. Checked on a production
  build served with them: nothing blocked.
  - A player shows its loading bar only when a load takes longer than
    0.4 s, so a cached clip doesn't flash it on a mode switch.

## Planned and future, in detail

### Halo and weapon guess (6.1)

Asked for on 2026-09-28 and 29; settled with the user on 2026-09-29 and
built on `feat/halo-weapon` (details in the README's "Picture: halos and
weapons" and "Halos and weapons"):

- **A fourth game on the switch**, "Picture", with Halo or Weapon picked in
  a row above the game (as Voice's Hints On/Off is), not a page of its own:
  on one page the header, stats, save file, characters and streak places
  all work, with no new Vercel request. The game switch now shows only the
  picked game's name beside its icon (the rest are icons), and below 420 px
  "Time Attack" reads "Timed", so four games fit beside the ways to play.
- **The same modes as Voice:** Daily (the picture itself), Classic with four
  tries and Voice's hints (school, club, the student's silhouette), a
  Silhouette On/Off row above Classic (its own stats; the last hint is the
  picture), 4-Choice (a halo's wrong three from the answer's school, a
  weapon's of the same gun type) and Time Attack (pictures or silhouettes).
- **One answer per picture:** costumes share a halo and mostly a weapon
  (155 weapon pictures for 263 costumes on SchaleDB), and naming any
  student it belongs to is right. Hikari and Nozomi's halos are the same
  picture, so they are one answer: 143 halos, 154 weapons.
- **Pictures:** weapons from SchaleDB; halos from the Blue Archive Wiki on
  Fandom, as SchaleDB has none (all 144 there, three under other names).
  Credited in About and the README. Hatsune Miku's is filed as "Miku
  Halo.png", uploaded in 2022: the user to check it's hers.
- **First feedback** (same branch, 2026-09-29):
  - The page never scrolls: it is the window's height, with the header,
    switches and footer fixed, and only the play area scrolls when a screen
    is too tall, as on a small laptop, in every game.
  - Voice and Picture take less height: the four tries two to a row,
    smaller hint cards and picture, Skip and Guess closer. They now need
    no more than the OST's Classic (both fit a 1080p window).
  - Picture: Classic can turn the hints off, and 4-Choice can show the
    silhouette. Silhouette and Hints are toggles beside Halo and Weapon,
    one row; each mix is its own way to play with its own stats.
  - The game switch keeps one width whatever game is picked.
  - The birthday note has the student's portrait in every game (the
    portraits' list loads only on a birthday, 3 KB, one request), and is
    as tall as the switches above it, 33 px.
- **Size:** each picture sheet is about 600 KB, the shapes 120 to 330 KB,
  1.7 MB in all on the Worker and R2 (well inside R2's free 10 GB). A player
  downloads a kind's sheet once, the first time it shows. Nothing is added
  to the Vercel deployment but the code.

### SEO, header and preview picture (6.2, 6.3)

Asked for on 2026-09-29. The page's title, description and Open Graph and
Twitter tags (`index.html`) described the OST game only; they now cover
the OST, Voice, Students, and halo and weapon guess (built on
`feat/seo-text`). The name stays "Blue Archive Heardle". The user chose
to leave the visible header as it is (its tagline already follows the
game), so 6.2 changed the tags only. Then a new `public/preview.jpg`
(1200×630, the link preview on X and elsewhere) to match. X caches link
previews, so a new one can take a while to appear there.

Built on `feat/preview-picture` (details in the README's "Link preview and
icons"), with the user's ask on 2026-09-29 for a new icon and favicon too:

- **The preview** has the logo, a line naming every game, a card for each
  of the four with its icon from the game switch and a few words on it,
  the Daily, Endless, Time Attack and "Free, no ads" tags, and Mari (Idol)
  on a dark stage with gold sparks. After a first draft with Arona, the
  user chose Mari (Idol), colours taken from her dress (ivory, charcoal,
  gold, and peach like her hair), and no counts of songs or students,
  which keep growing. `og:image` gained `?v=2`, so the sites that cache
  previews fetch the new one.
- **The icon** is a peach music note wearing a gold halo, tilted like the
  logo's, on a charcoal tile, in the preview's colours, drawn for every
  size; at tab sizes the halo is bolder and loses its spark. It replaces
  the fan art of Mari, which also made `favicon.ico` 150 KB: now 4 KB, and
  the icons and preview are cached for a week like the characters.

### Multiplayer (Group 7): private rooms, played like AMQ

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

### Moving off Vercel (Group 8)

Asked for on 2026-09-29: serve the site from Cloudflare Pages in place of
Vercel Hobby, next to the Worker, R2 and the domain's DNS, so the Hobby
limits stop being a worry. To check when planning:

- The free plan's limits then (static requests have been free and
  unlimited; builds a month, files per site and file size are capped).
  Cloudflare now points new sites to Workers static assets, as the audio
  Worker uses, so compare the two.
- `vercel.json` moves: the security and cache headers to a `_headers`
  file, deploying only `main`, and the old domain's redirects, which can
  go altogether if this comes after 2026-12-10.
- The switch: deploy there first, test it on its own address, then point
  baheardle.com at it; saves are per domain, so the domain must not
  change.

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
