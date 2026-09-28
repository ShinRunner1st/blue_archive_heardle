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
  Vitest (jsdom). Node 24 (`.nvmrc`). No backend.
- **Site** on Vercel Hobby (project "ba-ost-guess"), deploying from `main` only.
  Long cache headers in `vercel.json` to spare requests.
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
- CI (GitHub Actions) runs format, lint, typecheck, tests, `check:audio` and a
  build on every push.

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
  streak; no badges, no song record.
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
  `Jukebox` stays mounted and holds the audio: in the student game the music
  plays on after it closes, in a corner `MiniPlayer`; in the OST game closing
  stops it.
- **Students** (the switch under the header picks OST or Students; Daily and
  Endless work for both): guess a student and each guess shows how it
  compares with the answer, right, close or wrong, with arrows for numbers.
  No limit on guesses; Give up, pressed twice, is a loss. **Gameplay**
  (school, role, damage, weapon, EX cost at level 1, release; 262 answers,
  every costume its own) or **Lore** (height, school, birthday, year, weapon,
  favourite SSR gift, club, release; 144 default costumes). Each keeps its
  own daily and endless stats and streak, and the streak moves the
  background. Squares-only share text; a share picture (daily ones name
  nobody) and a Share recap in stats (`src/helpers/picture/studentPicture.ts`).
  Gameplay also compares the defense type; damage and defense cells show a
  dot in the type's colour (`src/constants/typeColors.ts`). The search box stays at
  the top (the play area is top-aligned here), with Give up always beside
  it. School, role and gift cells show icons from a second sheet
  (`pictures/students/clues.webp`), names under them up to 9 letters;
  Sakugawa has Schale's emblem.
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
  player name (drawn as "Sensei …" on every share picture by `makePicture`,
  used for nothing else; `src/helpers/playerName.ts`).
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
- SEO: canonical, Open Graph/Twitter card (`public/preview.jpg`, 1200×630),
  `robots.txt`, `sitemap.xml`.

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

## Commands

```sh
npm run dev          # local server
npm test             # vitest
npm run format:check && npm run lint && npm run typecheck && npm test && npm run build
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
- Before merging, run the full check above, and measure what the release adds in
  Vercel requests, bandwidth and storage (check cache headers). The user watches
  the Hobby limits closely.
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
