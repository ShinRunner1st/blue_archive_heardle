/**
 * The checks on the content files, in one place: the content test runs
 * them on the files in this folder, and the admin tool on what it's about
 * to write, so the two never disagree. Each problem names its file and the
 * entry, worded as what to do about it.
 */
import { songs } from "../constants";
import {
  type Frame,
  FRAME_CORNERS,
  FRAME_GRADIENTS,
  ORNAMENT_SHAPES,
  type OrnamentShape,
} from "../constants/cosmetics";
import { ICONS } from "../constants/icons";
import { MISSION_FACTS } from "../constants/missions";
import { FACT_TOTALS } from "../helpers/missions";
import {
  HUB_CARDS,
  type ContentFileName,
  type ContentFiles,
  type CosmeticsFile,
  type IdsLock,
} from "./types";

export interface ContentProblem {
  file: ContentFileName;
  message: string;
}

/**
 * What the checks need from outside the files: the pictures on the Worker
 * and the files on disk (paths from the project's root), handed in so the
 * checks run in the test and in the tool's page alike.
 */
export interface ContentEnv {
  pictureFiles: Record<string, string>;
  exists: (path: string) => boolean;
}

const HEX = /^#[0-9a-fA-F]{6}$/;
const isHex = (color: unknown) => typeof color === "string" && HEX.test(color);

/** A number from `min` to `max`, both included. */
const isBetween = (value: unknown, min: number, max: number) =>
  typeof value === "number" &&
  Number.isFinite(value) &&
  value >= min &&
  value <= max;

/** An SVG path's commands and numbers, and nothing else. */
const PATH = /^[MmLlHhVvCcSsQqTtAaZz0-9.,\s-]+$/;

/** What's wrong with one shape of an ornament, `isColor` its palette's. */
function shapeProblems(
  shape: OrnamentShape,
  isColor: (at: unknown) => boolean
): string[] {
  const problems: string[] = [];
  const need = (ok: boolean, problem: string) => ok || problems.push(problem);
  const numbers = (keys: Array<keyof OrnamentShape>) =>
    keys.every(
      (key) => shape[key] === undefined || isBetween(shape[key], -48, 48)
    );
  if (!(ORNAMENT_SHAPES as readonly string[]).includes(shape.shape)) {
    return [`${shape.shape} isn't a shape (${ORNAMENT_SHAPES.join(", ")})`];
  }
  if (shape.shape === "path") {
    need(
      typeof shape.d === "string" &&
        shape.d.length <= 6000 &&
        PATH.test(shape.d),
      "a path needs its d, of path commands and numbers"
    );
  }
  if (shape.shape === "circle")
    need(isBetween(shape.r, 0, 24), "a circle needs r, 0-24");
  if (shape.shape === "ellipse") {
    need(
      isBetween(shape.rx, 0, 24) && isBetween(shape.ry, 0, 24),
      "an ellipse needs rx and ry, 0-24"
    );
  }
  need(numbers(["cx", "cy"]), "cx and cy must be -48 to 48");
  need(
    shape.fill !== undefined || shape.stroke !== undefined,
    "a shape needs a fill, an outline or both"
  );
  if (shape.fill !== undefined)
    need(isColor(shape.fill), "its fill isn't a colour of the frame's");
  if (shape.stroke !== undefined) {
    need(isColor(shape.stroke), "its outline isn't a colour of the frame's");
    need(
      isBetween(shape.strokeWidth, 0.1, 12),
      "an outline needs its width, 0.1-12"
    );
  }
  need(
    shape.evenOdd === undefined || typeof shape.evenOdd === "boolean",
    "evenOdd is true or false"
  );
  if (shape.at !== undefined) {
    need(
      Array.isArray(shape.at) &&
        (shape.at.length === 3 || shape.at.length === 4) &&
        isBetween(shape.at[0], -48, 48) &&
        isBetween(shape.at[1], -48, 48) &&
        isBetween(shape.at[2], -360, 360) &&
        (shape.at[3] === undefined || isBetween(shape.at[3], 0.1, 4)),
      "at is [x, y, degrees] or [x, y, degrees, size], x and y -48 to 48, size 0.1-4"
    );
  }
  return problems;
}

/**
 * What's wrong with a frame's parts: each colour a part names must be in
 * its palette, and every size within what a card can carry.
 */
export function frameProblems(frame: Frame): string[] {
  const problems: string[] = [];
  const need = (ok: boolean, problem: string) => ok || problems.push(problem);
  const colors = Array.isArray(frame.colors) ? frame.colors : [];
  need(colors.length > 0, "no colours");
  need(colors.every(isHex), "colours must be #rrggbb");
  const isColor = (at: unknown) =>
    Number.isInteger(at) &&
    (at as number) >= 0 &&
    (at as number) < colors.length;

  const { border, inner, glows, ornament } = frame;
  if (!border) return [...problems, "no border"];
  need(isBetween(border.width, 0.5, 8), "the border's width must be 0.5-8");
  need(
    Array.isArray(border.colors) &&
      border.colors.length > 0 &&
      border.colors.every(isColor),
    "the border's colours must be colours of the frame's"
  );
  if (border.gradient !== undefined) {
    need(
      (FRAME_GRADIENTS as readonly string[]).includes(border.gradient),
      `a gradient is ${FRAME_GRADIENTS.join(" or ")}`
    );
  }
  if (border.angle !== undefined)
    need(isBetween(border.angle, -360, 360), "the angle must be -360 to 360");
  if (inner) {
    need(isBetween(inner.gap, 0, 12), "the inner line's gap must be 0-12");
    need(
      isBetween(inner.width, 0.5, 6),
      "the inner line's width must be 0.5-6"
    );
    need(isColor(inner.color), "the inner line's colour isn't the frame's");
    need(
      isBetween(inner.strength, 0, 1),
      "the inner line's strength must be 0-1"
    );
  }
  for (const [i, glow] of (glows ?? []).entries()) {
    need(isBetween(glow.blur, 0, 40), `glow ${i + 1}: blur must be 0-40`);
    need(isBetween(glow.spread, 0, 12), `glow ${i + 1}: spread must be 0-12`);
    need(isColor(glow.color), `glow ${i + 1}: its colour isn't the frame's`);
    need(isBetween(glow.strength, 0, 1), `glow ${i + 1}: strength must be 0-1`);
  }
  need((glows ?? []).length <= 4, "four glows at most");
  if (ornament) {
    const corners = Array.isArray(ornament.corners) ? ornament.corners : [];
    need(
      corners.length > 0 &&
        new Set(corners).size === corners.length &&
        corners.every((corner) =>
          (FRAME_CORNERS as readonly string[]).includes(corner)
        ),
      "the ornament needs one corner or more, each once"
    );
    const shapes = Array.isArray(ornament.shapes) ? ornament.shapes : [];
    need(
      shapes.length > 0 && shapes.length <= 40,
      "the ornament needs 1-40 shapes"
    );
    shapes.forEach((shape, i) => {
      for (const problem of shapeProblems(shape, isColor)) {
        problems.push(`ornament shape ${i + 1}: ${problem}`);
      }
    });
  }
  return problems;
}

/** Days in a month of a leap year, so 29 February counts. */
const daysIn = (month: number) => new Date(2028, month, 0).getDate();

/** A month and day that exist (29 February does, in leap years). */
const isDate = ([month, day]: number[]) =>
  Number.isInteger(month) &&
  Number.isInteger(day) &&
  month >= 1 &&
  month <= 12 &&
  day >= 1 &&
  day <= daysIn(month);

/** Every day from `from` to `to`, both included, over New Year if need be. */
function daysFrom(from: number[], to: number[]): string[] {
  const days: string[] = [];
  let [month, day] = from;
  for (let i = 0; i < 366; i++) {
    days.push(`${month}-${day}`);
    if (month === to[0] && day === to[1]) break;
    day++;
    if (day > daysIn(month)) {
      day = 1;
      month = month === 12 ? 1 : month + 1;
    }
  }
  return days;
}

/** The lists ids.lock.json keeps, from the files. */
const shippedLists = ({
  missions,
  cosmetics,
}: ContentFiles): Record<keyof IdsLock, Array<{ id: string }>> => ({
  missions: missions.missions,
  titles: cosmetics.titles,
  cardColors: cosmetics.cardColors,
  cursorColors: cosmetics.cursorColors,
  characters: cosmetics.characters,
  banners: cosmetics.banners,
  frames: cosmetics.frames,
  backgrounds: cosmetics.backgrounds,
});

export function checkContent(
  content: ContentFiles,
  env: ContentEnv
): ContentProblem[] {
  const problems: ContentProblem[] = [];
  const check =
    (file: ContentFileName) =>
    (ok: unknown, message: string): void => {
      if (!ok) problems.push({ file, message });
    };
  const unique = (
    report: ReturnType<typeof check>,
    ids: Array<string | number>,
    what: string
  ) => {
    const seen = new Set<string | number>();
    for (const id of ids) {
      report(!seen.has(id), `${what} "${id}" twice`);
      seen.add(id);
    }
  };

  const { seasons, missions, cosmetics, badges, whatsNew, privacy, idsLock } =
    content;
  const missionIds = new Set(missions.missions.map(({ id }) => id));
  const retiredMissions = new Set(
    missions.missions.filter(({ retired }) => retired).map(({ id }) => id)
  );

  // seasons.json
  {
    const report = check("seasons");
    unique(
      report,
      seasons.map(({ id }) => id),
      "season"
    );
    const takenBy = new Map<string, string>();
    for (const season of seasons) {
      const from = isDate(season.from);
      const to = isDate(season.to);
      report(from, `${season.id}: from isn't a real date`);
      report(to, `${season.id}: to isn't a real date`);
      report(season.home, `${season.id}: home is empty`);
      report(
        season.scene?.day && season.scene?.night,
        `${season.id}: scene needs a day and a night background`
      );
      if (from && to) {
        for (const day of daysFrom(season.from, season.to)) {
          const other = takenBy.get(day);
          report(
            other === undefined,
            `${season.id}: ${day} is ${other}'s too; seasons can't overlap`
          );
          takenBy.set(day, season.id);
        }
      }
      const name = season.pictures ?? season.id;
      for (const time of ["day", "night"]) {
        const key = `seasons/${name}-${time}`;
        report(
          env.exists(`pictures/${key}.webp`),
          `${key}.webp: run npm run seasons`
        );
        report(env.pictureFiles[key], `${key}: run npm run songs`);
      }
    }
  }

  // ids.lock.json: saves and accounts keep these ids for good
  // (docs/accounts.md, section 4), so one changed or removed would take a
  // cleared mission or an unlocked cosmetic away from whoever had it.
  {
    const report = check("idsLock");
    const shipped = shippedLists(content);
    for (const [list, ids] of Object.entries(idsLock)) {
      const there = new Set(
        (shipped[list as keyof IdsLock] ?? []).map(({ id }) => id)
      );
      for (const id of ids) {
        report(
          there.has(id),
          `${list}: "${id}" was shipped; mark it "retired": true instead`
        );
      }
    }
    for (const [list, items] of Object.entries(shipped)) {
      const locked = new Set(idsLock[list as keyof IdsLock]);
      for (const { id } of items) {
        report(
          locked.has(id),
          `${list}: add "${id}" to src/content/ids.lock.json`
        );
      }
    }
  }

  // missions.json
  {
    const report = check("missions");
    const groups = new Set(missions.groups.map(({ id }) => id));
    unique(
      report,
      missions.groups.map(({ id }) => id),
      "group"
    );
    unique(
      report,
      missions.missions.map(({ id }) => id),
      "mission"
    );
    for (const mission of missions.missions) {
      report(
        groups.has(mission.group),
        `${mission.id}: no tab ${mission.group}`
      );
      report(
        mission.fact in MISSION_FACTS,
        `${mission.id}: fact ${mission.fact} isn't one the game counts`
      );
      report(mission.title, `${mission.id}: title is empty`);
      report(mission.text, `${mission.id}: text is empty`);
      const goal: unknown = mission.goal;
      if (goal === "all") {
        report(
          mission.fact in FACT_TOTALS,
          `${mission.id}: "all" of a fact with no total`
        );
      } else {
        report(
          Number.isInteger(goal) && Number(goal) > 0,
          `${mission.id}: goal must be a whole number above 0, or "all"`
        );
      }
    }
    for (const { id } of missions.groups) {
      report(
        missions.missions.some((mission) => mission.group === id),
        `group ${id} is empty`
      );
      report(
        missions.missions.some(
          (mission) => mission.group === id && !mission.retired
        ),
        `${id}: every mission in it is retired`
      );
    }
  }

  // cosmetics.json
  {
    const report = check("cosmetics");
    const lists: Record<
      keyof CosmeticsFile,
      CosmeticsFile[keyof CosmeticsFile]
    > = cosmetics;
    for (const [name, list] of Object.entries(lists)) {
      unique(
        report,
        list.map(({ id }) => id),
        name
      );
      list.forEach((item, i) => {
        const { mission, formerMissions = [], retired } = item;
        if (i === 0) {
          // The default is everyone's, and stays so.
          report(
            mission === undefined,
            `${name}: the first, the default, has a mission`
          );
          report(!retired, `${name}: the default is retired`);
        } else if (item.free) {
          // Everyone's, said so: a reward with no mission by mistake isn't.
          report(
            mission === undefined,
            `${name}: ${item.id} is free, so it has no mission`
          );
        } else if (name !== "characters" || mission !== undefined) {
          report(
            mission !== undefined && missionIds.has(mission),
            `${name}: ${item.id} needs a mission in missions.json`
          );
        }
        // Nobody new can get a retired one: its mission is retired too.
        if (retired && mission !== undefined) {
          report(
            retiredMissions.has(mission),
            `${name}: ${item.id} is retired, its mission isn't`
          );
        }
        for (const former of formerMissions) {
          report(
            retiredMissions.has(former),
            `${name}: ${item.id}: "${former}" isn't a retired mission`
          );
        }
      });
    }

    for (const colors of cosmetics.cardColors) {
      const all = [
        ...colors.band,
        ...colors.body,
        colors.ink,
        colors.muted,
        colors.accent,
      ];
      report(
        all.every(isHex),
        `card colours ${colors.id}: every colour must be #rrggbb`
      );
    }
    for (const color of cosmetics.cursorColors) {
      if (color.hue !== undefined) {
        report(
          color.hue >= 0 && color.hue < 360,
          `cursor ${color.id}: hue must be 0-359`
        );
      }
    }
    for (const banner of cosmetics.banners) {
      // The blank banner draws nothing, so has no look to check.
      if (banner.blank) continue;
      if (banner.picture) {
        report(
          env.pictureFiles[banner.picture],
          `banner ${banner.id}: ${banner.picture} isn't on the Worker`
        );
        report(isHex(banner.tint), `banner ${banner.id}: tint must be #rrggbb`);
      } else {
        report(
          (banner.fill?.length ?? 0) > 1,
          `banner ${banner.id}: a picture, or two colours or more in fill`
        );
        report(
          (banner.fill ?? []).every(isHex),
          `banner ${banner.id}: fill colours must be #rrggbb`
        );
      }
      report(isHex(banner.ink), `banner ${banner.id}: ink must be #rrggbb`);
      report(
        isHex(banner.accent),
        `banner ${banner.id}: accent must be #rrggbb`
      );
      report(
        banner.emblem in ICONS,
        `banner ${banner.id}: emblem ${banner.emblem} isn't in icons.ts`
      );
    }
    for (const frame of cosmetics.frames) {
      for (const problem of frameProblems(frame)) {
        report(false, `frame ${frame.id}: ${problem}`);
      }
    }
    for (const background of cosmetics.backgrounds.slice(1)) {
      report(
        background.picture !== undefined &&
          env.pictureFiles[background.picture] !== undefined,
        `background ${background.id}: ${background.picture} isn't on the Worker`
      );
    }
    report(
      cosmetics.characters[0]?.id === "auto",
      `characters: the first must be "auto"`
    );
    const setups = new Set(content.characters.map(({ id }) => id));
    for (const { id } of cosmetics.characters.slice(1)) {
      // Arona and Plana come together, as "auto".
      report(
        setups.has(id) && id !== "arona" && id !== "plana",
        `${id}: needs a set-up in characters.json`
      );
    }
  }

  // badges.json
  {
    const report = check("badges");
    const themes = new Set(songs.map(({ themeNo }) => themeNo));
    unique(
      report,
      badges.map(({ number }) => number),
      "album"
    );
    for (const album of badges) {
      report(
        env.exists(`src/image/badges/${album.cover}`),
        `Vol.${album.number}: cover ${album.cover} isn't in src/image/badges`
      );
      const list = album.songs.split(" ");
      unique(report, list, `Vol.${album.number} song`);
      for (const theme of list) {
        report(
          themes.has(theme),
          `Vol.${album.number}: #${theme} isn't a song`
        );
      }
    }
  }

  // whats-new.json
  {
    const report = check("whatsNew");
    unique(
      report,
      whatsNew.map(({ id }) => id),
      "update"
    );
    for (const update of whatsNew) {
      report(update.name, `${update.id}: name is empty`);
      report(update.items.length > 0, `${update.id}: no items`);
      for (const item of update.items) {
        report(
          item.icon in ICONS,
          `${update.id}: icon ${item.icon} isn't in icons.ts`
        );
        report(item.title && item.text, `${update.id}: an item with no words`);
      }
    }
  }

  // characters.json
  {
    const report = check("characters");
    const { characters } = content;
    unique(
      report,
      characters.map(({ id }) => id),
      "character"
    );
    const ids = new Set(characters.map(({ id }) => id));
    report(ids.has("arona") && ids.has("plana"), "Arona and Plana are needed");
    const isName = (name: unknown) => typeof name === "string" && name !== "";
    const isNumber = (n: unknown) =>
      typeof n === "number" && Number.isFinite(n);
    for (const character of characters) {
      const { id, moods, touch } = character;
      report(character.name, `${id}: name is empty`);
      for (const file of [character.skel, character.atlas]) {
        report(
          env.exists(`public/spine/${file}`),
          `${id}: public/spine/${file} isn't there`
        );
      }
      report(isNumber(character.centerX), `${id}: centerX must be a number`);
      report(isNumber(character.eyes), `${id}: eyes must be a number`);
      report(isName(character.idle), `${id}: idle is empty`);
      for (const mood of ["idle", "listening", "wrong", "lost"] as const) {
        report(isName(moods[mood]), `${id}: no face for ${mood}`);
      }
      // A face for each try: nervous after tries 1 to 5, won on 1 to 6.
      report(
        moods.nervous.length === 5 && moods.nervous.every(isName),
        `${id}: nervous needs a face for each of tries 1-5`
      );
      report(
        moods.won.length === 6 && moods.won.every(isName),
        `${id}: won needs a face for each of tries 1-6`
      );
      report(
        moods.tapped.length > 1 && moods.tapped.every(isName),
        `${id}: tapped needs two faces or more`
      );
      // At ease she blinks: the idle face must be one a blink suits.
      report(
        !character.blink || character.blinkable.includes(moods.idle),
        `${id}: the idle face ${moods.idle} must be one that blinks`
      );
      if (touch) {
        report(
          isName(touch.point) && isName(touch.eye),
          `${id}: touch needs its point and eye bones`
        );
        report(
          touch.pointSetup.length === 2 && touch.pointSetup.every(isNumber),
          `${id}: touch's pointSetup is x and y`
        );
        report(
          touch.pat.length === 3 &&
            touch.pat.every(isNumber) &&
            touch.pat[2] > 0,
          `${id}: touch's pat is x, y and a radius above 0`
        );
        report(
          touch.lookMax > 0 && touch.patMax > 0,
          `${id}: lookMax and patMax must be above 0`
        );
        report(
          touch.lookEyes >= 0 && touch.lookEyes <= 1,
          `${id}: lookEyes is a share, 0 to 1`
        );
        report(
          [
            touch.look.loop,
            touch.look.end,
            touch.stroke.loop,
            touch.stroke.end,
          ].every((names) => names.length > 0 && names.every(isName)),
          `${id}: touch's look and stroke need their animations`
        );
      }
    }
  }

  // privacy.json
  {
    const report = check("privacy");
    report(
      /^\d{4}-\d{2}-\d{2}$/.test(privacy.updated) &&
        !Number.isNaN(Date.parse(privacy.updated)),
      "updated must be a date, YYYY-MM-DD"
    );
    report(
      privacy.contact === "privacy@baheardle.com",
      "contact must be privacy@baheardle.com"
    );
    report(privacy.intro, "intro is empty");
    unique(
      report,
      privacy.sections.map(({ id }) => id),
      "privacy section"
    );
    for (const section of privacy.sections) {
      const { paragraphs = [], list = [] } = section;
      report(section.title, `${section.id}: title is empty`);
      report(
        paragraphs.length + list.length > 0,
        `${section.id}: no paragraphs or list`
      );
    }
    // The address shows in the policy itself, as a link.
    report(
      JSON.stringify(privacy.sections).includes("{contact}"),
      "no section shows {contact}"
    );
  }

  // page-pictures.json
  {
    const report = check("pagePictures");
    const { home, places, hub, rooms, roomCards } = content.pagePictures;
    // Shipped with the site, so the file is what's checked: in src/image/.
    const bundled = (file: unknown, what: string) =>
      report(
        typeof file === "string" &&
          /^(backgrounds\/)?[A-Za-z0-9_-]+\.webp$/.test(file) &&
          env.exists(`src/image/${file}`),
        `${what}: src/image/${String(file)} isn't there`
      );
    const onWorker = (key: unknown, what: string) =>
      report(
        typeof key === "string" && env.pictureFiles[key] !== undefined,
        `${what}: ${String(key)} isn't on the Worker`
      );
    report(home.name, "home: name is empty");
    bundled(home.day, "home by day");
    bundled(home.night, "home by night");
    unique(
      report,
      places.map(({ name }) => name),
      "place"
    );
    places.forEach((place, i) => {
      report(place.name, `place ${i + 1}: name is empty`);
      report(
        Number.isInteger(place.wins) && place.wins > 0,
        `${place.name}: wins must be a whole number over 0`
      );
      // Each place further than the one before, so the tour only goes on.
      if (i > 0) {
        report(
          place.wins > places[i - 1].wins,
          `${place.name}: needs more wins than ${places[i - 1].name}`
        );
      }
      bundled(place.day, `${place.name} by day`);
      bundled(place.night, `${place.name} by night`);
    });
    for (const card of HUB_CARDS) onWorker(hub[card], `the hub's ${card} card`);
    onWorker(rooms.day, "Multiplayer by day");
    onWorker(rooms.night, "Multiplayer by night");
    onWorker(roomCards.join, "Multiplayer's Join a room");
    onWorker(roomCards.make, "Multiplayer's Make a room");
  }

  return problems;
}
