import { describe, expect, it } from "vitest";

import { DEFAULT_ROOM_SETTINGS, PlayerView } from "../types/room";
import { pickName, places, settingsSummary, standings } from "./roomView";

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
