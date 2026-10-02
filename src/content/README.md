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
Missions, Rewards (every list in `cosmetics.json`), Characters, Pictures,
Seasons, OST badges and What's new.

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
  blue has none); one with `"rainbow": true` changes hue with every tap.
  `swatch` is the colour (or CSS gradient) shown in Settings.
- `characters`: who stands beside the game. Each also needs its sprite in
  `public/spine/` and its set-up in `characters.json`.
- `banners`: the strip the title sits on, on the profile and its card.
  `picture` is a picture on the Worker (a key in
  `src/constants/pictureFiles.ts`, such as `seasons/beach-day`) under
  `tint`; or, with no picture, `fill`, two or more colours for a foil.
  `ink` is the title's colour, `accent` the emblem's ring, the stripes and
  the line along its foot, and `emblem` an icon from
  `src/constants/icons.ts`.
- `frames`: the frame round the profile's card, drawn from parts, so a
  new style is only an entry. `colors` is its palette, and every colour
  a part takes is a place in it (0 the first), so recolouring a style is
  changing `colors` alone:
  - `border`: `width` in px and `colors`, one for a plain line or more
    for a gradient, `gradient` `linear` (across, at `angle` degrees) or
    `conic` (round the card, starting at `angle`).
  - `inner` (optional): a thin line inside the border, `gap` px of the
    page's colour between them, its `width`, `color` and `strength`
    (0 to 1), as the filigree frames have.
  - `glows` (optional, four at most): round the outside, each a `blur`,
    `spread`, `color` and `strength`; no blur is a hard ring.
  - `ornament` (optional): SVG shapes on the `corners` (`tl`, `tr`, `br`,
    `bl`), drawn for the top left in a 24×24 box, its top left 6.5 units
    out from the card's corner, and turned for the others. Each shape is a
    `path` (`d`), `circle` (`cx`, `cy`, `r`) or `ellipse` (`cx`, `cy`,
    `rx`, `ry`), with a `fill`, a `stroke` and `strokeWidth`, or both, and
    `at`, [x, y, degrees] or [x, y, degrees, size], to move, turn and
    size it. In the admin tool they're picked from a library of ready-made
    shapes and dragged into place, or taken from a pasted SVG.
- `backgrounds`: the scene behind the profile's card, a `picture` on the
  Worker as banners name theirs. Pictures already there cost nothing more;
  a new one goes in `pictures/` and up with `npm run songs`.

`mission` is the id of the mission that unlocks it. `"free": true` makes one
everyone's from the start without being the default (Schale's banner); any
other reward needs a mission, so one can't be left free by mistake.
`"blank": true` marks the default title and banner, which show nothing: a
new card is the name alone, and a title picked with no banner shows as
words. `formerMissions` lists
retired missions that unlocked it before, so whoever cleared one keeps it
when a new mission takes over. `retired: true` stops offering it: nobody
new can get it (its mission must be retired too), and whoever has it still
wears it and sees it in the list. A default is never retired. A new kind of cosmetic
is its list here, an entry in `COSMETIC_KINDS` (`src/helpers/cosmetics.ts`)
and, for Customize, its swatch and place in
`src/components/Profile/Customize.tsx`.

## Characters (`characters.json`)

Who can stand beside the game, each a Spine sprite in `public/spine/<id>/`
(made by `scripts/build-spine.py`): `skel` and `atlas` under it; `centerX`
and `eyes`, where her middle and her eyes are in skeleton units, so every
face sits at the same height; `idle` and `blink`, animations; `blinkable`,
the faces a blink suits (the one at rest among them); `moods`, a face for
each moment of a round (`idle`, `listening`, `wrong`, `lost`; `nervous` after
tries 1 to 5, `won` on tries 1 to 6; `tapped`, picked from at random); and
`touch`, her bones for being held and stroked, or `null` for taps only.
`note` says why her faces were picked. Arona and Plana are the pair "auto"
stands for; any other is offered in Settings once she's in `characters` in
`cosmetics.json`. The admin tool edits and adds them, with her drawn.

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
- **Rewards** are previewed where players meet them: titles and colours on
  the Sensei card, banners, frames and backgrounds in the profile with its
  frame and the cards rooms show, cursor colours in Settings with the
  effects running, characters in Settings. "As a player who has unlocked
  everything", or off, as a new player, with the locks and their missions.
  Titles, banners, frames and backgrounds can also be seen in a room: the
  game's own lobby, a round's reveal and the standings, with eight made-up
  players, you wearing the one edited and the others a mix.
  A released reward keeps its mission while that mission is live; once it's
  retired, a new one can take over and the old is kept as a former one.
- **Pictures** for banners and backgrounds go in `pictures/scenes/`, made
  from a file dropped in or one of the game's backgrounds (by its wiki
  name): a sharp 960×540 scene (`scripts/make-picture.mjs`, about 70 KB) or
  a blurred backdrop like the seasons' (`make-backdrop.mjs`). The Seasons
  tab makes a season's day and night pictures the same way, and the OST
  badges tab an album's 256×256 cover in `src/image/badges/`. Each picture
  for the Worker is listed at once (`build:pictures`, on this PC); putting
  it on the Worker and R2 is still `npm run songs`, before merging. Only a
  picture nothing shows can be deleted, and only the tool's own folders'.
- **Unsaved work** stays in the browser; the tool offers it back next time,
  or carries on with it by itself when only pictures changed.
- After a save: `npm test`, look at the diff, commit.

Code: `src/admin/` (the server in `server.ts`, run by
`vite.admin.config.ts`; the preview frame in `preview.tsx`). It answers
only its own page on this machine (the Host and Origin headers).
