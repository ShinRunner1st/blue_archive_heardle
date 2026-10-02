# Content

The game's seasons, missions and what they unlock, OST badges and What's new
live here as JSON, so adding or removing one never touches a component. The
code in `src/constants/` only reads these files. The checks are in
`validate.ts` (the files' shapes in `types.ts`): `content.test.ts` runs
them on every file on each `npm test` (and in CI), and they name the entry
when something is wrong: a repeated id, a date that doesn't exist, two
seasons on one day, a picture not made, an icon not on the list, a song not
in the game. A new check goes in `validate.ts`, with a test that breaks a
copy of the files to show it fires.

The admin tool, `npm run admin`, edits these files on this PC, with previews
drawn by the game's own components, and saves only once the checks pass
(writing `ids.lock.json` too); see the tool below. Its tabs so far:
Missions and What's new.

After any change: `npm test`. After a change with pictures (a season, a
badge cover): `npm run songs` too, before merging.

## Seasons (`seasons.json`)

A season dresses the home background up between two dates, on the player's
own calendar, in place of the Trinity library. Streak places still win from
10 wins, and Multiplayer keeps its own room.

```json
{
  "id": "halloween",
  "home": "the night carnival",
  "from": [10, 24],
  "to": [10, 31],
  "scene": { "day": "Amusement_Night", "night": "Amusement_Night" }
}
```

- `id`: its name, also its pictures' (`pictures/seasons/<id>-day.webp` and
  `-night.webp`). `?season=<id>` shows it on any day in `npm run dev`.
- `home`: where a lost streak goes back to, in "Back to …".
- `from`, `to`: month and day, both included. A season may run over New
  Year (`[12, 31]` to `[1, 7]`); seasons must not overlap.
- `scene`: the game's scenario backgrounds the pictures are made from, by
  their name on the Blue Archive wiki (`File:BG_<name>.jpg`, without `BG_`
  and `.jpg`). The night one is often `<name>_Night`; the same name for
  both makes the night picture by dimming the day's.
- `pictures` (optional): another season's picture name, to share its
  pictures (both anniversaries use `"anniversary"`).

To add one: add the entry, run `npm run seasons` (makes any missing
pictures; delete one to have it made again), look at it with `?season=`,
then `npm run songs`. To remove one: delete the entry; its pictures can go
from `pictures/seasons/` unless another season shares them.

## Missions (`missions.json`)

`groups` are the Missions pop-up's tabs, in order. Each mission:

```json
{
  "id": "ost-100",
  "group": "ost",
  "title": "Record collector",
  "text": "Guess 100 different songs, in Daily or Classic.",
  "fact": "songsGuessed",
  "goal": 100
}
```

- `id`: kept in players' saves and accounts once cleared, so **never
  rename or remove one** (`ids.lock.json` below).
- `retired`: `true` once it's no longer one to clear, as when what it asks
  changes (that's a new mission, with a new id). Nobody can clear it any
  more; whoever did sees it under Retired in its tab and keeps what it
  unlocked. It doesn't count towards the missions' total.
- `fact`: what it counts, one of `MISSION_FACTS` in
  `src/constants/missions.ts` (each described there): daily wins, songs
  guessed, a Time Attack's best, multiplayer games and more. A new kind of
  count is code, in `missionFacts` (`src/helpers/missions.ts`).
- `goal`: the count that clears it, or `"all"` for every song or every
  badge (it grows with the game).

Rounds already played count, so a new mission can be cleared the moment a
player opens the page: they get a toast for it.

## What missions unlock (`cosmetics.json`)

Lists, each starting with the default everyone has (no `mission`):

- `titles`: a title on the Sensei card. `{ "id", "name", "mission" }`.
- `cardColors`: the Sensei card's colours, as `#rrggbb`: `band` (left to right),
  `body` (top to bottom), `ink` (names and numbers), `muted` (labels),
  `accent` (the address, title and tiles).
- `cursorColors`: the cursor's flash and trail. `hue` is 0-359 (the game's
  blue has none); the one with id `rainbow` changes hue with every tap.
  `swatch` is the colour (or CSS gradient) shown in Settings.
- `characters`: who stands beside the game. Each also needs its sprite in
  `public/spine/` and an entry in `src/constants/characters.ts`.
- `banners`: the strip the title sits on, on the profile and its card.
  `picture` is a picture on the Worker (a key in
  `src/constants/pictureFiles.ts`, such as `seasons/beach-day`) under
  `tint`; or, with no picture, `fill`, two or more colours for a foil.
  `ink` is the title's colour, `accent` the emblem's ring, the stripes and
  the line along its foot, and `emblem` an icon from
  `src/constants/icons.ts`.
- `frames`: the frame round the profile's card. `kind` is how it's drawn: `line`,
  `filigree`, `petals`, `halo` (ornaments on the corners), `neon` (a glow
  of its colours) or `prism` (a ring of them); `colors` the line first,
  then the ornaments or glow. A new kind needs drawing in
  `src/components/Profile/ProfileFrame.tsx`.
- `backgrounds`: the scene behind the profile's card, a `picture` on the
  Worker as banners name theirs. Pictures already there cost nothing more;
  a new one goes in `pictures/` and up with `npm run songs`.

`mission` is the id of the mission that unlocks it. `formerMissions` lists
retired missions that unlocked it before, so whoever cleared one keeps it
when a new mission takes over. `retired: true` stops offering it: nobody
new can get it (its mission must be retired too), and whoever has it still
wears it and sees it in the list. A default is never retired. A new kind of cosmetic
is its list here, an entry in `COSMETIC_KINDS` (`src/helpers/cosmetics.ts`)
and, for Customize, its swatch and place in
`src/components/Profile/Customize.tsx`.

## Ids for good (`ids.lock.json`)

Every mission and cosmetic id ever shipped, by list. The content test fails
if one of them is missing from the files (retire it instead) and if an id
in the files isn't in it yet: add a new one there in the same change. A
removal or a rename never reaches players.

## OST badges (`badges.json`)

One per official soundtrack album, earned by guessing all its songs in Daily
or Classic; the Jukebox shows the same albums. `songs` are theme numbers,
separated by spaces, only those in the game. The cover is a file in
`src/image/badges/` (square WebP, about 200 pixels), named by `cover`. The
"Full shelf" mission (`"goal": "all"`) follows the number of albums.

## What's new (`whats-new.json`)

Newest first. A new entry at the top, with a new `id`, opens the pop-up
once for returning players. Only what players notice: a new game or mode,
new students, a change to how something plays.

```json
{
  "id": "2026-10-missions",
  "name": "Missions",
  "items": [{ "icon": "IoRibbon", "title": "…", "text": "…" }]
}
```

`icon` names one of the icons in `src/constants/icons.ts`; to use another
from [react-icons' Ionicons 5](https://react-icons.github.io/react-icons/icons/io5/),
add it to that list.

## The admin tool (`npm run admin`)

A page on this PC (http://127.0.0.1:5180, nothing deployed and nothing in
the site's build) for editing these files. Each tab lists its entries, a
form edits one, and a preview beside it draws the game's own pop-up from
the draft, at 1920×911 or a phone's size, by day or night, fitted or at
100%. Problems from `validate.ts` show as you type, and Save stays off
until there are none; the tool's server checks again before it writes, and
writes the files as Prettier would, so the diff is only what changed.

- **Released or not**: an id in `ids.lock.json` on `main` has reached
  players, so it is fixed and can only be retired. One added since can be
  renamed (a mission's follows its title until edited) or deleted, and the
  lock follows. Rewards pointing at a renamed mission follow it.
- **Unsaved work** stays in the browser; the tool offers it back next time.
- After a save: `npm test`, look at the diff, commit.

Code: `src/admin/` (the server in `server.ts`, run by
`vite.admin.config.ts`; the preview frame in `preview.tsx`). It answers
only its own page on this machine (the Host and Origin headers).
