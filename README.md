# Blue Archive Heardle

A Heardle-style game: guess the Blue Archive OST from a few seconds of music.

**Play it at [baheardle.com](https://baheardle.com/)**

<p>
  <img src="docs/screenshot-game.webp" alt="A round in progress: one wrong guess, one skip, and the clip player" width="49%">
  <img src="docs/screenshot-result.webp" alt="The result screen in dark mode, playing the answer" width="49%">
</p>

## How to play

You hear a short clip from a random point in a track. Guess the song, or skip
to hear more: each wrong guess or skip makes the clip longer (1s → 2s → 4s →
7s → 11s → 16s). You get six tries.

A wrong guess shows its theme number with an arrow pointing towards the
answer's, and turns orange when it is within 10.

### Modes

- **Daily** - one track a day, the same for everyone. Keeps a streak and
  shares a spoiler-free result.
- **Endless** - as many rounds as you like. No track repeats until every one
  has been played. A switch above the game picks how to play it:
  - **Classic** - the six tries above.
  - **4-Choice** - 3 seconds of the clip, then one pick from four answers, with
    a tap or the keys 1 to 4. The wrong answers are picked to sound close: one
    by the same composer when there is one, the rest from nearby theme
    numbers. The four are saved with the round, so a reload deals the same
    four.
  - **Time Attack** - as many songs as you can in three minutes, one try each.
    Pick the clip length (1, 2, 4 or 7 seconds), a random start inside the
    16-second clip, and typed or four-choice answers. Each clip plays as soon
    as it loads and the next one loads while it plays; the clock stops while a
    song loads. A run isn't resumed after a reload: it ends with what was
    answered, so a reload can't win time back.

Each mode keeps its own score, streak and history, saved in your browser.
4-Choice and Time Attack earn no OST badges, since picking from four (or
naming against the clock) isn't the same test.

### Finding a song

- Type a **name**, an **artist** or a **theme number** in the search box.
- Or open **All OST** (the list button beside it) to browse every song, filter
  by one or more artists, and tap one to pick it.

### Also

- **Result picture** - Share picture on the result screen draws the round as
  a picture for X, on the backdrop you're playing on, and opens your phone's
  share sheet (or saves it on a computer). A daily picture never shows the
  song; an endless one does, since that round is over for everyone.
- **Recap** - Share recap in Stats draws the mode's record as a picture in
  the same style: rounds, win rate, streaks, the guess spread, songs guessed
  and badges. It names no songs.
- **Daily calendar** - daily stats show every puzzle on a month calendar,
  coloured by how it went: greener for fewer tries, red for a loss, faint
  for a day not played. It names no songs, so it spoils nothing.
- **Result screen** - plays the answer from where your clip started, marks
  which part was your clip, and can replay just that part. Under the song it
  shows your record with it in Daily and Classic, such as "Heard 4 times ·
  guessed 3 · best in 2 tries".
- **Jukebox** - the result screen's Jukebox button (and the end of a Time
  Attack run) lists every song by OST album, Vol.1 to Vol.8 then Other, and
  plays any of them in full. Songs guessed right in any mode are bright, the
  rest dimmed; missed songs look like unplayed ones, so it never shows what is
  left in the endless bag. It opens only after a round and closes when the
  next one starts, so it can't be used to check a clip. Starting a song pauses
  any other playing on the page.
- **Volume** - set it once; it's remembered. New players start at 20%.
- **Dark mode** - in the ☰ menu. Follows your device until you pick one.
- **Blue Archive cursor** - the game's cursor, with its flash on every click
  and trail when you drag. Turn it off in ☰ → Settings to use your own.
- **Streak places** - every 10 wins in a row moves the background somewhere
  new in Kivotos, by day or by night to match the colour scheme, up to the sky
  above Kivotos at 100. Each mode keeps its own: Classic and 4-Choice count
  wins in a row, daily counts its day streak, and a Time Attack run counts its
  score, from the library again with each run. Where the next place is, and when, stays a
  surprise until you reach it; a loss sends the background back to the Trinity
  library. The places are listed in `src/constants/streakPlaces.ts`; their
  pictures are the game's scenario backgrounds, blurred and dimmed so the game
  reads over them.
- **Seasons** - from 18 to 26 December the library becomes a lodge decorated
  for Christmas, and from 31 December to 7 January a shrine at New Year, on
  the player's own calendar. A streak place still shows from 10 wins, and a
  lost streak goes back to the season's picture. The dates are in
  `src/constants/seasons.ts`; the pictures are served from the Worker (see
  [Pictures on the Worker](#pictures-on-the-worker)).
- **OST badges** - one for each official soundtrack album, Vol.1 to Vol.8,
  earned by guessing every song on it at least once, in Daily or Classic. The disc
  in the header shows each album's progress; the result screen says when a
  round adds to one. The albums' songs are in `src/constants/volumes.ts`, from their
  published tracklists.
- **Character** - on wide screens, Arona (light mode) or Plana (dark mode)
  stands beside the game and reacts to your guesses. Hold her to make her look
  at you, stroke her head, or tap her. ☰ → Settings swaps in Mari or turns
  her off.
- **Save file** - ☰ → Settings exports your progress in every mode to a
  file, scrambled like the saves, and imports it in another browser or on
  another device. The file is made and read on the device; nothing is
  uploaded. An import is checked like a save, shows what's in it and asks
  before it replaces the progress there.
- **What's new** - after an update, returning players see what was added,
  once, with the two updates before it for anyone who missed them. It stays
  in the ☰ menu. The updates are listed newest first in
  `src/constants/whatsNew.ts`; add a new one at the top, with its own `id`, to
  show the pop-up again.
- **Pop-ups** - never taller than the screen: the title and buttons stay put
  and only the middle scrolls. On a phone they rise from the bottom as a
  sheet, and every one has a ✕ in its corner.

### Keyboard

A round can be played start to finish without the mouse.

| Key           | Action                                                     |
| ------------- | ---------------------------------------------------------- |
| `A–Z`, `0–9`  | Start typing anywhere and it goes into the search box      |
| `Space`       | Play or pause the clip, or the answer on the result screen |
| `↑ ↓`         | Move through search results                                |
| `Enter`       | Pick a result, submit your guess, then go to the next song |
| `Shift+Enter` | Skip, give up on the last try, or pass in Time Attack      |
| `1–4`         | Pick an answer in 4-Choice                                 |
| `Esc`         | Clear the search box, close a pop-up                       |

`Space` types a space only while you are typing a name; in an empty search box,
or one showing the song you picked, it plays the clip.

## Development

React 19, TypeScript, Vite and styled-components, tested with Vitest. Needs
Node 22.18 or newer (`.nvmrc` pins 24).

```bash
npm install
npm run build:audio   # once: builds the audio into audio-dist/ (needs ffmpeg)
npm run dev           # http://localhost:3000
```

`npm run dev` plays the audio from `audio-dist/`. Without ffmpeg, put
`VITE_AUDIO_BASE_URL=https://ba-heardle-audio.shinrunner1st.workers.dev` in a
`.env.local` file to play the deployed audio instead.

| Script                      | What it does                                   |
| --------------------------- | ---------------------------------------------- |
| `npm run dev`               | Start the dev server                           |
| `npm run build`             | Type-check, then build to `build/`             |
| `npm run preview`           | Serve the production build locally             |
| `npm test`                  | Run the test suite                             |
| `npm run lint`              | ESLint, warnings included                      |
| `npm run typecheck`         | `tsc --noEmit`                                 |
| `npm run format`            | Rewrite files with Prettier                    |
| `npm run songs`             | After adding songs: everything below, in order |
| `npm run build:daily-order` | Extend the daily schedule                      |
| `npm run build:audio`       | Build the served audio from `audio/`           |
| `npm run build:pictures`    | Copy `pictures/` in beside the audio           |
| `npm run upload:audio`      | Upload the audio and pictures to Cloudflare    |
| `npm run check:audio`       | Check the served audio is complete             |
| `npm run check:pictures`    | Check the served pictures are up to date       |

A pre-commit hook runs the format check, lint and type-check, and commit
messages follow [Conventional Commits](https://www.conventionalcommits.org/).
CI runs all of that plus the tests, `check:audio`, `check:pictures` and a build
on every push and pull request.

### Adding a song

1. Put its audio in `audio/Theme_{themeNo}.ogg`. Themes below 10 are
   zero-padded: `Theme_01.ogg`.
2. Add its entry to `src/constants/songs.ts`:
   ```ts
   { artist: "Mitsukiyo", name: "Constant Moderato", themeNo: "1" },
   ```
3. Run `npm run songs`, and commit what it changed.

`npm run songs` needs Node 22.18 or later,
[ffmpeg](https://ffmpeg.org/download.html) (with ffprobe) on the PATH, and a
Cloudflare login (`npx wrangler login`, once per computer). It:

- extends the daily schedule, `src/constants/dailyOrder.ts`. It is only ever
  appended to, so adding songs never changes a day that has already been
  played;
- builds the new or changed audio into `audio-dist/` (see [Audio](#audio)),
  and copies the [pictures](#pictures-on-the-worker) in beside it;
- uploads it all to Cloudflare, and checks that every file is there.

Commit before merging: the game only asks for files that are already
uploaded, so the upload has to happen first, and `npm run songs` does it.

Replacing a song's audio is the same: swap the file in `audio/` and run
`npm run songs`. A new artist needs nothing else: the All OST filter and the
About credits are built from the song list. If a step is forgotten, CI fails,
and so does a test.

### Audio

The audio is served by Cloudflare, not Vercel: a Cloudflare Worker that only
serves files (`audio-worker/`). Requests for its files are free and
unlimited, and keeping 450 MB of audio out of every Vercel deployment keeps
Vercel's deployment storage small.

The originals live in `audio/`, named by theme number, and are never served.
`npm run build:audio` turns each one into two files in `audio-dist/`, which
is not committed:

- **its clip**, 16 seconds cut from a fixed point in the song. It is all a
  round downloads, about 0.2 MB;
- **the whole song**, which the result screen fetches once the round is over
  and plays from where the clip started.

The game downloads each file whole and plays it from memory
(`src/helpers/audioSource.ts`): Cloudflare's static files don't answer
requests for part of a file, which Safari needs to play from a server and
other browsers need to seek. `_headers` also allows the game, on another
address, to read the files.

Both are named with a salted hash of the theme number and a fingerprint of
the original, so a request in DevTools says nothing about the song, and a
replaced song gets new names. That lets browsers and Cloudflare keep every
file for a year (set in `audio-dist/_headers`), and a replaced song still
reaches everyone at once. Every player hears the same clip of a song. Where
each clip was cut, each song's length and its fingerprint go into
`src/constants/audioClips.ts`, which is committed; `check:audio` fails in CI
if it doesn't match the originals.

The saved rounds in `localStorage` and the daily schedule in the code are
scrambled too (`src/helpers/obscure.ts`), and the track name in the browser's
media controls is hidden. None of this is encryption: the game has to know the
answer to check a guess, so someone who reads its code closely can still find
it. It keeps the answer from being a glance away.

`src/helpers/audioFiles.ts` is the one place that decides the names, and the
game and the scripts both use it. Changing its `SALT` renames every file.
`.env.production` holds `VITE_AUDIO_BASE_URL`, the Worker's address, which
production builds read from; `npm run dev` serves `audio-dist/` itself.

A file that fails to load or decode shows an error with a retry. In endless
mode it can deal a different song instead, and the failing one is left out for
the rest of the session.

### Pictures on the Worker

Pictures that only show at times, like the seasonal backgrounds, are served by
the same Worker as the audio, so they cost Vercel nothing. They live in
`pictures/<folder>/`, already made; `npm run build:pictures` copies them into
`audio-dist/pictures/` named after a fingerprint of their bytes, so they can
be cached for a year and a changed picture still reaches everyone at once.
The names go into `src/constants/pictureFiles.ts`, which is committed, and
`check:pictures` fails in CI if it doesn't match `pictures/`. `npm run songs`
uploads them with the audio: an upload without them would take them off the
Worker.

`node scripts/make-backdrop.mjs <BG name> <day|night> <output.webp>` makes a
backdrop from one of the game's scenario backgrounds, downloaded once from the
Blue Archive wiki (`File:BG_<name>.jpg`), blurred and dimmed like the streak
places. The game itself never asks the wiki for anything. `npm run dev` serves
the pictures from `audio-dist/` too; add `?season=christmas` or
`?season=new-year` to the address there to see a season on any day.

### Characters

The character is a Spine skeleton, drawn with the official Spine 4.2 runtime
(`@esotericsoftware/spine-webgl`) in `src/helpers/spineStage.ts`. Screens
narrower than 1100px, and players who turn her off, never download the runtime
or her files; the others download only the character they see (0.7-1.4 MB),
and the other of Arona and Plana a few seconds later, ready for a switch of
colour scheme. Once shown, she stays loaded if the window narrows, hidden and
not drawn, so widening it again fetches nothing.

She moves the way she does in the game's memorial lobby. Holding her moves her
`Touch_Point` and `Touch_Eye` bones, which her head, hair and eyes follow;
stroking her head plays the pat animation; a tap picks a random expression.
Her expressions for each moment of a round are chosen in
`src/constants/characters.ts`. She pauses while the colour scheme switches and
draws at most 60 frames a second.

To add a character, export her from the game (Spine 4.2 `.skel`, `.atlas` and
`.png`), then:

1. Run `python scripts/build-spine.py <path to .skel> <id>` (needs Python 3
   and Pillow). It copies her into `public/spine/<id>/` with the texture as
   WebP.
2. Add her to `src/constants/characters.ts`: the part of her to frame, her
   touch bones if she has them, and which expression fits each moment.

### Project layout

```
src/
  components/   One folder per component, each with a styled-components file
  constants/    Song list, daily schedule, clip lengths, themes, game settings
  helpers/      Search, stats, song picking, daily puzzle, storage, volume,
                colour scheme, audio URLs
  hooks/        useGame (the round-by-round modes), useTimeAttack,
                useVolume, useColorScheme
  image/        Logo and the day and night backgrounds
public/spine/   The characters, made by build-spine
  test/         Render harness and shared setup for the tests
  types/        Shared TypeScript types
audio/          The OST originals, one Ogg file per theme number
pictures/       Pictures served from the Worker, such as the seasonal backdrops
audio-worker/   The Cloudflare Worker that serves the built audio and pictures
scripts/        build-audio, check-audio, build-pictures, check-pictures,
                make-backdrop, build-daily-order, build-spine, and the
                helpers they share
docs/           README screenshots
```

Game state lives in `useGame`, which keeps Daily, Classic and 4-Choice and
saves each to its own `localStorage` key; `useTimeAttack` saves the songs of
each Time Attack run the same way, tagged with the run. Everything read back from storage is validated, so a
corrupted or outdated save starts a fresh game instead of breaking the page.
Save files (`src/helpers/saveFile.ts`) go through the same checks.

## Deploying

The site is hosted on [Vercel](https://vercel.com/) and deploys from GitHub:
every push to `main` goes to production. The build settings are in
`vercel.json`. The audio is deployed separately, to Cloudflare, by
`npm run songs`.

The audio is on Cloudflare (see [Audio](#audio)), so a deployment is about
5 MB. To keep Vercel's deployment storage low on the Hobby plan:

- **Only `main` deploys** (`git.deploymentEnabled` in `vercel.json`); other
  branches get no preview deployments. Test with `npm run build` and
  `npm run preview` instead.
- **Delete merged branches.** Vercel keeps the latest deployment of every
  branch that still exists.
- **Caching** is set in `vercel.json`, to spare requests as well as bandwidth.
  Built files under `/assets/` carry a hash in their name, so browsers keep
  them for a year without asking again. The characters and cursor keep their
  names, so browsers keep them for a week, then go on using them while they
  check in the background. A replaced file under the same name can take up to
  a week to reach everyone; give it a new name to reach them at once.

The game moved from `bluearchive-heardle.xyz` to `baheardle.com` on
27 September 2026. Progress wasn't carried over: a browser keeps each
address's saves apart, so everyone started fresh, and daily mode restarted at
#1 that day. The old address stays attached to the Vercel project and sends
every visit on with a permanent redirect (`redirects` in `vercel.json`) until
it expires on 10 December 2026; it won't be renewed. After that the redirect
rules can go.

## Privacy

The game collects nothing about its players: no accounts, cookies, ads,
analytics or tracking scripts. Progress and settings are kept in the
browser's `localStorage` (the keys are in `src/constants/game.ts`) and never
sent anywhere; the clipboard is only written when a player presses Share.
Result pictures are drawn in the browser and go only where the player sends
them from the share sheet, or to their downloads.
Like any website, the hosts - Vercel for the site, Cloudflare for the audio and
seasonal pictures -
see standard connection details such as IP addresses to serve the files.
Players see the same in About this game.

## Support

The game is free, with no ads. If you enjoy it, you can tip its maker on
[Ko-fi](https://ko-fi.com/shinrunner1st). The link is in the footer and in
About this game (`KOFI_URL` in `src/constants/game.ts`), and nowhere that
interrupts play.

## Song list

[The full OST list](https://docs.google.com/spreadsheets/d/1w5jKHBZk4MOfm73Zt1FKTVcTMN1gcMnpd8ZcHHMCIT8/edit?usp=sharing)

## Credits

[Blue Archive](https://bluearchive.nexon.com/) is developed by NEXON Games and
published by NEXON and Yostar. Its music, characters and artwork belong to
their rights holders. The soundtrack is by KARUT, Mitsukiyo, Nor, EmoCosine and
others.

This is an unofficial fan game, not affiliated with or endorsed by NEXON Games,
NEXON or Yostar.

Code credit: [msynowski/sluchajfun](https://github.com/msynowski/sluchajfun).

## License

The code is under the [MIT License](LICENSE). The music in `audio/` and
`audio-dist/`, and
the Blue Archive artwork and logo, are not: they belong to their rights
holders, and the MIT License does not cover them.
