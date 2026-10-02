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

**6.1 to 6.6**, each on its own branch stacked on the one before (the
first off `main`). _Released on 2026-09-29 (fast-forward of
`feat/weekly-update`), after `npm run songs` put their sheets, portraits,
voice lines and card scenes on the Worker and R2. The two Actions run from
`main` from then on._

- **6.1. Halo and weapon guess**, each with normal, silhouette and Time
  Attack (see "Halo and weapon guess" below). First, since the next two
  describe the whole game and should include it. _Built on
  `feat/halo-weapon`, off `main`._
- **6.2. New SEO text** (see "SEO, header and preview picture" below).
  _Built on `feat/seo-text`, off `feat/halo-weapon`._
- **6.3. New preview picture**, the link preview, drawn once 6.1 and 6.2
  settle what it shows, and a new icon and favicon. _Built on
  `feat/preview-picture`, off `feat/seo-text`._
- **6.4. A page for each game and a hub** (see "Game pages and the hub"
  below). _Built on `feat/game-pages`, off `feat/preview-picture`._
- **6.5. JP server mode** for Students, Voice and Picture (see "JP server
  mode" below). _Built on `feat/jp-server`, off `feat/game-pages`._
- **6.6. A weekly content Action** that adds new students, voice lines,
  pictures and OSTs and opens a pull request (see "Weekly content update"
  below). _Built on `feat/weekly-update`, off `feat/jp-server`, with the
  last feedback (the Jukebox's corner player) on it._

7. **Group 7: Multiplayer** (see "Multiplayer" below). _Built on
   `feat/multiplayer`, off `docs/vercel-domains`, after the free plan's
   limits were checked on 2026-09-30, with eight rounds of the user's
   feedback. Released on 2026-10-01 (fast-forward of `feat/multiplayer`);
   the rooms Worker was first deployed by hand for the preview, and CI
   deploys it from `main` from then on._
8. **Group 8: move the site to Cloudflare** (see "Moving off Vercel"
   below). _Built on `feat/cloudflare-site`, off `main` (Group 7 isn't
   built yet, and this doesn't need it). Released on 2026-09-29 (main
   bed409f, then 907d8f8 fixing the page check), after baheardle.com moved
   to the Worker the same day._

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
   and student birthdays (built). Pictures go on the Worker (`pictures/`,
   see the README). Add a season to `SEASONS` in
   `src/constants/seasons.ts`.
   - **Seasons all year** (agreed 2026-10-01): dated events with the
     library between them, not a scene for every day (spring and autumn
     flip in the southern hemisphere, which the game can't know). Both
     anniversaries, JP's (1-7 Feb) and Global's (4-12 Nov), sharing a
     theme park at night; Valentine's, cherry blossom, beach, summer
     festival, Halloween (the night carnival by day too) and autumn leaves.
     The calendar is in the README's Seasons. _Built on
     `feat/seasons-year`, off `feat/page-previews`; 14 pictures, about
     170 KB, for the Worker and R2._

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
  Halo.png", uploaded in 2022; the user checked it's hers.
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
- **The icon** is Mari (Idol)'s face, flustered with swirly eyes
  (expression 11), from her Spine sprite on a charcoal tile. The user
  looked at drawn marks first (a note wearing a halo, her halo redrawn and
  from the halo sheet, with notes, question marks, headphones and badges)
  and at her face with a note or "?" beside it, and chose the face alone.
  It replaces fan art of Mari, which also made `favicon.ico` 150 KB: now
  11 KB, and the icons and preview are cached for a week like the
  characters.

### Game pages and the hub (6.4)

Asked for on 2026-09-29: with four games on one page, the site could only
rank for one broad topic, and a new player met a switch of four icons. Agreed:

- **Paths:** `/` is a hub; the games are `/ost`, `/voice`, `/students` and
  `/picture` (Halo and Weapon stay one page). The ways to play (Daily,
  Classic, 4-Choice, Time Attack) stay switches, not paths: pages that
  differ only by a mode would be near-copies, which search engines treat as
  doorway pages.
- **Each page's own HTML**, built from one template: its title, description,
  canonical address and link-preview tags written into the file, since X and
  Discord don't run JavaScript. One JavaScript bundle for all five: a chunk
  per game would be one more Vercel request.
- **Moving between games doesn't reload:** a navigation bar of real links
  (the game switch, and a way back to the hub) swaps the game in place, so
  there's no new request and the music and characters carry on. Back and
  Forward move between the pages too.
- **The hub:** a short paragraph on what the site is, a card for each game
  with a few words and today's daily result from the player's own saves,
  and a Continue button for the game played last.
- **Nothing is lost:** saves are per domain, not per path, so every save,
  streak and setting carries over. `baheardle.com` still works; it lands on
  the hub. Share texts link to their game's page.
- **A Vercel preview** was planned for testing (previews on for this
  branch only); in the end it was tested locally, and previews went off
  again before the merge.
- **Cost:** one HTML file per visit as now, plus four small ones in the
  deployment. The sitemap lists the five pages; send it again in Search
  Console after the release.
- **First feedback** (2026-09-29, same branch): the score reset moved from
  About to a card in Settings that names the game and mode it clears and
  asks twice; Picture comes before Students on the bar and the hub; the
  Jukebox plays on after closing on every page, until a game's own audio
  plays.
- **More on the hub** (asked for the same day):
  - **Your record** across every game, from the saves, with a button to the
    Sensei card. Hidden for a new player.
  - **Now in Global**: the pickup students (portraits), the event and the
    raids, with when each ends. Copied from SchaleDB to a second static
    Worker, `ba-heardle-now`, by a GitHub Action every six hours (publishing
    only on a change), so the page never asks SchaleDB and requests stay
    free. The user chose this over refreshing it by hand. It needs the
    `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` secrets on GitHub,
    and runs only once the workflow is on `main`; until then
    `npm run global-now` publishes it. No R2 copy.
  - **Birthdays this week**, with portraits (the portrait list is a lazy
    chunk on Vercel, cached for a year, as for the birthday note).
  - **A scene behind each card**, from the game's scenario backgrounds
    (`scripts/make-card.mjs`, 86 KB for the four, on the Worker and R2).

### JP server mode (6.5)

Asked for on 2026-09-29, once an Action could keep the data current (JP was
left out before because it was hard to maintain by hand). SchaleDB has JP
too, about 14 students ahead of Global then (277 against 263). Agreed:

- **One choice for all three student games**, Server: Global or JP, in
  Settings and on the hub; the games show a small JP tag when it's on. New
  players start on **Global**.
- Each server is its own pool, with its own daily schedule (only ever
  appended to), rounds and stats, so a Global player's saves are untouched.
- The OST already follows JP (the wiki's tracklist) and stays one game.
- **Built** (details in the README's "JP server"): 13 JP-only students then
  (275 on JP, 262 on Global). Global's pools, schedules and saves are exactly
  as before; JP's are new (`.jp` keys, a `jp` field in the save file).
- **First feedback** (2026-09-29): switching made the whole page flash and
  reload, as it started the app over; now only the games' saves reload.
  "Now in Global" becomes "Now in JP" on JP, from JP's schedule in the same
  file, and the hub's record, labels and birthdays follow the server. Anna
  and Erina had no voice lines on SchaleDB or halos on the Fandom wiki yet,
  so they wait for a later run.
- **Last feedback** (2026-09-29, on `feat/weekly-update`): the Jukebox's
  corner player covered the end of the hub and the games. It is now a bar
  in the page's column above the footer, so the play area ends above it,
  and floats beside the game only from 1344 px, where it fits.

### Weekly content update (6.6)

Asked for on 2026-09-29. A GitHub Action, weekly, that checks SchaleDB for
new students (JP covers Global's upcoming ones) and the Blue Archive wiki's
Music page (JP's tracklist, which the song list follows) for new tracks,
skipping the 10000-range special tracks. Only when something is new: it
runs the student, voice and picture scripts and adds the songs (the wiki's
title and artist; its format differs a little from the list's, so they can
be edited in the pull request), runs the full check, uploads the new files
to the Worker and R2, and opens a pull request to review and merge. It
never pushes to `main`. Needs the Cloudflare token to have R2 edit rights,
and Actions allowed to open pull requests.

Built (details in the README's "Weekly content update"): Wednesdays at
12:00 UTC. Our audio files matched the wiki's byte for byte, and the song
list's placeholders ("Theme N" by "Unknown") are its convention for tracks
the wiki hasn't named, which the Action fills in once it does. The build
scripts no longer redraw a sheet whose contents are the same, or remake a
portrait already made, so a run on GitHub's ffmpeg doesn't give players new
copies of unchanged pictures.

### Page check

Asked for on 2026-09-29, after Global's halos broke in the 6.1-6.6
release (the sheet held both servers' halos, but Global's pictures were
cut from it by Global's count): unit tests can't see a picture cut wrong.
`npm run check:pages` goes through every page on Global and JP in headless
Chrome and fails on page errors, failed loads, and any picture cut
squashed, outside or blank from its sheet. It runs in CI and in the weekly
Action before its pull request opens (details in the README's "Page
check"). Built on `ci/smoke-check`, off `main`. _Released on 2026-09-29
with the game's own files below._

### The game's own files

_Released on 2026-09-29 (fast-forward of `feat/model-halos`)._ Asked for
on 2026-09-29. The user downloads the game's media with BA-AD
(https://github.com/Deathemonic/BA-AD); the weekly Action now does too, from
JP's servers, so a new student's pictures and lines and a new track come on
the day of the update. Details in the README's "The game's files".

- **Songs** (on `fix/song-artists`): a new track's file comes from the
  game's music (all 345 were byte for byte the game's), its name from the
  wiki. A song with either half still blank ("Theme N" or "Unknown")
  follows the wiki for both title and artist; a song named in full is never
  changed by it (the wiki has typos and Japanese titles). 269, 271 and 314
  are the game's `_Title`, `_Title` and `_Short` files, not on the wiki's
  Music page. #102 and #170 are by Nor, #106 and #152 by Mitsukiyo, checked
  by the user against the OST album.
- **Everything else from the game too** (the user's "B", on
  `feat/game-assets`): icons, Sensei card portraits, weapons and voice
  lines, with BA-AX for the voice zips and UnityPy for the asset bundles,
  all pinned. The icons and portraits are the game's current art, which
  differs a little from SchaleDB's copies. Lines already made stay; new
  ones (Anna's and Erina's first) come from the game, with SchaleDB's text,
  Japanese until the English is out.
- **Data stays with SchaleDB**: the game's tables are encrypted (their key
  isn't published, and digging it out of the app was ruled out) and
  Japanese only; SchaleDB also names the files.
- **Halos stay the Fandom wiki's**, drawn flat by its editors: the game's
  sprites only have them in perspective, some nearly edge-on (Hare, Yuuka,
  Chihiro), which would be hard to name. The user chose (2026-09-29) the
  order Fandom, then the sprite, then the 3D model: a new student's halo is
  drawn from their sprite, or from their chibi model's halo mesh when the
  sprite has none, until the wiki has one. The wiki
  draws its halos from those meshes too; drawn square on they match it.
- **Safe on its own**: a missing picture or line falls back to SchaleDB or
  the wiki, listed in the pull request. If the game's pictures aren't
  there at all or over a tenth of a kind are missing, they come from
  SchaleDB too and the pull request warns in bold (the user asked on
  2026-09-29 for a fallback everywhere, not a stop); sheets are redrawn
  only when their pictures' pixels change.

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
- **Built on Cloudflare Durable Objects**, over WebSocket, one per room.
  The plan named PartyServer, a thin layer over the same hibernation API;
  the rooms use the API directly, as PartyServer would save a few lines but
  add a dependency to pin and a storage write of its own when a room wakes.
  Clips still come from the audio Worker.
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

Built on `feat/multiplayer` (details in the README's "Multiplayer" and
"Multiplayer rooms"):

- **Its own page**, `/multiplayer`, sixth on the game bar (a game
  controller) and a wide card under the hub's four, as the hub and the
  games are pages. The screens are a lazy chunk (8 KB gzipped), so a
  visit elsewhere adds under 1 KB; nothing connects until a player makes
  or joins a room, and leaving the page leaves the room.
- **The free plan, checked 2026-09-30:** a hibernating object is billed
  for duration only while it handles a message, so duration doesn't bind.
  Incoming messages count 20 to a request, outgoing are free, and alarms
  aren't requests but row writes. The tightest limit is 100,000 rows
  written a day: each player's part rides on their connection, free, and
  the room's record is written only at a phase change, about 6 rows a
  round, so about 750 games of 20 songs a day (about 30 requests each,
  under the 1,400 the plan guessed from requests alone).
- **The rounds:** dealt when the game starts; the clip plays for everyone
  once all have it or after 10 s; one answer each, revealed when all have
  answered or the time (10 to 30 s) is up; a point for each right answer,
  a tie to the faster; the answer shows 6 s, then the next loads. The four
  answers are sent only once the clip plays. The host can end a game
  early (pressed twice) and play again from the standings.
- **Coming back:** a tab keeps a token per room, so a drop or a reload
  returns as the same player, with the name typed for the room (not the
  one in Settings). The room's record keeps a roster, so a new version of
  the Worker, which restarts every room, costs a game only a moment's
  reconnect (tested by reloading the Worker mid-round).
- **Joining** only in the lobby or the standings; 4 letters for a code
  (no I or O); a new room's code taken is tried again with another.
- **When an allowance runs out**, a page that can't get in after two tries,
  or a room whose writes fail, says Multiplayer is resting until tomorrow.
- **CI deploys the rooms from `main`**, before the site, so the songs and
  lines they deal match the site's; a change to the messages bumps
  `PROTOCOL`, and an older page is asked to reload.
- **First feedback** (2026-09-30, after the user and a friend played it on
  the preview, `ba-heardle-site-preview`): the rounds now play as in Anime
  Music Quiz, `PROTOCOL` 2 (the flows and costs are in
  `docs/multiplayer.md`):
  - A song plays for the whole time to answer (5-40 s), from the whole
    file, with no controls but the volume, starting at a random spot, its
    Heardle clip's, or the top; a voice line can be replayed. A 3-2-1
    count-in first.
  - Pick, then Submit, for every kind of answer; change it until the time
    is up; a pick not sent goes by itself; once everyone has answered, 3 s
    are left to change, shown. The last change's time counts.
  - The reveal replays the song while the next finishes downloading (it
    starts as the round does), waiting 6-12 s for slow pages.
  - One layout in every phase, so nothing jumps; ties share a place.
  - Picture (halos or weapons, silhouettes or not) joins OST and Voice,
    and the room has its own Global or JP.
  - Settings in a pop-up with sliders and number boxes, sent once on Save,
    and a few words in the lobby; a new lobby with player cards and
    pictures (a student, picked before joining, or the name's letter);
    Copy link and Copy code on one row; a game needs two players.
  - Joining halfway, and coming back under the same name after the tab
    closed; an empty room is deleted after 30 s (a lobby at once).
  - Fewer writes: the room's live part rides on the connections, the
    game is written once a round, and the pages' ticks replace alarms.
    About 45 requests and 25 rows for 8 players and 20 songs, so about
    2,200 such games a day, where the first version managed 750.
  - Room spam: the Worker's rate-limit binding, 6 rooms and 40
    connections a minute per address (hashed), before a room wakes, and
    at most 40 messages in 10 s from a connection.
- **Second feedback** (2026-09-30, from a local 8-player run), `PROTOCOL`
  3:
  - The 3-2-1 count-in only before the first round; the others start a
    second after their reveal, the clock waiting full.
  - Standings redesigned: the top three on a podium, the rest in rows,
    every answer with the pictures of who named it. After 30 s everyone
    is back in the lobby by themselves (the host's Play again goes
    sooner).
  - The settings can be picked before making the room, and kept as named
    presets in the browser (six at most), from the same pop-up.
  - No Change answer button: once an answer is sent, a new pick goes by
    itself. Quick answer, a toggle each player keeps, sends the first
    pick at once too. Picks go at most one per 0.35 s, so clicking
    through the four stays far inside the flood limit.
  - A lobby with nothing happening for 10 minutes closes, everyone told
    why, after a minute's warning with "I'm still here"; on the pages'
    ticks, so no alarm or write.
  - Rejoining by name let anyone take an away player's place and score.
    Now only a token brings a player back: the tab's, or the one the
    browser keeps a few hours from a tab that closed.
- **Third feedback** (2026-09-30, from the screenshots of that run; same
  `PROTOCOL` 3, as 3 was never deployed):
  - A page sends one answer a round, two at most: Submit (or Pass, or
    the first pick with Quick answer), then, only if the player picked
    again, the pick showing as the time runs out. Picking again sends
    nothing. The time counted is when the answer reached the room.
  - Leave and End game in a round are small, at either end of a row, and
    need a second tap within 3 s.
  - Each player goes back to the lobby from the standings when they like
    (the host stays host); the room follows once all have, or after 30 s.
  - The cards' corner numbers were places, all "1" or "2" while everyone
    was tied, which read as player numbers: the corner now has a medal
    for the top three once they've scored, and the score is a big number
    on the card's right.
- **Fourth feedback** (2026-09-30, same `PROTOCOL` 3):
  - Sending only a change's time, or the page saying when a pick was
    made, was turned down: a page can claim any time. The user chose
    each change sent as it's made (their "C"): at once, then 0.5 s apart
    at least, four answers a round at most, the room stamping each, so a
    change keeps its own time. Every card shows live when its player's
    answer went and how often it changed, never what it is. About 53
    requests for 8 players and 20 songs if everyone changes once a round
    (1,900 games a day), 69 at the cap (1,450); no more rows.
  - A player who reads the bundle can still match a round's file name to
    its song, as in the other games. Separate copies with secret names
    (about 700 files, 500 MB on R2) would still leak by the song's length
    or reveals noted over games, so the user chose to accept it and give
    the host **Kick** (their browser kept out of the room, from any tab)
    and **Lock** (nobody new joins; everyone in it can still come back).
  - Nothing takes a player out of a room by a slip: the logo and game
    bar are dimmed and say to leave first, Back stays (an extra history
    entry, and a lock in `usePage`), the Jukebox waits during a game, and
    the browser asks before a reload in one. Leave in the lobby and the
    standings stays one tap.
  - What pages send: already checked field by field; names now lose
    invisible and direction characters and stacked accents, and a name
    reading as another's gets a number. A test throws thousands of random
    and broken messages at a game.
- **Fifth feedback** (2026-10-01, same `PROTOCOL` 3):
  - Timing back to the user's "A": C's "4.0s ↻3" on the cards and its
    four answers a round kept anyone from changing their mind freely.
    Now a page sends the first answer, then the pick showing as the time
    runs out if it changed (two a round, the room taking no more), and
    the room times a changed answer at the time's end however early it
    comes, so a page changed to send it sooner gains nothing. The cards
    say only who has answered.
  - Lock moved into the settings, as "Who can join": Open, **Password**
    (never sent to the pages; case, spaces and lookalikes don't count;
    the tab keeps it for a reload) or Locked; a new room can have a
    password, not a lock. It showed on a phone with a stray bullet.
  - **End game** asks the room: more than half of the players there
    must agree (both of two), within 20 s.
  - The reveal takes the stage, in place of the moving bars: a song's
    album cover, name and artist, or the student (a picture game's
    picture beside them), with the volume. The line of text that changed
    with everything each player or the room did is gone, and Pass with
    it; the lobby lost its changing notes too.
  - Presets: twenty, in a list that scrolls; the same settings saved
    again rename theirs; ⧉ copies one as a short code a friend pastes in
    with Import.
  - "Heardle clip" start is gone: it played much like Random. The game
    chips fit one row, the settings buttons are a ⚙, Copy code comes
    before Copy link, and the host's settings fit one row like everyone
    else's (who can join shows over the code).
  - Standings: solid gold, silver and bronze blocks, which were muddy on
    the day theme; only players who named one stand on the podium.
  - Screenshots and test runs always force the birthday note on, since
    it can move the layout.
- **Sixth feedback** (2026-10-01, same `PROTOCOL` 3):
  - Answers change freely, as in Anime Music Quiz (the user's pick, over
    A): each change sent as it's made, 400 ms apart at least on the
    page, one per 300 ms taken by the room, no cap, the 40 messages in
    10 s still closing a connection. The latest the room took counts,
    timed by its arrival; every card shows that time live ("3.2s"), with
    no flash or count. About 50-75 requests for 8 players and 20 songs
    with the usual changes, 400 if everyone clicks through all game.
  - The room stays the judge: no answer before the song starts, for
    another round, after the time and its grace or the reveal, and a
    tick before the time is up moves nothing. Edge cases now tested: the
    host leaving mid-vote (the ask goes with them), a leaver's vote, the
    one everyone waited on leaving (the 3 s cut), reconnecting with an
    answer, a restart with a vote or a password.
  - The volume keeps one place, a row at the stage's foot, in every
    phase (the stage is 150 px for every game now); Songs start fits one
    row.
- **Seventh feedback** (2026-10-01, same `PROTOCOL` 3): alerts float over
  the screen instead of pushing it down; the name typed for a room is kept
  for the next; each screen starts scrolled to its top (the lobby after a
  long entry opened scrolled down); the host's settings panel is a guest's
  height (a smaller gear); live times to the hundredth ("2.67s"); a room's
  password is asked for in a pop-up. The 40 messages in 10 s limit was
  per connection already, but its count lived in the room's memory, which
  a room sleeping between messages loses: it rides on each socket's
  attachment now, tested on its own (`countMessage`).
- **Eighth feedback** (2026-10-01, same `PROTOCOL` 3): the typed box is
  empty in each new round (the last round's pick filled the new box
  before it was cleared); 4-Choice keeps four empty places, a student's
  icon's size, until the song starts, in place of a line of text; a voice
  line's Play again stays hidden, in its place, until the line has played
  through once; the settings in a few words leave out the most players
  (the lobby's free places show it), so the longest (weapon silhouettes,
  4-Choice, 30 weapons, 40 s, Global) fits one row, on a phone two. The
  flood limit (40 in 10 s per connection, the 41st closing only it) and
  the answer gaps (0.4 s on the page, 0.3 s in the room, no cap) stay as
  they are, as the user confirmed.

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

Built on `feat/cloudflare-site` (details in the README's "Deploying"):

- **Workers static assets, not Pages.** Both serve static requests free
  and unlimited, with 20,000 files of up to 25 MiB (the site is about 70
  files, 5 MB) and a `_headers` file. Workers is where Cloudflare points
  new sites, and the audio and Now Workers already use it, so one tool and
  one kind of config for all three. Pages' 500 builds a month don't come
  into it: CI builds on GitHub.
- **CI deploys `main`**, as the last step of the check, so a push that
  fails a check never goes live (Vercel deployed whatever reached `main`).
  It uses the Cloudflare secrets the Now in Global Action already has.
- **Headers** in `public/_headers`, the same as `vercel.json`'s, plus
  `Strict-Transport-Security`, which Vercel added by itself.
  `npm run preview` and the page check serve the build with `wrangler dev`
  (pinned as a dev dependency), so the check now runs under the real
  Content-Security-Policy.
- **Addresses:** `/voice` serves `voice.html`, and `/voice/` and
  `/voice.html` redirect there (307, where Vercel sent 308). An unknown
  path gets the hub with a 404 status, where Vercel showed its own error
  page. The workers.dev address stays on for testing, marked `noindex`.
- **The old domain** has its DNS on Vercel, so it stays on the old Vercel
  project until it expires, its last deployment still redirecting; the
  project is only disconnected from GitHub. `vercel.json` is gone.
- **The switch**, 2026-09-29: tested on the workers.dev address (the page
  check went through it with `--url`), GitHub disconnected from the Vercel
  project, and baheardle.com's DNS records swapped for the Worker's Custom
  Domain (in `site-worker/wrangler.jsonc`). The page check on the domain
  found Cloudflare's Web Analytics beacon injected into every page (blocked
  by the CSP, but it breaks the no-analytics promise); the user turned it
  off, and it must stay off for the zone. Then www got a proxied record and
  a Redirect Rule to the apex, and Always Use HTTPS went on. The page check
  on baheardle.com passed. The merge's CI run failed the page check (the
  hub's first load had a hard 30 s wait for a quiet network, which a cold
  runner missed); with that fixed, CI deployed `main` itself.
- **Cloudflare's suggestions** (2026-09-30), all left off: Bot Fight Mode
  (a `__cf_bm` cookie and a challenge script), AI Labyrinth (hidden links
  in the pages), Page Shield (players' browsers reporting to Cloudflare),
  and security.txt for now. DNSSEC, SPF `-all` and DMARC `p=reject` were
  already on. Cloudflare's `Nel`/`Report-To` headers stay: error reports
  to the host only, nothing on a normal visit.
- **baheardle.com and www stay on the Vercel project** until it is
  deleted after 2026-12-10: the old domain's redirect is set in Vercel's
  domain settings, which can only point at a domain in the same project.
  Their DNS is on Cloudflare, so Vercel gets none of their traffic.

## Next

- **Missions** (agreed 2026-10-01, building on `feat/missions`, off
  `feat/seasons-year`): about 25 one-off missions, like the game's
  achievements, worked out from the saves, in their own ☰ Missions pop-up
  (tabs by game, a progress bar each, a Cleared stamp; the OST badges stay
  where they are), with a "Mission cleared!" toast and a count on the
  record and Sensei card. Multiplayer has missions too: the browser counts
  games finished and first places, a local key in the save file, nothing
  sent anywhere. Clearing some unlocks cosmetics: Sensei card titles,
  Sensei card frames and cursor effect colours (all drawn in code, picked
  in Settings), then new characters beside the game, each from the game's
  Spine files, a few at a time, as a second step. _The first step (27
  missions, 7 titles, 4 frames, 5 cursor colours) is built on
  `feat/missions`. The characters, picked by popularity (2026-10-01, the
  user's call to make): Shiroko, Hoshino, Hina and Aris, on
  `feat/characters` off `feat/content-data`._
- **Content files** (asked for on 2026-10-01): seasons, missions, what they
  unlock, OST badges and What's new are JSON in `src/content/`, so adding
  or removing one never touches a component, checked by a content test.
  _Built on `feat/content-data`, off `feat/missions`._
- **Accounts** (decided 2026-10-01): the user chose real accounts, a
  login (such as Discord or Google) to keep a player's data online and to
  know who plays in multiplayer, over an anonymous sync code. To plan
  after the missions: it ends the "no accounts, nothing leaves your
  browser" promise in About and the README, needs a database (D1 has its
  own free allowance, apart from the rooms'), a privacy policy, a way to
  delete an account, and a login provider's script or redirect, which the
  CSP and the page check must allow. Playing without an account stays.
  The user's answers (2026-10-02): Google and Discord, one account with
  both; the profile, cosmetics and progress in D1, settings in the
  browser; profiles and cosmetics in rooms, no levels yet; guests as
  now and never second-class; Durable Objects for live rooms only; the
  privacy policy and deletion before anyone can sign in. The full plan is
  `docs/accounts.md`, **approved 2026-10-02** with its four decisions
  (guests wear their own cosmetics; sign-out keeps this browser's copy,
  asking; accounts deleted after 2 years unused; profiles from a card
  after the first release). Built one step at a time, each only once the
  user approves it. _Drafted on `docs/accounts-plan`, off
  `feat/profile-identity`. Step 0, save format 2 (round ids, theme
  numbers, room games as a list, the merge), built on
  `feat/save-format-2`, off `docs/accounts-plan`. Step 1, the accounts
  Worker (D1, Google and Discord sign-in, sessions, linking, rate
  limits), on `feat/accounts-worker`, off `feat/save-format-2`; sign-in
  only in dev and on the preview. Step 2, the profile in the account, on
  `feat/account-profile`, off `feat/accounts-worker`. Step 3, the
  progress in the account, on `feat/account-progress`, off
  `feat/account-profile`. The mission toast fixed on
  `fix/mission-toast-menu`, off it. Step 4, room passes, on
  `feat/room-passes`, off `fix/mission-toast-menu`, guests wearing their
  own cosmetics with it (decision 1, the user's go-ahead 2026-10-02).
  Step 5, privacy, on `feat/privacy`, off `feat/room-passes`, its
  contact privacy@baheardle.com (Cloudflare Email Routing to the user's
  inbox, no mailbox of its own). Step 6, measuring: what each request
  costs D1, and accounts at api.baheardle.com, on `feat/accounts-open`,
  off `feat/privacy`; a cheaper sync (nothing sent for an unchanged
  save, no read before an upload, one upload address) on
  `feat/cheaper-sync`; the real Cloudflare preview (the D1 database, the
  Worker and its Custom Domain, Google and Discord in testing, the
  preview's own rooms) measured with the user's sign-ins on
  `feat/preview-measure` (`docs/accounts.md` section 6). The release
  waits for the user._
- **Room feedback** (2026-10-01): Skip back in a round (Pass, renamed);
  the host picks OST albums to deal from (any number) and title calls
  only for Voice (`PROTOCOL` 4, `BA2` preset codes); the Jukebox's own
  volume; the character no longer keeps the listening face after a game;
  the play area centred again on the hub and Multiplayer after Students;
  Shiroko's and Aris's faces. _Built on `fix/room-feedback`, off
  `feat/characters`._
- **A new lobby** (asked for 2026-10-01): of three mockups (a roster
  grid, a split panel, a formation like the game's squad screen) the
  user picked the split panel: the room's code, settings a row each
  with an icon, and Leave and Start on the left; wide player cards, two
  to a row, on the right. _Built on `feat/lobby-redesign`, off
  `fix/room-feedback`._ The cards keep room for the cosmetics below. The
  user found the first build plainer than the mockup (2026-10-01): each
  card now has the student its player picked faded in behind it (their
  portrait), a state chip, and Leave and Start in the panel's foot.
  The user then asked for a new design from the real page (the
  character beside it, and on a phone the settings took over half the
  screen); of three drawn on screenshots (a compact bar, a side panel
  with phone tabs, a ticket and roster) they picked the ticket, with the
  players two to a row and centred, the page's right left for a chat,
  and the Customize card as every player's card in the lobby, the
  rounds and the standings (2026-10-01). Customize lists the titles as
  rows and keeps the card in sight. Then: your own card in a room wears
  your Customize look (read in your browser, nothing sent; others keep
  the defaults until accounts), banners in the lobby and on the podium
  only, smaller round cards, and every screen checked at 1920×1080, 945
  and 911 with eight players. _Built on `feat/room-cards`, off
  `feat/profile`._
- **The profile as who you are** (asked for 2026-10-02, after trying the
  rooms): the name and picture move into Customize (the name out of
  Settings), and rooms take both from the profile, the picture changeable
  before joining; the Sensei card leaves the ☰ menu and the hub (it was
  there to share, and opens from the profile); the OST badges on the
  profile; the page before a room redesigned (your card, a Join ticket
  with Paste, a New room ticket); the ticket's strip across its whole
  top; banners as pills; picked albums as runs ("Vol.1-8"). Then: the
  badges beside the profile's table by game, and out of the ☰ menu; the
  profile's card and tabs fixed over a scrolling page, one height for
  every tab; and the page before a room as two big cards with the hub's
  scenes, Join a room and Make a room (the user's pick of three drawn
  options, over a split ticket and an empty lobby).
  _Built on `feat/profile-identity`, off `feat/room-cards`._
- **No release before accounts** (the user, 2026-10-02): everything
  stacked since 4a460a1 waits on `main` until accounts are built.
  _Released together on 2026-10-02 (fast-forward of
  `feat/preview-measure`), with the user's approval._
- **A profile in normal mode** (asked for 2026-10-01): the player's own,
  from the saves, as no one else's numbers are involved: name, banner,
  favourite student, days played, totals, a row per game (rounds, won,
  best streak, average tries, best Time Attack or fastest find), the
  OST's daily guess spread, badges and missions; and **Customize**, to
  pick the banner, frame and background unlocked, with the card's
  preview. The user approved the card, banner (with "some element on
  it": an emblem, stripes and a line), frames and Customize, and asked
  for more stats and room for more kinds of cosmetic later. _Built on
  `feat/profile`, off `feat/lobby-redesign`, with 12 more missions (39)
  to unlock them._
- **Cosmetics** (asked for 2026-10-01), unlocked by missions and shown on
  the player's own profile first: a **banner**, the title on a slanted
  strip with a picture or a foil behind it (not only a coloured pill); a
  **card frame** (first called a border; the user renamed it on 2026-10-01, and the Sensei card's frames became its colours) drawn in code with ornaments on the corners, glows or
  gradients (gold filigree, sakura, arcade neon, halo, prism), not only
  a colour; a **card background**, a Kivotos scene (small pictures on the
  Worker and R2 like the hub's, fetched only when a card shows one).
- **Verified stats** (direction approved 2026-10-02): a record the server
  keeps itself, apart from the local save, which stays personal. Phase 1
  only: verified dailies for every game and server, verified streaks,
  room results from receipts the room signs, and a Verified section on
  the player's own profile; Endless, Time Attack, missions and cosmetics
  stay personal, verified achievements are Phase 2, leaderboards later.
  Verified stops made-up, imported and replayed history; it doesn't stop
  a modified page looking answers up. The design is
  `docs/verified-stats.md`; nothing is built until the user approves it.
  _Drafted on `docs/verified-stats`, off `main`._
- **Levels, with accounts** (asked for 2026-10-01): an account level
  from the rounds and missions it has played, shown on the card.
- **Other players' profiles and cosmetics in rooms, with accounts**:
  tapping a card opens their profile, and cards show their cosmetics.
  The user chose to wait for accounts (2026-10-01): without them a room
  can check an item exists but not that its player unlocked it, and a
  profile's numbers come from the player's own browser.
- **Missions for the new rewards**: more missions, so each banner,
  background and frame has one to unlock it, in `missions.json` and
  `cosmetics.json` as now; ids never renamed. With the cosmetics above.

## Future

- **An admin page** (raised 2026-10-01, maybe): for the user or staff to
  add, upload and edit songs, missions, badges, cosmetics and characters
  without the code. The site has no server for its content, so it would
  sign in (with accounts) and open a pull request with the content files
  and pictures, as the weekly Action does, the full check and a review
  still before anything goes live; the content files already make it
  possible.
- **Chat and emotes** in rooms (asked for 2026-10-01). Emotes first: a
  fixed set, each one message (incoming messages count 20 to a request),
  a few seconds apart at most, shown on the sender's card. Free-text
  chat needs a filter and a way to report or mute, so it waits.

## Always

- Keep the song list current as new OSTs come out (`npm run songs`).
- Keep the student table current after each Global update (`npm run
students`).
- Avoid leaderboards: they need every player's scores on a server. (Accounts
  were turned down here too until 2026-10-01; see "Accounts" in Next.)

## Turned down (don't suggest again)

- Speech-bubble lines for the characters (2026-10-01): they would have to
  be written new, and lines the game never had, out of their story,
  wouldn't sound like the characters.
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
