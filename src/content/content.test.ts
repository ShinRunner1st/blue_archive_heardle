/**
 * Checks the content files in this folder, so a mistake in one fails the
 * tests (and CI) instead of the page. Each message names the entry.
 */
import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { songs } from "../constants";
import { spineCharacters } from "../constants/characters";
import { FRAME_KINDS } from "../constants/cosmetics";
import { ICONS } from "../constants/icons";
import { MISSION_FACTS } from "../constants/missions";
import { pictureFiles } from "../constants/pictureFiles";
import { FACT_TOTALS, missionFacts } from "../helpers/missions";
import badges from "./badges.json";
import cosmetics from "./cosmetics.json";
import idsLock from "./ids.lock.json";
import missions from "./missions.json";
import privacy from "./privacy.json";
import seasons from "./seasons.json";
import whatsNew from "./whats-new.json";

const unique = (ids: Array<string | number>, what: string) => {
  const seen = new Set<string | number>();
  for (const id of ids) {
    expect(seen.has(id), `${what} "${id}" twice`).toBe(false);
    seen.add(id);
  }
};

/** A month and day that exist (29 February does, in leap years). */
const isDate = ([month, day]: number[]) =>
  Number.isInteger(month) &&
  Number.isInteger(day) &&
  month >= 1 &&
  month <= 12 &&
  day >= 1 &&
  day <= new Date(2028, month, 0).getDate();

const missionIds = new Set(missions.missions.map(({ id }) => id));

describe("seasons.json", () => {
  it("has each season once, on real dates", () => {
    unique(
      seasons.map(({ id }) => id),
      "season"
    );
    for (const season of seasons) {
      expect(isDate(season.from), `${season.id}: from`).toBe(true);
      expect(isDate(season.to), `${season.id}: to`).toBe(true);
      expect(season.home, `${season.id}: home`).not.toBe("");
      expect(season.scene.day && season.scene.night, season.id).toBeTruthy();
    }
  });

  it("has every season's pictures made and listed", () => {
    for (const season of seasons) {
      const name = (season as { pictures?: string }).pictures ?? season.id;
      for (const time of ["day", "night"]) {
        const key = `seasons/${name}-${time}`;
        expect(
          existsSync(`pictures/${key}.webp`),
          `${key}.webp: run npm run seasons`
        ).toBe(true);
        expect(pictureFiles[key], `${key}: run npm run songs`).toBeTruthy();
      }
    }
  });
});

describe("ids.lock.json", () => {
  // Saves and accounts keep these ids for good (docs/accounts.md, section
  // 4): one changed or removed would take a cleared mission or an unlocked
  // cosmetic away from whoever had it.
  const shipped: Record<keyof typeof idsLock, { id: string }[]> = {
    missions: missions.missions,
    titles: cosmetics.titles,
    cardColors: cosmetics.cardColors,
    cursorColors: cosmetics.cursorColors,
    characters: cosmetics.characters,
    banners: cosmetics.banners,
    frames: cosmetics.frames,
    backgrounds: cosmetics.backgrounds,
  };

  it("keeps every id ever shipped: retire one, never rename or remove it", () => {
    for (const [list, ids] of Object.entries(idsLock)) {
      const there = new Set(
        shipped[list as keyof typeof idsLock].map(({ id }) => id)
      );
      for (const id of ids) {
        expect(
          there.has(id),
          `${list}: "${id}" was shipped; mark it "retired": true instead`
        ).toBe(true);
      }
    }
  });

  it("lists every id there is, so a new one is kept from now on", () => {
    for (const [list, items] of Object.entries(shipped)) {
      const locked = new Set(idsLock[list as keyof typeof idsLock]);
      for (const { id } of items) {
        expect(
          locked.has(id),
          `${list}: add "${id}" to src/content/ids.lock.json`
        ).toBe(true);
      }
    }
  });

  it("retires things so nobody keeps less than they had", () => {
    const retired = new Set(
      missions.missions
        .filter((mission) => (mission as { retired?: boolean }).retired)
        .map(({ id }) => id)
    );
    for (const group of missions.groups) {
      expect(
        missions.missions.some(
          (mission) =>
            mission.group === group.id &&
            !(mission as { retired?: boolean }).retired
        ),
        `${group.id}: every mission in it is retired`
      ).toBe(true);
    }
    for (const [list, items] of Object.entries(shipped)) {
      if (list === "missions") continue;
      items.forEach((item, i) => {
        const {
          mission,
          formerMissions = [],
          retired: gone,
        } = item as {
          mission?: string;
          formerMissions?: string[];
          retired?: boolean;
        };
        // The default is everyone's, and stays so.
        if (i === 0)
          expect(gone, `${list}: the default is retired`).toBeFalsy();
        // Nobody new can get a retired one: its mission is retired too.
        if (gone && mission !== undefined) {
          expect(
            retired.has(mission),
            `${list}: ${item.id} is retired, its mission isn't`
          ).toBe(true);
        }
        for (const former of formerMissions) {
          expect(
            retired.has(former),
            `${list}: ${item.id}: "${former}" isn't a retired mission`
          ).toBe(true);
        }
      });
    }
  });
});

describe("missions.json", () => {
  const groups = new Set(missions.groups.map(({ id }) => id));

  it("has each mission once, in a tab, counting something known", () => {
    unique(
      missions.missions.map(({ id }) => id),
      "mission"
    );
    for (const mission of missions.missions) {
      expect(groups.has(mission.group), `${mission.id}: group`).toBe(true);
      expect(mission.fact in MISSION_FACTS, `${mission.id}: fact`).toBe(true);
      expect(mission.title && mission.text, mission.id).toBeTruthy();
      const { goal } = mission as { goal: number | string };
      if (goal === "all") {
        expect(
          mission.fact in FACT_TOTALS,
          `${mission.id}: "all" of a fact with no total`
        ).toBe(true);
      } else {
        expect(
          Number.isInteger(goal) && Number(goal) > 0,
          `${mission.id}: goal`
        ).toBe(true);
      }
    }
  });

  it("has a tab for every group, none empty", () => {
    unique(
      missions.groups.map(({ id }) => id),
      "group"
    );
    for (const { id } of missions.groups) {
      expect(
        missions.missions.some((mission) => mission.group === id),
        `group ${id} is empty`
      ).toBe(true);
    }
  });

  it("works out every fact a mission can name", () => {
    expect(Object.keys(missionFacts()).sort()).toEqual(
      Object.keys(MISSION_FACTS).sort()
    );
  });
});

describe("cosmetics.json", () => {
  const lists = {
    titles: cosmetics.titles,
    cardColors: cosmetics.cardColors,
    cursorColors: cosmetics.cursorColors,
    banners: cosmetics.banners,
    frames: cosmetics.frames,
    backgrounds: cosmetics.backgrounds,
  };

  it("starts each list with a default anyone has", () => {
    for (const [name, list] of Object.entries(lists)) {
      expect((list[0] as { mission?: string }).mission, name).toBeUndefined();
    }
  });

  it("unlocks each of the rest with a mission that exists", () => {
    for (const [name, list] of Object.entries(lists)) {
      unique(
        list.map(({ id }) => id),
        name
      );
      for (const item of list.slice(1)) {
        const { mission } = item as { mission?: string };
        expect(
          mission !== undefined && missionIds.has(mission),
          `${name}: ${item.id} needs a mission in missions.json`
        ).toBe(true);
      }
    }
  });

  it("gives frames and colours real colours", () => {
    const hex = /^#[0-9a-fA-F]{6}$/;
    for (const frame of cosmetics.cardColors) {
      for (const color of [
        ...frame.band,
        ...frame.body,
        frame.ink,
        frame.muted,
        frame.accent,
      ]) {
        expect(color, `frame ${frame.id}`).toMatch(hex);
      }
    }
    for (const color of cosmetics.cursorColors) {
      const { hue } = color as { hue?: number };
      if (hue !== undefined) {
        expect(hue >= 0 && hue < 360, `cursor ${color.id}: hue`).toBe(true);
      }
    }
  });
});

describe("cosmetics.json profile", () => {
  const hex = /^#[0-9a-fA-F]{6}$/;

  it("gives banners a picture on the Worker or a foil, and a known emblem", () => {
    for (const banner of cosmetics.banners) {
      const { picture, fill, tint } = banner as {
        picture?: string;
        fill?: string[];
        tint?: string;
      };
      if (picture) {
        expect(
          pictureFiles[picture],
          `banner ${banner.id}: ${picture}`
        ).toBeTruthy();
        expect(tint, `banner ${banner.id}: tint`).toMatch(hex);
      } else {
        expect(fill?.length, `banner ${banner.id}: fill`).toBeGreaterThan(1);
        for (const color of fill ?? []) expect(color).toMatch(hex);
      }
      expect(banner.ink, `banner ${banner.id}: ink`).toMatch(hex);
      expect(banner.accent, `banner ${banner.id}: accent`).toMatch(hex);
      expect(
        banner.emblem in ICONS,
        `banner ${banner.id}: emblem ${banner.emblem} isn't in icons.ts`
      ).toBe(true);
    }
  });

  it("draws each frame with a kind the code knows", () => {
    for (const frame of cosmetics.frames) {
      expect(
        (FRAME_KINDS as readonly string[]).includes(frame.kind),
        `frame ${frame.id}: kind ${frame.kind}`
      ).toBe(true);
      expect(frame.colors.length, `frame ${frame.id}`).toBeGreaterThan(0);
      for (const color of frame.colors) expect(color).toMatch(hex);
    }
  });

  it("puts backgrounds on pictures the Worker has", () => {
    for (const background of cosmetics.backgrounds.slice(1)) {
      const { picture } = background as { picture?: string };
      expect(
        picture !== undefined && pictureFiles[picture] !== undefined,
        `background ${background.id}: ${picture}`
      ).toBe(true);
    }
  });
});

describe("cosmetics.json characters", () => {
  it("lists characters that have a sprite, unlocked by real missions", () => {
    unique(
      cosmetics.characters.map(({ id }) => id),
      "character"
    );
    expect(cosmetics.characters[0].id).toBe("auto");
    for (const character of cosmetics.characters.slice(1)) {
      expect(
        character.id in spineCharacters &&
          character.id !== "arona" &&
          character.id !== "plana",
        `${character.id}: needs an entry in src/constants/characters.ts`
      ).toBe(true);
      const { mission } = character as { mission?: string };
      if (mission !== undefined) {
        expect(missionIds.has(mission), `${character.id}: ${mission}`).toBe(
          true
        );
      }
    }
  });
});

describe("badges.json", () => {
  const themes = new Set(songs.map(({ themeNo }) => themeNo));

  it("has each album once, with its cover and songs in the game", () => {
    unique(
      badges.map(({ number }) => number),
      "album"
    );
    for (const album of badges) {
      expect(
        existsSync(`src/image/badges/${album.cover}`),
        `Vol.${album.number}: cover ${album.cover}`
      ).toBe(true);
      const list = album.songs.split(" ");
      unique(list, `Vol.${album.number} song`);
      for (const theme of list) {
        expect(themes.has(theme), `Vol.${album.number}: #${theme}`).toBe(true);
      }
    }
  });
});

describe("whats-new.json", () => {
  it("has each update once, with icons from the list", () => {
    unique(
      whatsNew.map(({ id }) => id),
      "update"
    );
    for (const update of whatsNew) {
      expect(update.items.length, update.id).toBeGreaterThan(0);
      for (const item of update.items) {
        expect(
          item.icon in ICONS,
          `${update.id}: icon ${item.icon} isn't in icons.ts`
        ).toBe(true);
        expect(item.title && item.text, update.id).toBeTruthy();
      }
    }
  });
});

describe("privacy.json", () => {
  it("has a date, the contact address, and whole sections", () => {
    expect(privacy.updated).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(Number.isNaN(Date.parse(privacy.updated))).toBe(false);
    expect(privacy.contact).toBe("privacy@baheardle.com");
    expect(privacy.intro).toBeTruthy();
    unique(
      privacy.sections.map(({ id }) => id),
      "privacy section"
    );
    for (const section of privacy.sections) {
      const { paragraphs = [], list = [] } = section as {
        paragraphs?: string[];
        list?: string[];
      };
      expect(section.title, section.id).toBeTruthy();
      expect(paragraphs.length + list.length, section.id).toBeGreaterThan(0);
    }
    // The address shows in the policy itself, as a link.
    expect(JSON.stringify(privacy.sections)).toContain("{contact}");
  });
});
