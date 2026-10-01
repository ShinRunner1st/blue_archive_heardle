# Content

The game's seasons, missions and what they unlock, OST badges and What's new
live here as JSON, so adding or removing one never touches a component. The
code in `src/constants/` only reads these files. `content.test.ts` checks
every file on each `npm test` (and in CI), and names the entry when
something is wrong: a repeated id, a date that doesn't exist, two seasons on
one day, a picture not made, an icon not on the list, a song not in the
game.

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

- `id`: kept in players' saves once cleared, so **never rename one**. A
  removed mission stops showing; its id is dropped from saves when read.
- `fact`: what it counts, one of `MISSION_FACTS` in
  `src/constants/missions.ts` (each described there): daily wins, songs
  guessed, a Time Attack's best, multiplayer games and more. A new kind of
  count is code, in `missionFacts` (`src/helpers/missions.ts`).
- `goal`: the count that clears it, or `"all"` for every song or every
  badge (it grows with the game).

Rounds already played count, so a new mission can be cleared the moment a
player opens the page: they get a toast for it.

## What missions unlock (`cosmetics.json`)

Three lists, each starting with the default everyone has (no `mission`):

- `titles`: a title on the Sensei card. `{ "id", "name", "mission" }`.
- `frames`: the Sensei card's colours, as `#rrggbb`: `band` (left to right),
  `body` (top to bottom), `ink` (names and numbers), `muted` (labels),
  `accent` (the address, title and tiles).
- `cursorColors`: the cursor's flash and trail. `hue` is 0-359 (the game's
  blue has none); the one with id `rainbow` changes hue with every tap.
  `swatch` is the colour (or CSS gradient) shown in Settings.

`mission` is the id of the mission that unlocks it.

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
