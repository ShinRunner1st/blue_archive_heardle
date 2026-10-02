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
import pagePictures from "./page-pictures.json";
import characters from "./characters.json";
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
  characters,
  pagePictures,
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
  it("checks what moves: drifts, shines, turns, pulses and name effects", () => {
    const content = copy();
    const { banners, frames, backgrounds, nameEffects } = content.cosmetics;
    backgrounds.find(({ id }) => id === "lodge")!.drift!.count = 200;
    banners.find(({ id }) => id === "gold")!.pan = 18;
    const neon = frames.find(({ id }) => id === "neon")!;
    neon.glows = undefined;
    frames.find(({ id }) => id === "schale")!.border.spin = 8;
    const sky = nameEffects.find(({ id }) => id === "sky")!;
    sky.fill = [0];
    const neonName = nameEffects.find(({ id }) => id === "neon")!;
    neonName.glow = undefined;
    expect(messages(content, "cosmetics")).toEqual([
      "banner gold: only a picture pans",
      "frame schale: only a gradient turns",
      "frame neon: a pulse needs a glow",
      "background lodge: drift: a count of 1-24",
      "name effect sky: a flow needs two fill colours or more",
      "name effect neon: a flicker needs a glow",
    ]);
  });

  it("keeps every shipped id: retire one, never remove it", () => {
    const content = copy();
    content.missions.missions = content.missions.missions.filter(
      ({ id }) => id !== "ost-150"
    );
    content.cosmetics.titles.pop();
    expect(messages(content, "idsLock")).toContain(
      'missions: "ost-150" was shipped; mark it "retired": true instead'
    );
    expect(messages(content, "idsLock")).toHaveLength(2);
  });

  it("lets a withdrawn id go, and never come back", () => {
    const content = copy();
    content.missions.missions = content.missions.missions.filter(
      ({ id }) => id !== "ost-150"
    );
    content.idsLock = {
      ...content.idsLock,
      missions: content.idsLock.missions.filter((id) => id !== "ost-150"),
      withdrawn: { missions: ["ost-150"] },
    };
    content.cosmetics.banners.find(({ id }) => id === "beach")!.mission =
      "ost-50";
    expect(messages(content)).toEqual([]);

    content.idsLock.withdrawn = { missions: ["ost-50"] };
    expect(messages(content, "idsLock")).toEqual([
      `missions: "ost-50" was withdrawn, so it's never used again`,
    ]);
  });

  it("asks for a new id in the lock", () => {
    const content = copy();
    content.cosmetics.titles.push({
      id: "new-title",
      name: "New",
      mission: "ost-150",
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

  it("checks a mission's rule", () => {
    const content = copy();
    const [first, second, third] = content.missions.missions;
    delete first.fact;
    first.rule = { count: "streak", games: ["voice"], tries: 1 };
    expect(messages(content, "missions")).toEqual([]);

    second.rule = { count: "rounds" };
    Object.assign(third, {
      fact: undefined,
      rule: { count: "days", clip: 2, seconds: 30 },
      goal: "all",
    });
    expect(messages(content, "missions")).toEqual([
      `${second.id}: a fact and a rule, where it takes one`,
      `${third.id}: rule matches no way to play: no game has everything it asks for`,
      `${third.id}: a rule's goal is a number, not "all"`,
    ]);
  });

  it("keeps guests to true, and former missions to other missions", () => {
    const content = copy();
    const [first] = content.missions.missions;
    Object.assign(first, { guests: false });
    const aris = content.cosmetics.characters.find(({ id }) => id === "aris")!;
    aris.formerMissions = [
      "room-win-25",
      "nowhere",
      "room-first",
      "room-first",
    ];
    expect(messages(content)).toEqual([
      `${first.id}: guests is true, or left out`,
      `characters: aris: "room-win-25" isn't another mission in missions.json`,
      `characters: aris: "nowhere" isn't another mission in missions.json`,
      `characters: aris's former mission "room-first" twice`,
    ]);
  });

  it("keeps cosmetics to missions there are, and retired with them", () => {
    const content = copy();
    const banner = content.cosmetics.banners.find(({ id }) => id === "sakura")!;
    banner.mission = "no-such-mission";
    const frame = content.cosmetics.frames[1];
    frame.retired = true;
    expect(messages(content, "cosmetics")).toEqual([
      `banners: ${banner.id} needs a mission in missions.json`,
      `frames: ${frame.id} is retired, its mission isn't`,
    ]);
  });

  it("lets a reward be everyone's only when it says so", () => {
    const content = copy();
    const sakura = content.cosmetics.banners.find(({ id }) => id === "sakura")!;
    delete sakura.mission;
    const schale = content.cosmetics.banners.find(({ id }) => id === "schale")!;
    schale.mission = "first-daily";
    expect(messages(content, "cosmetics")).toEqual([
      "banners: schale is free, so it has no mission",
      "banners: sakura needs a mission in missions.json",
    ]);
  });

  it("checks colours, emblems and pictures", () => {
    const content = copy();
    const frame = content.cosmetics.frames[1];
    Object.assign(frame, { colors: ["red"] });
    const banner = content.cosmetics.banners.find(({ id }) => id === "schale")!;
    Object.assign(banner, {
      emblem: { style: "ring", icon: "IoNothing" },
      picture: "nowhere",
    });
    expect(messages(content, "cosmetics")).toEqual(
      expect.arrayContaining([
        `frame ${frame.id}: colours must be #rrggbb`,
        `frame ${frame.id}: ornament shape 1: its fill isn't a colour of the frame's`,
        `banner ${banner.id}: emblem IoNothing isn't in icons.ts`,
        `banner ${banner.id}: nowhere isn't on the Worker`,
      ])
    );
  });

  it("checks a frame's parts", () => {
    const content = copy();
    const frame = content.cosmetics.frames.find(({ id }) => id === "gold")!;
    frame.border = {
      width: 20,
      colors: [0, 7],
      gradient: "zigzag" as "linear",
    };
    frame.glows = [{ blur: 99, spread: 0, color: 0, strength: 2 }];
    frame.ornament = {
      corners: ["tl", "tl"],
      shapes: [
        { shape: "path", d: "M0 0<script>", stroke: 1 },
        { shape: "circle", cx: 4 },
        { shape: "star" as "path", fill: 0 },
      ],
    };
    expect(messages(content, "cosmetics")).toEqual(
      [
        "the border's width must be 0.5-8",
        "the border's colours must be colours of the frame's",
        "a gradient is linear or conic",
        "glow 1: blur must be 0-40",
        "glow 1: strength must be 0-1",
        "the ornament needs one corner or more, each once",
        "ornament shape 1: a path needs its d, of path commands and numbers",
        "ornament shape 1: an outline needs its width, 0.1-12",
        "ornament shape 2: a circle needs r, 0-24",
        "ornament shape 2: a shape needs a fill, an outline or both",
        "ornament shape 3: star isn't a shape (path, circle, ellipse, picture)",
      ].map((problem) => `frame gold: ${problem}`)
    );
  });

  it("checks the pages' pictures: files, Worker keys and the places' order", () => {
    const content = copy();
    const { pagePictures: pages } = content;
    pages.home.night = "nowhere.webp";
    pages.places[1].wins = pages.places[0].wins;
    pages.places[2].name = pages.places[3].name;
    pages.places[4].day = "../secret.webp";
    pages.hub.voice = "hub/nothing";
    pages.rooms.day = "";
    pages.roomCards.make = "hub/gone";
    const [second, third, fifth] = [1, 2, 4].map((i) => pages.places[i].name);
    expect(messages(content, "pagePictures")).toEqual([
      "home by night: src/image/nowhere.webp isn't there",
      `place "${third}" twice`,
      `${second}: needs more wins than ${pages.places[0].name}`,
      `${fifth} by day: src/image/../secret.webp isn't there`,
      "the hub's voice card: hub/nothing isn't on the Worker",
      "Multiplayer by day:  isn't on the Worker",
      "Multiplayer's Make a room: hub/gone isn't on the Worker",
    ]);
  });

  it("checks a nameplate's parts and its emblem", () => {
    const content = copy();
    const plate = (id: string) =>
      content.cosmetics.banners.find((banner) => banner.id === id)!;
    Object.assign(plate("schedule"), {
      pattern: "dots",
      band: "navy",
      tag: "a tag far too long to read",
    });
    plate("record-shelf").emblem!.shapes![0].fill = 5;
    plate("chorus").emblem = { style: "side", icon: "IoMic" };
    plate("on-duty").emblem = {
      style: "ring",
      icon: "IoTime",
      cut: true,
      shapes: [{ shape: "picture", picture: "emblems/none", r: 12 }],
      colors: [],
    };
    expect(messages(content, "cosmetics")).toEqual([
      "banner schedule: a pattern is facets, grid, lines",
      "banner schedule: band must be #rrggbb",
      "banner schedule: a tag is 1-20 letters",
      "banner record-shelf: emblem shape 1: its fill isn't a colour of the emblem's",
      "banner on-duty: only a side emblem has a picture",
      "banner on-duty: an emblem is an icon or shapes, not both",
      "banner on-duty: emblems/none isn't on the Worker",
      "banner chorus: a side emblem is a picture",
      "banner chorus: a side emblem is a picture alone",
    ]);
  });

  it("lets each corner have its own ornament, pictures too", () => {
    const content = copy();
    const frame = content.cosmetics.frames.find(({ id }) => id === "gold")!;
    const shared = frame.ornament!.shapes;
    frame.ornament = {
      corners: [],
      shapes: [],
      own: {
        tl: shared,
        br: [
          { shape: "picture", picture: "emblems/none", r: 8, cx: 12, cy: 12 },
        ],
      },
    };
    expect(messages(content, "cosmetics")).toEqual([
      "frame gold: emblems/none isn't on the Worker",
    ]);

    frame.ornament.corners = ["tl"];
    frame.ornament.own!.br = [{ shape: "picture", r: 30 }];
    expect(messages(content, "cosmetics")).toEqual([
      "frame gold: the ornament needs 1-40 shapes",
      "frame gold: the tl corner has its own ornament, so isn't in corners",
      "frame gold: br corner's shape 1: a picture needs its picture, as pictures/ names it",
      "frame gold: br corner's shape 1: a picture needs r, 0.5-24",
    ]);
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

  it("checks each character's sprite, faces and touch", () => {
    const content = copy();
    const mari = content.characters.find(({ id }) => id === "mari")!;
    mari.skel = "mari/none.skel";
    mari.moods.nervous.pop();
    mari.moods.idle = "02";
    const arona = content.characters.find(({ id }) => id === "arona")!;
    arona.touch!.pat[2] = 0;
    expect(messages(content, "characters")).toEqual([
      "arona: touch's pat is x, y and a radius above 0",
      "mari: public/spine/mari/none.skel isn't there",
      "mari: nervous needs a face for each of tries 1-5",
      "mari: the idle face 02 must be one that blinks",
    ]);
  });

  it("keeps the characters a reward names", () => {
    const content = copy();
    content.characters = content.characters.filter(({ id }) => id !== "hina");
    expect(messages(content, "cosmetics")).toEqual([
      "hina: needs a set-up in characters.json",
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
