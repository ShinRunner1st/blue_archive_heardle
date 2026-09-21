# Blue Archive Heardle

![chrome_FYJD6SVnl8](https://github.com/user-attachments/assets/dc7edcb9-7df5-4827-a5c8-6ee01d05a128)

[Blue Archive Heardle](https://bluearchive-heardle.xyz/) is a clone of Spotify
Heardle.

Guess a Blue Archive OST from a few seconds of audio. Each skip or wrong guess
unlocks a little more of the clip, and you get six tries.

There are two modes, switched from the header:

- **Daily** - one track a day, the same for every player, with a streak and a
  shareable result.
- **Endless** - play as many rounds as you like. Songs are dealt from a bag, so
  none repeats until every one has been played.

Each mode keeps its own history and score. Clips start from a random point in
the track, and your progress is saved between visits.

## Search tips

- Search by name
- Search by OST number
- Search by artist

## Getting started

Requires Node 22 or newer.

```bash
npm install
npm run dev
```

The dev server runs at http://localhost:3000.

## Scripts

| Script                | What it does                                |
| --------------------- | ------------------------------------------- |
| `npm run dev`         | Start the Vite dev server                   |
| `npm run build`       | Type-check, then build to `build/`          |
| `npm run preview`     | Serve the production build locally          |
| `npm test`            | Run the Vitest suite                        |
| `npm run lint`        | ESLint, warnings included                   |
| `npm run typecheck`   | `tsc --noEmit`                              |
| `npm run format`      | Rewrite files with Prettier                 |
| `npm run check:songs` | Verify every song still resolves on YouTube |

A Husky `pre-commit` hook runs the format check, lint and type-check, and
`commit-msg` enforces [Conventional Commits](https://www.conventionalcommits.org/).

## Project layout

```
src/
  components/   UI components, each with a co-located styled-components file
    PopUp/      Shared modal shell: overlay, Escape, focus trap, dialog roles
    ErrorBoundary/  Recovery screen so a crash never leaves a blank page
  constants/    Song list, clip lengths, theme, game constants
  helpers/      Pure logic: search, stats, song picking, daily puzzle, storage
  hooks/        useGame - all game state and persistence for both modes
  test/         Render harness shared by the component tests
  types/        Shared TypeScript types
scripts/
  check-songs.mjs   Weekly YouTube link check, run from CI
```

Game state lives in `useGame`, which holds both modes at once and mirrors each
to its own `localStorage` key (`stats` for endless, `stats.daily` for daily).
Everything read back out of storage is validated in `helpers/storage.ts`, so a
corrupted or outdated save degrades to a fresh game rather than breaking the
page.

The daily puzzle is derived, not stored: `helpers/daily.ts` walks one fixed,
seeded shuffle of the song list a day at a time, so every player gets the same
track on the same local calendar day and no track repeats for a full cycle.

A video that will not play - removed, private, region-locked or with embedding
disabled - is caught by the player's `onError`, plus a timeout for loads that
never finish. The clip player explains what happened and offers a retry; in
endless mode it can deal a replacement song, and the failing video is kept out
of the bag for the rest of the session.

All three pop-ups are built on `components/PopUp`, which owns the overlay,
Escape and backdrop dismissal, the focus trap and the `role="dialog"`
semantics. While one is open, `keyboardEnabled` is threaded down to `Player`
and `Result` so the global Space and Enter shortcuts stay inert.

Every control is a real focusable element with a label, and the keyboard
shortcuts are listed in the How To Play pop-up:

| Key     | Action                                |
| ------- | ------------------------------------- |
| `Space` | Play or pause the clip                |
| `↑ ↓`   | Move through search results           |
| `Enter` | Pick a result, then submit your guess |
| `Esc`   | Clear the search box                  |

The search box follows the WAI-ARIA combobox pattern: the input keeps focus
while arrowing through results and points at the highlighted one with
`aria-activedescendant`, and the result count is announced through a live
region.

Every push and pull request runs format, lint, type-check, test and build via
`.github/workflows/ci.yml`. A second workflow checks every song's YouTube ID
weekly and opens an issue when one stops resolving, since a removed video would
otherwise become an unplayable round.

## Lists of OST

[Docs](https://docs.google.com/spreadsheets/d/1w5jKHBZk4MOfm73Zt1FKTVcTMN1gcMnpd8ZcHHMCIT8/edit?usp=sharing)

## Credit

https://github.com/msynowski/sluchajfun
