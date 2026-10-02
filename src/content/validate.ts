/**
 * The checks on the content files, in one place: the content test runs
 * them on the files in this folder, and the admin tool on what it's about
 * to write, so the two never disagree. Each problem names its file and the
 * entry, worded as what to do about it.
 */
import { songs } from "../constants";
import { spineCharacters } from "../constants/characters";
import { FRAME_KINDS } from "../constants/cosmetics";
import { ICONS } from "../constants/icons";
import { MISSION_FACTS } from "../constants/missions";
import { FACT_TOTALS } from "../helpers/missions";
import type {
  ContentFileName,
  ContentFiles,
  CosmeticsFile,
  IdsLock,
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
      report(
        (FRAME_KINDS as readonly string[]).includes(frame.kind),
        `frame ${frame.id}: kind ${frame.kind} isn't drawn by ProfileFrame`
      );
      report(frame.colors.length > 0, `frame ${frame.id}: no colours`);
      report(
        frame.colors.every(isHex),
        `frame ${frame.id}: colours must be #rrggbb`
      );
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
    for (const character of cosmetics.characters.slice(1)) {
      // Typed as the characters there are, but the admin tool can write
      // any id; Arona and Plana come together, as "auto".
      const id: string = character.id;
      report(
        id in spineCharacters && id !== "arona" && id !== "plana",
        `${id}: needs an entry in src/constants/characters.ts`
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

  return problems;
}
