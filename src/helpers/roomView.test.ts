import { describe, expect, it } from "vitest";

import { DEFAULT_ROOM_SETTINGS, PlayerView } from "../types/room";
import {
  albumRanges,
  pickName,
  places,
  settingsRows,
  settingsSummary,
  standings,
} from "./roomView";

function player(id: string, score: number, time: number): PlayerView {
  return {
    id,
    name: id,
    icon: null,
    score,
    time,
    here: true,
    ready: -1,
    answered: false,
    returned: false,
  };
}

describe("places", () => {
  it("ranks by score, then time, sharing a place on a full tie", () => {
    const players = [
      player("a", 3, 9000),
      player("b", 5, 7000),
      player("c", 3, 4000),
      player("d", 3, 4000),
    ];
    const place = places(players);
    expect([...place.entries()]).toEqual([
      ["a", 4],
      ["b", 1],
      ["c", 2],
      ["d", 2],
    ]);
    expect(standings(players).map((p) => p.id)).toEqual(["b", "c", "d", "a"]);
  });

  it("puts everyone first before anyone scores", () => {
    const place = places([player("a", 0, 0), player("b", 0, 0)]);
    expect([...place.values()]).toEqual([1, 1]);
  });
});

describe("albumRanges", () => {
  it("joins runs of albums", () => {
    expect(albumRanges([1, 2, 3, 4, 5, 6, 7, 8])).toBe("1-8");
    expect(albumRanges([8, 1, 2, 3, 5, 7])).toBe("1-3, 5, 7-8");
    expect(albumRanges([4])).toBe("4");
  });
});

describe("settingsRows", () => {
  const rows = (...args: Parameters<typeof settingsRows>) =>
    settingsRows(...args).map(({ label, value }) => `${label}: ${value}`);

  it("lists the OST's own settings, and who can join", () => {
    expect(
      rows({ ...DEFAULT_ROOM_SETTINGS, albums: [1, 3] }, "password")
    ).toEqual([
      "Game: OST",
      "Albums: Vol.1, 3",
      "Answers: Typed",
      "How many songs: 10 songs",
      "Time to answer: 20s each",
      "Songs start: Random start",
      "Who can join: Password",
    ]);
  });

  it("lists Voice's lines and a picture game's server", () => {
    expect(
      rows({ ...DEFAULT_ROOM_SETTINGS, game: "voice", lines: "titles" })
    ).toContain("Lines: Title calls");
    expect(
      rows({
        ...DEFAULT_ROOM_SETTINGS,
        game: "picture",
        picture: "weapon",
        silhouette: true,
        server: "jp",
      })
    ).toEqual([
      "Game: Weapon silhouettes",
      "Answers: Typed",
      "How many weapons: 10 weapons",
      "Time to answer: 20s each",
      "Server: JP",
      "Who can join: Open",
    ]);
  });
});

describe("settingsSummary", () => {
  it("says each game's settings in a few words", () => {
    expect(settingsSummary(DEFAULT_ROOM_SETTINGS)).toEqual([
      "OST",
      "Typed",
      "10 songs",
      "20s each",
      "random start",
    ]);
    expect(
      settingsSummary({
        ...DEFAULT_ROOM_SETTINGS,
        game: "picture",
        picture: "weapon",
        silhouette: true,
        answers: "choice",
        server: "jp",
      }).slice(0, 5)
    ).toEqual([
      "Weapon silhouettes",
      "4-Choice",
      "10 weapons",
      "20s each",
      "JP",
    ]);
    // Who can join, only when it isn't anyone with the code.
    expect(settingsSummary(DEFAULT_ROOM_SETTINGS, "open")).toHaveLength(5);
    expect(settingsSummary(DEFAULT_ROOM_SETTINGS, "password").at(-1)).toBe(
      "🔑 password"
    );
  });

  it("names answers, or a skip", () => {
    expect(pickName(DEFAULT_ROOM_SETTINGS, null)).toBe("Skipped");
    expect(pickName(DEFAULT_ROOM_SETTINGS, "nope")).toBe("?");
  });
});
