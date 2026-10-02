/**
 * Checks the content files in this folder, so a mistake in one fails the
 * tests (and CI) instead of the page. The checks are validate.ts's, which
 * the admin tool runs too; each message names the entry.
 */
import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { MISSION_FACTS } from "../constants/missions";
import { pictureFiles } from "../constants/pictureFiles";
import { missionFacts } from "../helpers/missions";
import badges from "./badges.json";
import cosmetics from "./cosmetics.json";
import idsLock from "./ids.lock.json";
import missions from "./missions.json";
import privacy from "./privacy.json";
import seasons from "./seasons.json";
import type { ContentFileName, ContentFiles } from "./types";
import { checkContent } from "./validate";
import whatsNew from "./whats-new.json";

const files = {
  seasons,
  missions,
  cosmetics,
  badges,
  whatsNew,
  privacy,
  idsLock,
} as unknown as ContentFiles;

const env = { pictureFiles, exists: existsSync };

/** A copy of the files to break, so each check is seen to catch it. */
const copy = (): ContentFiles => structuredClone(files);

const messages = (content: ContentFiles, file?: ContentFileName) =>
  checkContent(content, env)
    .filter((problem) => file === undefined || problem.file === file)
    .map(({ message }) => message);

describe("the content files", () => {
  it.each(Object.keys(files) as ContentFileName[])("%s passes", (file) => {
    expect(messages(files, file)).toEqual([]);
  });

  it("works out every fact a mission can name", () => {
    expect(Object.keys(missionFacts()).sort()).toEqual(
      Object.keys(MISSION_FACTS).sort()
    );
  });
});

describe("checkContent", () => {
  it("keeps every shipped id: retire one, never remove it", () => {
    const content = copy();
    content.missions.missions = content.missions.missions.filter(
      ({ id }) => id !== "ost-100"
    );
    content.cosmetics.titles.pop();
    expect(messages(content, "idsLock")).toContain(
      'missions: "ost-100" was shipped; mark it "retired": true instead'
    );
    expect(messages(content, "idsLock")).toHaveLength(2);
  });

  it("asks for a new id in the lock", () => {
    const content = copy();
    content.cosmetics.titles.push({
      id: "new-title",
      name: "New",
      mission: "ost-100",
    });
    expect(messages(content)).toEqual([
      'titles: add "new-title" to src/content/ids.lock.json',
    ]);
  });

  it("names a mission's unknown fact, bad goal and missing tab", () => {
    const content = copy();
    const [first] = content.missions.missions;
    Object.assign(first, { fact: "nothing", goal: 0, group: "nowhere" });
    expect(messages(content, "missions")).toEqual([
      `${first.id}: no tab nowhere`,
      `${first.id}: fact nothing isn't one the game counts`,
      `${first.id}: goal must be a whole number above 0, or "all"`,
    ]);
  });

  it("keeps cosmetics to missions there are, and retired with them", () => {
    const content = copy();
    const banner = content.cosmetics.banners[1];
    banner.mission = "no-such-mission";
    const frame = content.cosmetics.frames[1];
    frame.retired = true;
    expect(messages(content, "cosmetics")).toEqual([
      `banners: ${banner.id} needs a mission in missions.json`,
      `frames: ${frame.id} is retired, its mission isn't`,
    ]);
  });

  it("checks colours, kinds, emblems and pictures", () => {
    const content = copy();
    const frame = content.cosmetics.frames[1];
    Object.assign(frame, { kind: "zigzag", colors: ["red"] });
    const banner = content.cosmetics.banners[0];
    Object.assign(banner, { emblem: "IoNothing", picture: "nowhere" });
    expect(messages(content, "cosmetics")).toEqual(
      expect.arrayContaining([
        `frame ${frame.id}: kind zigzag isn't drawn by ProfileFrame`,
        `frame ${frame.id}: colours must be #rrggbb`,
        `banner ${banner.id}: emblem IoNothing isn't in icons.ts`,
        `banner ${banner.id}: nowhere isn't on the Worker`,
      ])
    );
  });

  it("finds two seasons on one day, over New Year too", () => {
    const content = copy();
    const newYear = content.seasons.find(({ id }) => id === "new-year");
    expect(newYear).toBeDefined();
    content.seasons.push({
      ...newYear!,
      id: "late",
      from: [1, 7],
      to: [1, 9],
      pictures: newYear!.pictures ?? newYear!.id,
    });
    expect(messages(content, "seasons")).toEqual([
      "late: 1-7 is new-year's too; seasons can't overlap",
    ]);
  });

  it("finds dates that don't exist and missing pictures", () => {
    const content = copy();
    const season = content.seasons[0];
    Object.assign(season, { from: [2, 30], pictures: "nothing" });
    expect(messages(content, "seasons")).toEqual([
      `${season.id}: from isn't a real date`,
      "seasons/nothing-day.webp: run npm run seasons",
      "seasons/nothing-day: run npm run songs",
      "seasons/nothing-night.webp: run npm run seasons",
      "seasons/nothing-night: run npm run songs",
    ]);
  });

  it("checks badges' covers and songs, and What's new's icons", () => {
    const content = copy();
    content.badges[0].songs += " 99999 1";
    content.whatsNew[0].items[0].icon = "IoNothing";
    expect(messages(content)).toEqual([
      'Vol.1 song "1" twice',
      "Vol.1: #99999 isn't a song",
      `${content.whatsNew[0].id}: icon IoNothing isn't in icons.ts`,
    ]);
  });
});
