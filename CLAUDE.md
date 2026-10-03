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
- **Private**: no cookies, ads, analytics or tracking. Without an account
  everything is kept in the player's browser; an optional account keeps
  only what the privacy policy (`/privacy`, `src/content/privacy.json`)
  lists. The policy, the About box and README Privacy section promise
  this, so don't add anything that breaks it, and change the policy first
  if what's kept changes.
- **Cheap to run**: free tiers only (Cloudflare Workers and R2), so every
  change is checked for requests, bandwidth and storage.
- **Fair**: the answer is kept out of the page source, DevTools requests and
  saves, so it isn't a glance away.
- **Polished**: works on phones, keyboard-only play, well tested.

### How it works

- A static single-page app: React 19 + Vite + TypeScript, styled-components,
  Vitest (jsdom). Node 24 (`.nvmrc`). No backend but the multiplayer rooms.
  One bundle, seven HTML pages written from `index.html` by a Vite plugin
  (`src/constants/pages.ts`): the hub at `/` and `/ost`, `/voice`,
  `/picture`, `/students`, `/multiplayer`, and `/privacy` (the policy, off
  the game bar, linked from the footer), each with its own title,
  description and link preview. `usePage` moves between them with the
  History API, so there's no reload or new request.
- **Site** on a Cloudflare Worker with only static files (`site-worker/`,
  `ba-heardle-site`, baheardle.com as its Custom Domain; www redirects by
  a Redirect Rule). CI deploys it from `main` only, after every check
  passes (`npm run deploy:site` by hand). Long cache headers in
  `public/_headers` to spare requests. It also sends security headers: a
  Content-Security-Policy allowing only the site, the three Workers and R2 (a
  new outside address must be added there, or it's blocked), no framing by
  other sites, nosniff, no-referrer, HSTS. `npm run preview` and the page
  check serve the build with `wrangler dev`, headers and all. It moved
  from Vercel Hobby (Group 8); the old Vercel project stays, unconnected to
  GitHub, only for the old domain's redirect.
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
- **The game's own files** give the pictures, voice lines and music
  (`scripts/lib/gameFiles.mjs`, README "The game's files"): BA-AD downloads
  them from JP's servers, BA-AX opens the voice zips and UnityPy
  (`scripts/extract-game-files.py`) the asset bundles, all pinned; SchaleDB
  names them (DevName, PathName) and gives the data and lines' text. Halos
  stay the Fandom wiki's (flat; the game's sit in perspective), a new one
  drawn from the student's sprite (`scripts/lib/spineHalo.mjs`), or their
  3D model's halo mesh when the sprite has none (`modelHalo.mjs`), until
  the wiki has it. A missing picture or line falls back to SchaleDB or
  the wiki and is listed in the pull request, which warns in bold if the
  game's pictures aren't there at all or over a tenth of a kind are
  missing. Sheets and portraits are redrawn only when their pictures'
  pixels change (`pictures/sources.json`). Locally: `pip install -r
scripts/requirements.txt`, `BAAD` and `BAAX` pointing at the tools.
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
- **Accounts** (`docs/accounts.md`, approved; built a step at
  a time, each only once the user approves it): `ba-heardle-accounts`
  (`accounts-worker/`, logic in `src/accounts/`), a Worker with the D1
  database of accounts, Google/Discord identities and sessions. Sign-in is
  a redirect (no provider scripts, no cookies); the session token lives in
  localStorage, travels only in an Authorization header, and is never
  logged or put in an address. On wherever the build has an accounts
  address: baheardle.com (`api.baheardle.com`, `.env.production`), the
  preview built from `main` (`.env.preview`, also production's
  `api.baheardle.com`, which has no workers.dev address) and the dev
  server (`npm run accounts`, with stand-in sign-in pages). For measuring
  unreleased account changes on Cloudflare, a separate preview stack
  exists: `ba-heardle-accounts-preview` (workers.dev) on its own D1
  database `ba-heardle-accounts-preview`, with its own keys, sharing its
  room key with `ba-heardle-rooms-preview`. Its config lives only on the
  unreleased branch `chore/accounts-preview` (a preview site built from
  that branch uses it); it was never released. Deployed, it takes only the site's own pages
  (`SITE_ORIGINS`); localhost only with `npm run accounts` (`LOCAL_DEV`).
  An empty `DISCORD_CLIENT_ID` or `GOOGLE_CLIENT_ID` turns that sign-in off. CI deploys it from
  `main` before the rooms and the site (`npm run deploy:accounts`: Time
  Travel bookmark, migrations, Worker); `npm run accounts:measure` and
  `scripts/measure-accounts.mjs` measure what each request costs D1.
  Step 2 adds the profile in the account (`profileSync.ts`: the later
  change wins, by `profile.editedAt`; a pick not unlocked here is kept;
  `profiles.summary` is a cache from the saves, never read back). Step 3
  the progress (`progressSync.ts`): the save in the account by revision,
  merged on a 409 with `mergeSaves`, both sides backed up before a merge,
  the browser's save changed only before the page draws (a signed-in page
  waits up to 5 s). Since Guest limits an account starts fresh: the first
  sign-in in a browser deletes its guest progress (asked first, if any was
  played) and takes the account's, nothing merged in, and the profile
  waits until it has; sign-out and Delete account always clear the
  browser back to a new guest.
  Step 4 the room pass (`roomPass.ts`, both sides): `GET /room-pass`, the
  public id, name, favourite student and the cosmetics the account's
  missions (`missions_cleared`, sent with the profile) unlock, signed
  with `ROOM_PASS_KEY` for 12 hours, checked by the rooms Worker with no
  call to D1, kept in the page's memory only; kicks keep the account out
  and it comes back from any device (`PROTOCOL` 5). Step 5 privacy: the
  policy page; Download my data (`GET /me/data`, one readable JSON file)
  and Delete account (`DELETE /me`, one D1 batch, asked twice, then keep
  or clear this browser's copy) on the Account tab; a daily cron deleting
  accounts unused for two years (`tidyAccounts`); retired missions and
  cosmetics and `src/content/ids.lock.json`.
- **Multiplayer rooms** on the one other Worker that runs code, `ba-heardle-rooms`
  (`rooms-worker/`, `VITE_ROOMS_URL`): a SQLite-backed Durable Object per
  room, over a hibernating WebSocket, on the free plan's daily limits
  (100,000 requests, 100,000 rows written; they reset at 00:00 UTC and are
  refused, never billed, past them). The room holds the answers and marks
  them; the messages are in `src/types/room.ts`, the rules in
  `src/helpers/room.ts` (shared with the Worker), the page's side in
  `src/hooks/useRoom.ts` and `src/components/Multiplayer/` (a lazy chunk).
  A change to the messages bumps `PROTOCOL`. The flows and costs are in
  `docs/multiplayer.md`. CI deploys the rooms from `main` just before the
  site; `npm run deploy:rooms` by hand, `npm run rooms` locally, and
  `npm run deploy:site-preview` publishes a branch to
  `ba-heardle-site-preview` to try it on the real network.
- CI (GitHub Actions) runs format, lint, typecheck, tests, `check:audio`, a
  build and `npm run check:pages` (`scripts/check-pages.mjs`: every page on
  Global and JP in headless Chrome, failing on page errors, failed loads and
  any picture cut squashed, outside or blank from its sheet, and on any
  cookie, frame or script but the build's own) on every push to `main` and
  every pull request. `.github/workflows/live-check.yml` runs the page
  check on baheardle.com daily and after each deploy, as a Cloudflare
  dashboard setting can add a cookie or script without a push. `.github/workflows/content-update.yml`
  (Wednesdays) downloads the game's music with BA-AD (pinned,
  `npm run download:music`), looks for new students, voice lines, halos and
  tracks, from the game's files with names from the wiki
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
  Its player keeps one fixed layout and its own volume (`jukeboxVolume`); the repeat button cycles off / next
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
  card, Now in Global (or JP) and birthdays this week, and a wide
  Multiplayer card (an arcade behind it) under the four games.
- **Game bar** (`GameSwitch`): Home, OST, Voice, Picture, Students,
  Multiplayer, as real links; the picked one shows its name.
- **Multiplayer** (`/multiplayer`): private rooms of 2 to 8 playing the
  OST, Voice or Picture game together, as in Anime Music Quiz. A four-letter
  code or link; a name and a student picture per player; the host's
  settings (game, typed or 4-Choice, 5-30 rounds, 5-40 s, start, the
  OST's albums, Voice's title calls only, server, most players, Open,
  Password or Locked) in a pop-up, kept as presets (twenty, shared as
  `BA2.…` codes; `BA1` still reads). Submit, or Skip a round. Each round everyone hears the same
  song from the whole file (a 3-2-1 before the first), answers and changes
  it freely until the time's up (the latest the room took counts, its time
  shown live on every card), then the reveal takes the stage. A point per
  right answer, ties to the faster; standings with a podium, back to the
  lobby after 30 s. Kick, End game by a majority vote, idle lobbies closed
  after 10 minutes, a token per tab to come back after a drop or reload.
  Nothing takes a player out of a room by a slip (the bar, Back, the
  Jukebox and reloads wait). The page before a room is laid out as the
  lobby: the player's card (name and picture from the profile, the
  picture changeable for the visit), then two big cards with the hub's
  scenes behind them, Join a room (Paste reads a code or a link) and Make
  a room with the settings as chips; picked
  albums read as runs ("Vol.1-8"). When an allowance runs out it says
  Multiplayer is resting until tomorrow; the rest of the site doesn't
  depend on it. The lobby is a ticket (code, settings as chips) over the
  players' cards, two to a row, in the middle column (the page's right
  kept for a chat later); the rounds and podium use the same cards. Its page has its own background, the Game Development
  Department's room (`ROOMS_SCENE`), over streak places and seasons.
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
  one of four lobby lines (`voices/`, 1,368 in all, from the game's files,
  picked by SchaleDB's voice.json; on the
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
- **Picture** (`/picture`): name the student from a halo (Fandom wiki, or
  the game's sprite or 3D model until the wiki has it) or a weapon (the game's files),
  Halo or Weapon picked above the game. One answer per
  picture, any student it belongs to is right. Daily, Classic with Voice's
  hints (or none), 4-Choice and Time Attack, each with a Silhouette toggle;
  sheets on the Worker (`scripts/build-guess-pictures.mjs`).
- **Sensei card** (Sensei card on the profile): the record across every mode
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
  the student games' server, and Reset stats for the game and mode on
  screen (asks twice). The player name and favourite student are set in
  the profile's Customize (`src/helpers/playerName.ts`): the name drawn as
  "… Sensei" on the card and every share picture by `makePicture` (a
  switch leaves the "Sensei" off; `pictureName`), and both sent to a room
  only when the player makes or joins one.
- **The save's format** (`src/helpers/saveFile.ts`), as an account keeps
  it; there's no save file to export or import since Guest limits (an
  account keeps and moves progress). Format 2 (`saveFormat.ts`):
  every round has an id and when it was dealt (`roundId.ts`, 48 bits;
  older rounds get one made from their slot, place and contents, once, at
  load), OST songs as theme numbers, multiplayer games as a list
  (`roomGames`) beside the old counts; `mergeSaves` (`saveMerge.ts`) puts
  two devices' copies of an account's together. Format 1 data still reads.
- **Characters**: Arona (light) / Plana (dark) / Mari, Shiroko,
  Hoshino, Hina, Aris, Mika, Yuuka, Kayoko, Aru, Kazusa, Kei, Rio and
  Azusa unlocked by missions
  (`cosmetics.json`), drawn with Spine, react to guesses; Arona and Plana can be held and stroked,
  all tapped. Wide screens only.
- **Streak places**: every 10 wins in a row moves the background somewhere new
  in Kivotos, up to the sky at 100; a loss sends it back to the Trinity library.
  The places, the home background, the hub's card scenes and Multiplayer's
  background are content (`src/content/page-pictures.json`).
- **Seasons**: through the year the home background becomes the time of
  year's scene: both anniversaries (JP 1-7 Feb, Global 4-12 Nov),
  Valentine's, cherry blossom, beach, summer festival, Halloween, autumn
  leaves, a Christmas lodge (18-26 Dec) and a New Year shrine (31 Dec -
  7 Jan), the library between; from the Worker (`src/constants/seasons.ts`,
  the README's calendar).
  Streak places still win from 10 wins. `?season=<id>` previews one in dev.
- **OST badges**: Vol.1-8, earned by guessing every song on an album. On
  the profile (beside its table by game, and on its OST tab).
- **Missions** (☰ Missions): 73 one-off missions, a tab per game, each
  unlocking one reward, each tab its starters then a ladder per kind of
  goal, easiest first (the file's order is the pop-up's), worked
  out from the saves on both servers (`src/helpers/missions.ts`, list in
  `src/constants/missions.ts`, ids never renamed), each counting one of
  the game's own counts or a rule made of games, ways to play, server,
  result, tries, clip and clock (`missionRules.ts`), kept once cleared in
  their own key and the save file; a toast after the round that clears
  one. Multiplayer's from a local count of games finished and won. Some
  unlock cosmetics (`src/content/cosmetics.json`, drawn in code): Sensei
  card titles (and colours, everyone's since 2026-10-03) and cursor effect colours
  (Settings), characters beside the game, and the profile's banners,
  frames and backgrounds (Customize). `COSMETIC_KINDS` lists every kind.
  A guest (no session, `isGuest`) sees and clears only the starter
  missions (`"guests": true`, one or two a tab) and wears only what they
  unlock now (`unlockedHere`: no former missions), with a note of what an
  account adds; whatever they cleared before outside them is locked.
- **Profile** (☰ Profile, and on the hub's record): the player's card
  (`src/components/Profile/`: their favourite student, title on a
  nameplate like the game's emblems (a picture or foil, the game's facets,
  grid or lines, a rim, a band, a tag, an emblem in a ring, as a crest or
  a picture down its side), a frame drawn from the parts its entry lists
  (a border, glows, corner ornaments as SVG shapes or pictures, shared or
  each corner's own), a background scene from the Worker; emblem and
  corner pictures, PNG or JPG made small, in `pictures/emblems/`) and their record from the saves
  (`profileStats.ts`): totals, a table by game, and a tab per game with its
  ways to play, daily spread, tries, Time Attack or find times. Customize
  sets the name and picture and picks the cosmetics, the card kept in
  sight; the overview and the OST tab show the OST badges. The card and
  tabs stay put over the scrolling page, the panel one height (`PopUp`'s
  `head` and `fixed`). A lazy chunk. The same card
  (`PlayerCard`) shows every player in a room: yours as you dressed it,
  read in your browser; other players' with what the room says they
  wear: a guest's as their page sent it (each checked to exist), a
  signed-in player's from their room pass. Tapping a signed-in player's
  card in the lobby or standings opens their profile
  (`docs/room-profiles.md`): their card, verified record and their saves'
  summary marked unverified, found by a ticket the room signs (`PROTOCOL`
  7), guests can look, and the Account tab has a switch to hide it.
- **Verified stats** (`docs/verified-stats.md`, Phase 1), signed in only:
  a record the server keeps itself, apart from the saves. Each of the 11
  dailies (OST; Voice, Halo, Weapon, Gameplay, Lore on Global and JP)
  asks `POST /verified` to issue its attempt as it first plays and sends
  its moves at the end, judged by the shared rules
  (`src/helpers/verifiedDaily.ts`, `roundRules.ts`) on the account's
  daily time zone; late finishes up to the next day, abandoned ones
  closed lazily, verified streaks. Rooms sign a `room-result` receipt for
  each signed-in player's finished game, on their own connection only
  (`PROTOCOL` 6), which the page brings to the account. The page's side
  is `verifiedPlay.ts`/`verifiedSync.ts` (its own `verified` key, never in
  a save, sync or merge), a line under each daily's result, and the
  profile's Verified tab. Endless, Time Attack, missions and leaderboards
  stay out; verified isn't cheat-proof, as the policy says.
- **What's new** pop-up after updates, the welcome/How to play pop-up, About
  with a privacy notice and a Ko-fi card.
- **Keyboard play**: type anywhere to search, Space plays, Enter picks/submits,
  Shift+Enter skips, Esc closes.
- The answer is hidden from the page source and saves are scrambled.
- SEO: a canonical, title, description and Open Graph/Twitter card on each
  page, `robots.txt`, `sitemap.xml` (the seven pages). Each page has its own
  link preview (1200×630, `public/preview.jpg` for the hub with the five
  games, `public/previews/<page>.jpg` with that game's ways to play;
  `preview` in `pages.ts`; Mari (Idol), no counts, in her dress's
  colours). They and the icons (her flustered face on charcoal) are drawn
  by `scripts/make-preview.mjs` from the pages in `scripts/preview/`.

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
  favicon shrank). Previews on Vercel were never used; the sitemap was
  sent again in Search Console.
- **29 Sep 2026, hotfix** (`fix/halo-sheet`, main baf14f1): Global's halo
  and silhouette pictures were cut from the sheet by Global's count; sheets
  hold both servers' pictures, so they're sized by the sheet's count.
- **29 Sep 2026, the game's own files released** (fast-forward of
  `feat/model-halos`, stacked on `ci/smoke-check`, `fix/song-artists` and
  `feat/game-assets`): the Chrome page check in CI and the weekly Action;
  Nor credited for #102 and #170, half-named songs following the wiki, and
  new tracks from the game's music; icons, portraits, weapons and new voice
  lines from the game's files (BA-AD, BA-AX, UnityPy), with Anna's and
  Erina's lines and halos; a new halo from the sprite or 3D model until
  the wiki has one; SchaleDB as the fallback for every picture. `npm run
songs` put the new files on the Worker and R2 first. About 0.3 KB gzipped
  more on the first load, no new requests or files on Vercel. The weekly
  Action's first run with the game's tools is Wednesday 30 Sep.
- **29 Sep 2026, Group 8 released** (main bed409f, then 907d8f8): the site
  moved from Vercel to the static-assets Worker `ba-heardle-site`, with
  baheardle.com as its Custom Domain; CI deploys `main` once every check
  passes, and the page check runs under the real headers. Cloudflare's Web
  Analytics beacon, found by the page check on the domain, was turned off.
  No new files for players; Vercel now only redirects the old domain.
- **1 Oct 2026, Group 7 released** (fast-forward of `feat/multiplayer`):
  Multiplayer, private rooms for the OST, Voice and Picture games on the
  rooms Worker's Durable Objects, after the user and a friend played it on
  the preview and eight rounds of feedback. About 2 KB gzipped more on the
  first load; the Multiplayer screens are a 19 KB gzipped chunk loaded only
  on `/multiplayer`. One more HTML page on the site Worker (73 files), no
  new files on the audio Worker or R2. The page's CSP gained the rooms'
  `wss://` address, and the sitemap `/multiplayer` (send it again in
  Search Console).
- **1 Oct 2026, page-check guard, scenes and previews released**
  (fast-forward of `feat/page-previews`, stacked on `feat/multiplayer-scene`
  and `ci/privacy-guard`, main 4a460a1): the page check fails on any cookie
  or script not from the build, and `live-check.yml` runs it on
  baheardle.com daily and after each deploy; the hub's Multiplayer card has
  the arcade behind it and `/multiplayer` the Game Development Department's
  room; each page has its own link preview, and the README a logo header.
  Their three pictures were already on the Worker and R2. Five preview
  pictures more on the site Worker (78 files), fetched only by link-preview
  sites; no new files on R2, and about the same first load.
- **2 Oct 2026, accounts released** (fast-forward of `feat/preview-measure`,
  with everything stacked since 4a460a1): seasons all year, missions and
  cosmetics, content files, Shiroko, Hoshino, Hina and Aris, the room
  feedback, the ticket lobby and room cards, the profile and Customize,
  save format 2, and accounts (Google and Discord sign-in, the profile and
  progress in the account, room passes, `/privacy`, download and delete),
  measured on the preview first (`docs/accounts.md` section 6). Rooms
  went from `PROTOCOL` 3 to 5, with one new `ROOM_PASS_KEY` on the
  accounts and rooms Workers. The season pictures were already on the
  Worker and R2. About 22 KB gzipped more on the first load, still six
  files; 101 files on the site Worker (a `/privacy` page and lazy
  chunks); no new files on R2. Google's app is published, and the
  sitemap sent again, once `/privacy` is live. The same day,
  `fix/account-tab-reads`: the Account tab stays once opened, so
  switching the profile's tabs reads the account once, not every visit.
- **2 Oct 2026, verified stats released** (fast-forward of
  `docs/verified-release`, main ff43d5d, stacked since 898ac8a): verified
  dailies for all 11 dailies, verified streaks, room receipts
  (`PROTOCOL` 5 to 6), the profile's Verified tab, and the policy, About,
  README and What's new to match. CI took D1's Time Travel bookmark,
  applied migration 0005 (four `verified_*` tables), then deployed the
  accounts (7911ced9), rooms (de1692da) and site (fbaa6a73); rollback
  points accounts efba5689, rooms bdd22dbf, site f22bc2d3, main 898ac8a.
  Measured first on the Cloudflare preview with its own accounts Worker
  and D1 (`ba-heardle-accounts-preview`, config kept on the unreleased
  `chore/accounts-preview`). About 2.5 KB gzipped more on the first
  load, still five files; 103 files on the site Worker (two lazy
  chunks); no new files on R2.
- **3 Oct 2026, cosmetics, guests and room profiles released**
  (fast-forward of `feat/more-characters`, main b7d79da, stacked since
  ff43d5d): profiles from a
  card in rooms (`PROTOCOL` 7, migration 0006), the local admin tool
  (not in the site's build), guest limits (starter missions for guests,
  a fresh account, no save file), 73 missions with one reward each,
  banners as nameplates, moving cosmetics and name effects (`PROTOCOL` 8,
  migration 0007), and Mika, Yuuka, Kayoko, Aru, Kazusa, Kei, Rio and
  Azusa. Room profiles were measured on the Cloudflare preview on
  2026-10-02; name effects in rooms, 0007 and the rest were tried there
  on 2026-10-03 (migration 0007 on the preview's database alone; the user
  signed in with Google, played a daily, wore a name effect and a banner,
  picked a new character, and played a room with a guest who tapped
  their card), all fine. Measured against `main`: about 8 KB gzipped more on the first
  load, still five files; 127 files on the site Worker (24 more, the
  eight characters' sprites, 5.5 MB, cached for a week and fetched only
  by whoever picks one); 18 new pictures for the audio Worker and R2
  (banner and card scenes, the anniversary backdrops, 681 KB), put up by
  `npm run songs` before the merge. CI took D1's Time Travel bookmark
  (`0000002b-00000000-000050f9-726e10cd1f653b8ef55cf80d995cb7da`),
  applied migrations 0006 and 0007, then deployed the accounts
  (65aed4c9), rooms (26958f18) and site (66bc3551); the live-site check
  after it passed. Rollback points accounts 38537a37, rooms 9da33fc0,
  site f19f3008, main 15f61ae.

## Content files

Seasons, missions and what they unlock, OST badges, What's new and the
privacy policy are JSON in `src/content/` (its README has every field),
read by thin loaders in `src/constants/`; `src/content/content.test.ts`
checks them all. Add one there, never in a component. A new season: its
entry, then `npm run seasons` (makes missing pictures from the backgrounds
it names) and `npm run songs`. Never rename or remove a mission or
cosmetic id (saves and accounts keep them): mark it `"retired": true`, and
add every new id to `ids.lock.json`, which the content test holds them to. (Paused while
only the user plays, their word on 2026-10-03: released ones may be
removed or renamed, `ids.lock.json` with them, until they say players have
come or the accounts show others.)

## Commands

```sh
npm run dev          # local server
npm run accounts     # the accounts Worker locally, for sign-in in dev
npm run admin        # the admin tool: edit the content files, with previews
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
  what the release adds in requests, bandwidth and storage (check cache
  headers): files per Worker (20,000 on the free plan) and anything on R2,
  which can charge. The user watches the free limits closely.
- When a release has something players should know, add an entry at the top of
  `WHATS_NEW` in `src/constants/whatsNew.ts` with a new id. Only what players
  notice (a new game or mode, new students, a change to how something
  plays), never how the site is built or where its files come from.
- Don't commit raw art folders.
- Keep single fixed 16-second clips. No AAC fallback (iOS older than 18.4 can't
  play Ogg; that is accepted).
- The footer doesn't link to GitHub; support goes through Ko-fi (`KOFI_URL`).
- Don't move `DAILY_EPOCH`: it renumbers every puzzle and reshuffles the songs.
- Match the surrounding code: doc comments explain _why_, in plain sentences.

## Dates to remember

- **After 2026-12-10**, when bluearchive-heardle.xyz expires (not being renewed):
  remove the README note about the old address; the user deletes the old
  Vercel project (it only redirects the old domain) and the old domain's
  Google Search Console property.

## Plan

The features agreed with the user, the order to build them in, and the ideas
turned down live in `docs/plan.md`. The line below imports it, so it loads every
session; keep it up to date there.

@docs/plan.md
