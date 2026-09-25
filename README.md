# Blue Archive Heardle

A Heardle-style game: guess the Blue Archive OST from a few seconds of music.

**Play it at [bluearchive-heardle.xyz](https://bluearchive-heardle.xyz/)**

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
  has been played.

Each mode keeps its own score and history, saved in your browser.

### Finding a song

- Type a **name**, an **artist** or a **theme number** in the search box.
- Or open **All OST** (the list button beside it) to browse every song, filter
  by one or more artists, and tap one to pick it.

### Also

- **Result screen** - plays the answer from where your clip started, marks
  which part was your clip, and can replay just that part.
- **Volume** - set it once; it's remembered. New players start at 20%.
- **Dark mode** - in the ☰ menu. Follows your device until you pick one.

### Keyboard

| Key     | Action                                |
| ------- | ------------------------------------- |
| `Space` | Play or pause the clip                |
| `↑ ↓`   | Move through search results           |
| `Enter` | Pick a result, then submit your guess |
| `Esc`   | Clear the search box, close a pop-up  |

## Development

React 19, TypeScript, Vite and styled-components, tested with Vitest. Needs
Node 20 or newer (`.nvmrc` pins 22).

```bash
npm install
npm run dev    # http://localhost:3000
```

| Script                      | What it does                                 |
| --------------------------- | -------------------------------------------- |
| `npm run dev`               | Start the dev server                         |
| `npm run build`             | Type-check, then build to `build/`           |
| `npm run preview`           | Serve the production build locally           |
| `npm test`                  | Run the test suite                           |
| `npm run lint`              | ESLint, warnings included                    |
| `npm run typecheck`         | `tsc --noEmit`                               |
| `npm run format`            | Rewrite files with Prettier                  |
| `npm run check:audio`       | Check every song has its audio file          |
| `npm run build:daily-order` | Extend the daily schedule after adding songs |

A pre-commit hook runs the format check, lint and type-check, and commit
messages follow [Conventional Commits](https://www.conventionalcommits.org/).
CI runs all of that plus the tests, `check:audio` and a build on every push and
pull request.

### Adding a song

1. Put its audio in `public/audio/Theme_{themeNo}.ogg`. Themes below 10 are
   zero-padded: `Theme_01.ogg`.
2. Add its entry to `src/constants/songs.ts`:
   ```ts
   { artist: "Mitsukiyo", name: "Constant Moderato", themeNo: "1" },
   ```
3. Run `npm run build:daily-order`.
4. Run `npm run check:audio`. It fails if a song has no file, and lists any
   file that has no song yet.

A new artist needs nothing else: the All OST filter and the About credits are
built from the song list.

Step 3 matters. The daily puzzle follows a checked-in schedule,
`src/constants/dailyOrder.ts`, that is only ever appended to, so adding songs
never changes a day that has already been played. A test fails if the schedule
and the song list drift apart.

### Audio

The audio files are static assets, deployed with the site. A round downloads
one file, the current song's: about 1 MB on average, 3 MB at most. The result
screen reuses it rather than fetching it again. Nothing is preloaded for the
next round.

`getAudioUrl` in `src/helpers/audioUrl.ts` is the only code that knows where
the files live. To serve them from a CDN, set `VITE_AUDIO_BASE_URL` (for
example `https://audio.example.com`, no trailing slash) and upload the files
under the same names.

A file that fails to load or decode shows an error with a retry. In endless
mode it can deal a different song instead, and the failing one is left out for
the rest of the session.

The audio URLs are visible in DevTools like any other request. Only the track
name in the browser's media controls is hidden.

### Project layout

```
src/
  components/   One folder per component, each with a styled-components file
  constants/    Song list, daily schedule, clip lengths, themes, game settings
  helpers/      Search, stats, song picking, daily puzzle, storage, volume,
                colour scheme, audio URLs
  hooks/        useGame (all game state), useVolume, useColorScheme
  image/        Logo and the day and night backgrounds
  test/         Render harness and shared setup for the tests
  types/        Shared TypeScript types
public/audio/   The OST, one Ogg file per theme number
scripts/        check-audio, build-daily-order, and the song list reader they share
docs/           README screenshots
```

Game state lives in `useGame`, which keeps both modes and saves each to its
own `localStorage` key. Everything read back from storage is validated, so a
corrupted or outdated save starts a fresh game instead of breaking the page.

## Deploying

The site is hosted on [Vercel](https://vercel.com/) and deploys from GitHub:
every push to `main` goes to production, and other branches get preview
deployments. The build settings are in `vercel.json`.

The audio (about 400 MB) is part of the build, so:

- **Deploy through the Git integration**, not `vercel deploy` from your
  machine. The CLI refuses uploads over 100 MB on the Hobby plan.
- **Watch the bandwidth.** Hobby includes 100 GB a month, which at roughly
  1 MB a round is tens of thousands of rounds. If that stops being enough, move
  the audio to a CDN with `VITE_AUDIO_BASE_URL` (see [Audio](#audio)).

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

The code is under the [MIT License](LICENSE). The music in `public/audio`, and
the Blue Archive artwork and logo, are not: they belong to their rights
holders, and the MIT License does not cover them.
