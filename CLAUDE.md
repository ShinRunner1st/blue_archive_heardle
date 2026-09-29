# CLAUDE.md

Notes for Claude Code, loaded at the start of every session. The README has the
full details (Development, Adding a song, Audio, Characters, Project layout,
Deploying); this file is the short version plus the house rules.

## About this project

**Blue Archive Heardle** is a free, unofficial fan game for players of Blue
Archive (NEXON Games / Yostar). Like Heardle, it plays a short clip of a song
from the game's soundtrack and the player has six tries to name it; every wrong
guess or skip lets them hear more. It also has a student game, like the other
Blue Archive "-dle" games. Live at https://baheardle.com (moved from
bluearchive-heardle.xyz on 2026-09-27).

It is made and run by one person, ShinRunner1st (GitHub repo
ShinRunner1st/blue_archive_heardle, MIT licence). Players come from the Blue
Archive community; updates are announced on X in English and Japanese. There
are no ads; the only money is optional tips on Ko-fi.

What the project cares about:

- **Feels like Blue Archive**: its cursor, characters, Kivotos backgrounds,
  mission-style wording, OST album badges.
- **Private**: no accounts, cookies, ads, analytics or tracking. Everything is
  kept in the player's browser. The About box and README Privacy section
  promise this, so don't add anything that breaks it.
- **Cheap to run**: free tiers only (Vercel Hobby, Cloudflare Workers and
  R2), so every change is checked for requests, bandwidth and storage.
- **Fair**: the answer is kept out of the page source, DevTools requests and
  saves, so it isn't a glance away.
- **Polished**: works on phones, keyboard-only play, well tested.

### How it works

- A static single-page app: React 19 + Vite + TypeScript, styled-components,
  Vitest (jsdom). Node 24 (`.nvmrc`). No backend. One bundle, five HTML
  pages written from `index.html` by a Vite plugin (`src/constants/pages.ts`):
  the hub at `/` and `/ost`, `/voice`, `/picture`, `/students`, each with its
  own title, description and link preview. `usePage` moves between them with
  the History API, so there's no reload or new request.
- **Site** on Vercel Hobby (project "ba-ost-guess"), deploying from `main` only.
  Long cache headers in `vercel.json` to spare requests. It also sends
  security headers: a Content-Security-Policy allowing only the site, the
  two Workers and R2 (a new outside address must be added there, or it's
  blocked), no framing by other sites, nosniff, no-referrer.
- **Audio** on a Cloudflare Worker
  (`https://ba-heardle-audio.shinrunner1st.workers.dev`, set in
  `.env.production`). Originals in `audio/`; `npm run build:audio` makes a
  16-second clip and a full song per theme into `audio-dist/` (not committed),
  named with a salted hash (`src/helpers/audioFiles.ts`). Files are fetched
  whole into blob URLs (`src/helpers/audioSource.ts`) because the Worker doesn't
  answer Range requests. If the Worker fails, the same files come from a
  backup on Cloudflare R2 (bucket `ba-heardle-audio` at
  `https://audio.baheardle.com`, `VITE_AUDIO_BACKUP_URL`); R2 can charge past
  its free amounts, so it stays off the normal path. `npm run songs`
  rebuilds, uploads to both and checks them; run it before merging any song
  or picture change.
- **Pictures on the Worker**: pictures that only show at times (the seasons)
  live in `pictures/<folder>/`; `npm run build:pictures` copies them into
  `audio-dist/pictures/` with fingerprinted names (`src/constants/pictureFiles.ts`).
  `scripts/make-backdrop.mjs` makes a backdrop from a game scenario background.
- **Game state** lives in `src/hooks/useGame.ts` (daily, classic endless,
  4-choice) and `src/hooks/useTimeAttack.ts`; each mode saves to its own
  localStorage key (`src/helpers/storage.ts`, scrambled by `obscure.ts`,
  validated on load so a bad save never breaks the page). `GameMode` in
  `src/types/mode.ts` lists the modes; the header shows Daily/Endless and a
  switch above the game picks Classic, 4-Choice or Time Attack.
- **Daily** song comes from `src/constants/dailyOrder.ts` (only ever appended
  to) and the day number from `src/helpers/daily.ts` (`DAILY_EPOCH`).
- **Student data** is copied from SchaleDB by `npm run students` (checked by
  `src/helpers/studentData.ts`; it stops if the format changes) into
  `src/constants/students.ts`, with each way to play's daily schedule in
  `studentDailyOrder.ts` (only ever appended to) and every icon in one sheet,
  `pictures/students/icons.webp`, on the Worker. State lives in
  `src/hooks/useStudentGame.ts`, a localStorage key for each way to play and
  mode.
- **Characters** are Spine 4.2 skeletons in `public/spine/`, drawn by
  `src/helpers/spineStage.ts`, loaded only on wide screens.
- **Now in Global** (the hub) reads `now.json`, both servers' pickups, event
  and raids, from a second static Worker, `ba-heardle-now` (`now-worker/`,
  `VITE_NOW_URL`), made from SchaleDB by `scripts/build-global-now.mjs`.
  `.github/workflows/global-now.yml` refreshes it every six hours and
  publishes only on a change; `npm run global-now` does it by hand. No R2
  copy.
- **JP server**: Students, Voice and Picture follow Global or JP
  (`src/helpers/server.ts`, Global for new players); each server has its own
  pools, daily schedules (`*_JP` seeds, only ever appended to) and saves
  (`.jp` keys, a `jp` field in the save file).
- CI (GitHub Actions) runs format, lint, typecheck, tests, `check:audio`, a
  build and `npm run check:pages` (`scripts/check-pages.mjs`: every page on
  Global and JP in headless Chrome, failing on page errors, failed loads and
  any picture cut squashed, outside or blank from its sheet) on every push
  to `main` and every pull request. `.github/workflows/content-update.yml` (Wednesdays)
  looks for new students, voice lines, halos and wiki tracks
  (`npm run find-updates`), builds and uploads them, and opens a pull request
  (`auto/content-update`) to review and merge; it never pushes to `main`.

## What the game has

- **345 songs** in `src/constants/songs.ts`, each a 16-second Ogg clip. Six
  tries; each wrong guess or skip lengthens the clip (1s → 2s → 4s → 7s → 11s
  → 16s). Wrong guesses show an arrow towards the answer's theme number.
- **Daily** (same song for everyone, streak, spoiler-free share text, a
  calendar in stats coloured by how each day went) and
  **endless** (no repeats until every song is played). Separate stats each.
- **4-Choice** (in Endless): a short clip (1-7s, player's pick, remembered;
  `CLIP_OPTIONS`) and one pick from four answers
  that sound close (same composer or nearby theme numbers,
  `src/helpers/choices.ts`), saved with the round. Own bag, stats and win
  streak; no badges, no song record. The result shows the song's card above
  the four, as the player was during the round.
- **Time Attack** (in Endless): as many songs as possible in 3 minutes, one
  try each; the player picks clip length, random start (inside the 16-second
  clip) and typed or four-choice answers. The next clip loads during the
  current one and the clock stops while a song loads. Each answer shows
  before the next song: 0.7s with the clock stopped when right, 2s with it
  running on a miss or pass (anti-spam). Quit ends a run; share text and a
  share picture at the end. Each answered song is
  saved tagged with its run; a run isn't resumed after a reload. Stats are
  per run (best typed and 4-choice). The background moves with the run's
  score. No badges.
- **Jukebox** (☰ menu): every song in full, searchable, with album chips
  like All OST's artist chips; songs guessed right in any mode are bright.
  Its player keeps one fixed layout; the repeat button cycles off / next
  song / this song, remembered. Rows come from `SongRows` (shared with All
  OST, kept light for speed) and chips from `FoldingChips`. Playing any audio pauses the rest (`src/helpers/onePlayer.ts`).
  `Jukebox` stays mounted and holds the audio: on every page the music plays
  on after it closes, in a corner `MiniPlayer` (a bar above the footer, where
  the play area ends; floating beside the game from 1344 px), until a game's
  own audio plays. Both players show the song's OST album cover (`albumOf`). Whole
  songs are kept in Cache Storage (`src/helpers/audioSource.ts`, the 30
  played last) so replays make no request.
- **Hub** (`/`, `src/components/Hub/`): what the site is, a card for each
  game (a scene behind it, its ways to play, today's daily result from the
  saves), Continue for the game played last, the Global/JP choice, the
  player's record (hidden for a new player) with a button to the Sensei
  card, Now in Global (or JP) and birthdays this week.
- **Game bar** (`GameSwitch`): Home, OST, Voice, Picture, Students, as real
  links; the picked one shows its name.
- **Students** (`/students`; Daily and
  Endless work for both): guess a student and each guess shows how it
  compares with the answer, right, close or wrong, with arrows for numbers.
  No limit on guesses; Give up, pressed twice, is a loss. **Gameplay**
  (school, role, damage, weapon, EX cost at level 1, release; 262 answers
  on Global, 275 on JP, every costume its own) or **Lore** (height, school,
  birthday, year, weapon, favourite SSR gift, club, release; 144 default
  costumes, 148 on JP). Each keeps its
  own daily and endless stats and streak, and the streak moves the
  background. Squares-only share text; a share picture (daily ones name
  nobody) and a Share recap in stats (`src/helpers/picture/studentPicture.ts`).
  Gameplay also compares the defense type. A clock starts with the first
  guess sent (a find on the first guess stays untimed) and stops on the find
  or give-up, the wall clock, saved with the round (`startedAt`, `time`); it
  shows while playing, on the result, share text and picture, and Stats
  has the fastest and average find. Guesses stay the score. The search box stays at the top
  (the play area is top-aligned here), with a grid button beside it (every
  student in the pool as icons, sorted by name) and Give up set apart from
  it. Picking a name, from the list, the grid or Random first guess (before
  the first guess; never the answer), fills the box; Enter or the Guess
  button inside it sends it, as in the OST. School, role, type and gift cells show icons
  from a second sheet (`pictures/students/clues.webp`), names under them up
  to 9 letters; types are the sword or shield on the type's colour
  (`scripts/lib/typeColors.mjs`, by SchaleDB code; a new type comes in grey
  with a warning); Sakugawa has ETC's icon, Schale's emblem.
- **Voice** (`/voice`): hear a student's line
  and name them. One line a round, whole and replayable: the title call or
  one of four lobby lines (`voices/`, 1,358 in all, from SchaleDB; on the
  Worker under hashed names). Each costume is its own answer. Daily and
  Classic give four tries, each miss or skip opening a hint: school, club,
  then a silhouette (its own sheet in a shuffled order; nothing of the
  answer is in the page before its hint). A Hints On/Off row above Classic
  picks No hints, with its own stats. 4-Choice deals its wrong three from the
  eight voices that sound most like the answer's (pitch and timbre measured
  at build time, `src/constants/voiceTones.ts`). Time Attack as the OST's,
  typed or four answers, every line or title calls only. Pick a name, then
  Enter or Guess, as in the OST; the results open upwards. The result has a
  now-playing card with the line's official English text (one JSON on the
  Worker, read after the round). Share text, share pictures and recaps for
  every mode; each picture's tag names its game and mode. State in
  `src/hooks/useVoiceGame.ts` and `useVoiceTimeAttack.ts`, a key per mode,
  in the save file.
- **Picture** (`/picture`): name the student from a halo (Fandom wiki) or a
  weapon (SchaleDB), Halo or Weapon picked above the game. One answer per
  picture, any student it belongs to is right. Daily, Classic with Voice's
  hints (or none), 4-Choice and Time Attack, each with a Silhouette toggle;
  sheets on the Worker (`scripts/build-guess-pictures.mjs`).
- **Sensei card** (☰ menu): the record across every mode
  (`src/helpers/senseiStats.ts`, read from the saves) drawn on a Schale
  licence with a favourite student's portrait (`FAV_STUDENT_KEY`, a setting,
  not in the save file); Share or Download. Lazy-loaded with
  `portraitFiles.ts`; portraits are one file per student on the Worker.
- **Birthdays**: on a student's birthday a note under the switches wishes
  them a happy one, with their icon in the student game only (the OST game
  never loads the icon sheet); a cake by their name in the student game.
  `?birthday=<month>-<day>` previews one in dev.
- **Search** by name, artist or theme number; **All OST** list with artist
  filters.
- **Result screen**: now-playing card, plays the answer from the clip's start,
  marks and replays the clip part; results worded as Blue Archive missions.
  The card shows the player's record with the song across both modes
  (`src/helpers/songRecord.ts`). Share picture draws the result on a canvas
  (`src/helpers/picture/`) and opens the share sheet or saves it; daily
  pictures never show the song. Stats has Share recap, a picture of the
  mode's record drawn with the same code (time attack's too). The answer
  only plays by itself right after the round ends on screen, never on a mode
  switch or reload.
- **Settings**: volume (remembered, 20% default), dark mode, Blue Archive
  cursor with tap and drag effects (can be turned off), character choice,
  player name (drawn as "… Sensei" on every share picture by `makePicture`
  and on the Sensei card, used for nothing else; a switch leaves the "Sensei"
  off; `pictureName` in `src/helpers/playerName.ts`), the student games'
  server, and Reset stats for the game and mode on screen (asks twice).
- **Save file**: export all modes to one scrambled file and import it on
  another device (`src/helpers/saveFile.ts`); checked like the saves, asks
  before replacing, then reloads the page.
- **Characters**: Arona (light) / Plana (dark) / Mari, drawn with Spine,
  react to guesses and can be held, stroked and tapped. Wide screens only.
- **Streak places**: every 10 wins in a row moves the background somewhere new
  in Kivotos, up to the sky at 100; a loss sends it back to the Trinity library.
- **Seasons**: the home background becomes a Christmas lodge (18-26 Dec) or a
  New Year shrine (31 Dec - 7 Jan), from the Worker (`src/constants/seasons.ts`).
  Streak places still win from 10 wins. `?season=<id>` previews one in dev.
- **OST badges**: Vol.1-8, earned by guessing every song on an album. In the
  ☰ menu.
- **What's new** pop-up after updates, the welcome/How to play pop-up, About
  with a privacy notice and a Ko-fi card.
- **Keyboard play**: type anywhere to search, Space plays, Enter picks/submits,
  Shift+Enter skips, Esc closes.
- The answer is hidden from the page source and saves are scrambled.
- SEO: a canonical, title, description and Open Graph/Twitter card on each
  page (`public/preview.jpg`, 1200×630), `robots.txt`, `sitemap.xml` (the
  five pages). The preview (Mari (Idol) and the four
  games, no counts, in her dress's colours) and the icons (her flustered
  face on charcoal) are drawn by `scripts/make-preview.mjs` from the pages in
  `scripts/preview/`.

## What has been done (history)

- **2022 - Jan 2024**: code started from msynowski/sluchajfun (credited in the
  README); the user (ShinRunner1st) made it a Blue Archive game in Jan 2024.
  Clips used to play from YouTube.
- **Dec 2025 - Jan 2026**: styling, keyboard submit, favicons, new songs.
- **15-21 Sep 2026**: SEO and sitemap, header redesign, **daily mode**, share
  text, pop-up redesign, cut ~840 KB of images.
- **23-25 Sep 2026**: clips play from own audio instead of YouTube, now-playing
  result card, volume, All OST list with artist filters, dark mode, header menu,
  theme number tags, mission-style result text, more songs.
- **26 Sep 2026**: Blue Archive cursor, Arona/Plana/Mari (Spine), streak places,
  OST badges, pop-ups that fit the screen, What's new.
- **27 Sep 2026**: answer hidden and audio moved to the Cloudflare Worker (saves
  Vercel bandwidth); keyboard play; privacy notice; What's new keeps earlier
  updates; Ko-fi link replaced the GitHub one; badge covers preload; only
  `main` deploys on Vercel.
- **27 Sep 2026, domain move** (main 17e81be): bought baheardle.com (Cloudflare
  Registrar, DNS on Cloudflare, www redirects to apex). Players start fresh
  (localStorage is per domain) and daily restarted at #1 (`DAILY_EPOCH`
  2026-09-27). The old domain 301-redirects; Google Search Console Change of
  Address passed. Announced on X in English and Japanese. The X link preview
  was slow to appear because of X's card cache; the tags are correct.
- **28 Sep 2026, Groups 1-5 released** (fast-forward of `feat/badle`): save
  file, per-song record, daily calendar, share and recap pictures, seasonal
  backgrounds, Jukebox, 4-Choice, Time Attack, the R2 backup, the student
  game (Gameplay and Lore), birthdays, the Sensei card and the song cache.
  Group 5's pictures (icon sheets and 262 portraits) went on the Worker and
  R2 first. It added about 47 KB gzipped of JavaScript to the first load,
  no first-load requests, and 0.2 MB to the Vercel deployment.
- **28 Sep 2026, follow-up** (`fix/icon-sheet` and `feat/solve-timer`): the
  student icon sheet lost its specks and became transparent (447 KB, on the
  Worker and R2 first), our own clear button in the All OST and Jukebox
  search boxes (the browser's ignored the custom cursor), and a solve clock
  for each student find.
- **28 Sep 2026, Group 6 released** (fast-forward of `feat/voice-feedback`,
  stacked on `feat/voice-lines`): Voice line mode, with three rounds of the
  user's feedback (result card, share pictures for every mode, pick then
  guess in Voice and Students, 4-Choice by voice tone, faster lists, Arona's
  faces) and security headers. `npm run songs` put its 1,305 lines, their
  text and the silhouette sheet on the Worker and R2 first. It added about
  20 KB gzipped to the first load, no first-load requests, and 64 KB to the
  Vercel deployment.
- **29 Sep 2026, 6.1-6.6 released** (fast-forward of `feat/weekly-update`,
  stacked on `feat/halo-weapon`, `feat/seo-text`, `feat/preview-picture`,
  `feat/game-pages` and `feat/jp-server`): the Picture game (halos and
  weapons), new SEO text, the Mari (Idol) link preview and icon, a page for
  each game and the hub (Now in Global on its own Worker, record,
  birthdays), JP server mode, the weekly content Action, and the Jukebox
  playing on in every game. `npm run songs` put the new sheets, portraits,
  voice lines and card scenes on the Worker and R2 first (2,342 files on
  the Worker). It added about 31 KB gzipped to the first load, no
  first-load requests (a hub visit may fetch the 3 KB portrait list, cached
  for a year), and 2 KB to the Vercel deployment (four small HTML pages; the
  favicon shrank). Previews on Vercel were never used; send the sitemap
  again in Search Console.

## Commands

```sh
npm run dev          # local server
npm test             # vitest
npm run format:check && npm run lint && npm run typecheck && npm test && npm run build
npm run check:pages  # after a build: every page on both servers in Chrome
npm run students     # after a Global update: student data and icons, then songs
```

The pre-commit hook runs format:check, lint and typecheck. Commits follow
Conventional Commits (commitlint), every line 100 characters or fewer; for a
multi-line message write it to a file and use `git commit -F <file>`.

## House rules

- Never add Claude attribution or `Co-Authored-By` trailers to commits or PRs.
- Never add `prefers-reduced-motion` handling.
- Work on a new branch for each group in `docs/plan.md`, made off the previous
  group's branch (stacked), so releases stay rare. Push only when asked. Merge
  to `main` only when the user explicitly says so: merging deploys to
  production.
- Before merging, run the full check above and `check:pages`, and measure
  what the release adds in Vercel requests, bandwidth and storage (check
  cache headers). The user watches the Hobby limits closely.
- When a release has something players should know, add an entry at the top of
  `WHATS_NEW` in `src/constants/whatsNew.ts` with a new id.
- Don't commit raw art folders.
- Keep single fixed 16-second clips. No AAC fallback (iOS older than 18.4 can't
  play Ogg; that is accepted).
- The footer doesn't link to GitHub; support goes through Ko-fi (`KOFI_URL`).
- Don't move `DAILY_EPOCH`: it renumbers every puzzle and reshuffles the songs.
- Match the surrounding code: doc comments explain _why_, in plain sentences.

## Dates to remember

- **After 2026-12-10**, when bluearchive-heardle.xyz expires (not being renewed):
  remove the two host `redirects` from `vercel.json` and the README note about
  the old address; the user removes the old domain from Vercel and deletes its
  Google Search Console property.

## Plan

The features agreed with the user, the order to build them in, and the ideas
turned down live in `docs/plan.md`. The line below imports it, so it loads every
session; keep it up to date there.

@docs/plan.md
