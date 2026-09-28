import { describe, expect, it } from "vitest";

import { gameplayOrder, loreOrder } from "../constants/studentDailyOrder";
import { students } from "../constants/students";
import {
  convertStudents,
  favouriteGifts,
  parseBirthday,
  parseHeight,
  schoolYear,
} from "./studentData";

const localization = {
  School: { Abydos: "Abydos" },
  Club: { Countermeasure: "Foreclosure Task Force" },
  TacticRole: { Tanker: "Tank", DamageDealer: "Dealer" },
  BulletType: { Pierce: "Piercing" },
};

const items = [
  {
    Category: "Favor",
    Rarity: "SSR",
    IsReleased: [true, true, true],
    Name: "Lace Pillow",
    Tags: ["aV", "Bf"],
  },
  {
    Category: "Favor",
    Rarity: "SR",
    IsReleased: [true, true, true],
    Name: "A lesser gift",
    Tags: ["aV", "Bf", "de"],
  },
];

function entry(overrides: Record<string, unknown> = {}) {
  return {
    Id: 10005,
    Name: "Hoshino",
    IsReleased: [true, true, false],
    DefaultOrder: 5,
    FamilyName: "Takanashi",
    PersonalName: "Hoshino",
    School: "Abydos",
    Club: "Countermeasure",
    TacticRole: "Tanker",
    BulletType: "Pierce",
    WeaponType: "SG",
    Skills: { Ex: { Cost: [4, 4, 4, 4, 3] } },
    CharHeightMetric: "145cm",
    BirthDay: "1/2",
    SchoolYear: "3rd Year",
    FavorItemTags: ["aV"],
    FavorItemUniqueTags: ["Bf"],
    ...overrides,
  };
}

describe("parseHeight", () => {
  it("reads centimetres", () => {
    expect(parseHeight("145cm")).toBe(145);
  });

  it("gives null where the game doesn't say", () => {
    expect(parseHeight("-")).toBeNull();
    expect(parseHeight("Unmeasured")).toBeNull();
  });
});

describe("parseBirthday", () => {
  it("reads month and day", () => {
    expect(parseBirthday("1/2")).toEqual([1, 2]);
    expect(parseBirthday("12/31")).toEqual([12, 31]);
    expect(parseBirthday("2/29")).toEqual([2, 29]);
  });

  it("gives null for no date or a date that can't be", () => {
    expect(parseBirthday("-")).toBeNull();
    expect(parseBirthday("13/1")).toBeNull();
    expect(parseBirthday("4/31")).toBeNull();
  });
});

describe("schoolYear", () => {
  it("keeps the game's words, or says it's unknown", () => {
    expect(schoolYear("2nd Year")).toBe("2nd Year");
    expect(schoolYear("Suspended")).toBe("Suspended");
    expect(schoolYear("")).toBe("Unknown");
  });
});

describe("favouriteGifts", () => {
  const gifts = [
    { name: "Pillow", tags: ["a", "b"] },
    { name: "Egg", tags: ["b", "c"] },
    { name: "Book", tags: ["c"] },
  ];

  it("picks the gift sharing the most tags", () => {
    expect(favouriteGifts(["a", "b"], gifts)).toEqual(["Pillow"]);
  });

  it("keeps every gift in a tie", () => {
    expect(favouriteGifts(["b"], gifts)).toEqual(["Pillow", "Egg"]);
  });

  it("has none for a student with no tags in common", () => {
    expect(favouriteGifts([], gifts)).toEqual([]);
    expect(favouriteGifts(["z"], gifts)).toEqual([]);
  });
});

describe("convertStudents", () => {
  it("cuts a student down to the fields the game compares", () => {
    expect(convertStudents([entry()], localization, items)).toEqual([
      {
        id: 10005,
        name: "Hoshino",
        fullName: "Takanashi Hoshino",
        lore: true,
        school: "Abydos",
        role: "Tank",
        damage: "Piercing",
        weapon: "SG",
        exCost: 4,
        order: 5,
        height: 145,
        birthday: [1, 2],
        year: "3rd Year",
        club: "Foreclosure Task Force",
        gifts: ["Lace Pillow"],
      },
    ]);
  });

  it("reads SchaleDB's tables keyed by id too", () => {
    const table = { 10005: entry() };
    expect(convertStudents(table, localization, items)).toHaveLength(1);
  });

  it("keeps Global students only, in release order", () => {
    const table = [
      entry({ Id: 2, Name: "B", DefaultOrder: 9 }),
      entry({ Id: 3, Name: "C", IsReleased: [true, false, false] }),
      entry({ Id: 1, Name: "A", DefaultOrder: 10 }),
    ];
    const names = convertStudents(table, localization, items).map(
      ({ name }) => name
    );
    expect(names).toEqual(["B", "A"]);
  });

  it("keeps the first of two entries under one name", () => {
    const table = [
      entry({ Id: 10099, Name: "Hoshino (Armed)", TacticRole: "DamageDealer" }),
      entry({ Id: 10098, Name: "Hoshino (Armed)" }),
    ];
    const [armed, ...rest] = convertStudents(table, localization, items);
    expect(rest).toEqual([]);
    expect(armed).toMatchObject({ id: 10098, role: "Tank", lore: false });
  });

  it("stops on a changed format, naming the student and field", () => {
    expect(() =>
      convertStudents([entry({ DefaultOrder: "5" })], localization, items)
    ).toThrow(/Hoshino's DefaultOrder/);
    expect(() =>
      convertStudents([entry({ Skills: {} })], localization, items)
    ).toThrow(/Ex/);
    expect(() => convertStudents("nope", localization, items)).toThrow(
      /students.json/
    );
  });

  it("stops on a code with no English name", () => {
    expect(() =>
      convertStudents([entry({ Club: "NewClub" })], localization, items)
    ).toThrow(/Club NewClub/);
  });
});

/**
 * The generated files, checked against each other: `npm run students`
 * writes them together, so a hand edit or a half-finished run shows here.
 */
describe("the checked-in student table", () => {
  it("has every Global student once, in release order", () => {
    const ids = students.map(({ id }) => id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(students.map(({ name }) => name)).size).toBe(ids.length);
    const orders = students.map(({ order }) => order);
    expect(orders).toEqual([...orders].sort((a, b) => a - b));
  });

  it("keeps one Hoshino (Armed), the Tank", () => {
    const armed = students.filter(({ name }) => name === "Hoshino (Armed)");
    expect(armed).toHaveLength(1);
    expect(armed[0].exCost).toBe(4);
  });

  it("counts Shiroko*Terror as her own student in Lore", () => {
    expect(students.find(({ name }) => name === "Shiroko*Terror")?.lore).toBe(
      true
    );
  });

  it("schedules every answer exactly once", () => {
    for (const [order, pool] of [
      [gameplayOrder, students],
      [loreOrder, students.filter(({ lore }) => lore)],
    ] as const) {
      // Run `npm run students` after changing the table.
      expect([...order].sort()).toEqual(pool.map(({ id }) => id).sort());
    }
  });
});
