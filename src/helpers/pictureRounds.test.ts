import { describe, expect, it } from "vitest";

import { PICTURE_SHEETS, SHAPE_SHEETS } from "../constants/guessSheets";
import {
  haloOrder,
  haloOrderJp,
  weaponOrder,
  weaponOrderJp,
} from "../constants/guessDailyOrder";
import { students } from "../constants/students";
import {
  optionsOf,
  pillOf,
  PICTURE_KINDS,
  PICTURE_SLOTS,
  PICTURE_STYLES,
  PictureRound,
  styleFor,
} from "../types/picture";
import { SKIPPED } from "../types/voice";
import {
  answerOf,
  asGuess,
  buildPictureShareText,
  dailyPicture,
  hasPictureHints,
  knownPictureRounds,
  makePictureChoices,
  pickPicture,
  pictureAnswers,
  pictureHints,
  picturePool,
  pictureRecordText,
  ruledOut,
  showsShape,
} from "./pictureRounds";
import {
  answerPictureRound,
  dealPictureRound,
  pictureRunsOf,
  pictureTimeAttackShareText,
  pictureTimeAttackStats,
} from "./pictureTimeAttack";
import { loadPictureRounds, savePictureRounds } from "./storage";
import { studentById } from "./studentRounds";
import { isWon } from "./voiceRounds";

const byName = (name: string) => {
  const found = students.find((student) => student.name === name);
  if (!found) throw new Error(`no ${name}`);
  return found;
};

const aru = byName("Aru");
const aruNewYear = byName("Aru (New Year)");
const hoshino = byName("Hoshino");
const hikari = byName("Hikari");
const nozomi = byName("Nozomi");

/** A small seeded random, so the bag tests don't depend on luck. */
function seeded(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return state / 2147483648;
  };
}

describe("the answers", () => {
  it("cover nearly every student on each server, each in one answer", () => {
    for (const server of ["global", "jp"] as const) {
      const out = students.filter((student) => student[server]);
      for (const kind of PICTURE_KINDS) {
        const answers = pictureAnswers(kind, server);
        const members = answers.flatMap((answer) => answer.members);
        expect(new Set(members).size).toBe(members.length);
        expect(members.length).toBeGreaterThan(out.length - 5);
        expect(members.every((id) => studentById.get(id)?.[server])).toBe(true);
        expect(picturePool(kind, server)).toHaveLength(members.length);
      }
    }
  });

  it("lead each picture on Global by a Global student, as it always was", () => {
    for (const kind of PICTURE_KINDS) {
      for (const answer of pictureAnswers(kind, "global")) {
        const lead = studentById.get(answer.lead);
        expect(lead?.global).toBe(true);
        const firstDefault = answer.members
          .map((id) => studentById.get(id))
          .find((student) => student?.lore);
        if (firstDefault) expect(lead).toBe(firstDefault);
      }
    }
  });

  it("put a student's costumes under one halo", () => {
    expect(answerOf("halo", aruNewYear.id)?.lead).toBe(aru.id);
    expect(answerOf("halo", aru.id)?.members).toContain(aruNewYear.id);
  });

  it("put the twins under one halo, and one each for everyone else", () => {
    expect(answerOf("halo", nozomi.id)?.lead).toBe(hikari.id);
    const people = new Set(
      students
        .filter((student) => student.global)
        .map(({ name }) => name.replace(/ \(.*\)$/, ""))
    );
    expect(pictureAnswers("halo", "global").length).toBe(people.size - 1);
  });

  it("put costumes carrying the same gun under one weapon", () => {
    expect(answerOf("weapon", aruNewYear.id)?.lead).toBe(aru.id);
    expect(answerOf("weapon", aru.id)?.name).toBeTruthy();
    expect(answerOf("weapon", hikari.id)?.lead).not.toBe(
      answerOf("weapon", nozomi.id)?.lead
    );
  });

  it("fill each sheet's cells once", () => {
    for (const kind of PICTURE_KINDS) {
      // JP's are every picture; Global's are some of them.
      const answers = pictureAnswers(kind, "jp");
      for (const cells of [
        answers.map(({ picture }) => picture),
        answers.map(({ shape }) => shape),
      ]) {
        expect([...cells].sort((a, b) => a - b)).toEqual(
          answers.map((_, index) => index)
        );
      }
      // A different order in each sheet, so one gives nothing of the other.
      expect(answers.some(({ picture, shape }) => picture !== shape)).toBe(
        true
      );
      expect(PICTURE_SHEETS[kind].key).not.toBe(SHAPE_SHEETS[kind].key);
    }
  });
});

describe("guesses", () => {
  const round: PictureRound = { answer: aru.id, guesses: [] };

  it("count any student the picture belongs to as the answer", () => {
    expect(asGuess("halo", round, aruNewYear.id)).toBe(aru.id);
    expect(asGuess("halo", round, hoshino.id)).toBe(hoshino.id);
    expect(asGuess("halo", round, SKIPPED)).toBe(SKIPPED);
  });

  it("rule out everyone sharing a wrong guess's picture", () => {
    const out = ruledOut("halo", [SKIPPED, aruNewYear.id]);
    expect(out.has(aru.id)).toBe(true);
    expect(out.has(aruNewYear.id)).toBe(true);
    expect(out.has(SKIPPED)).toBe(false);
  });
});

describe("hints", () => {
  it("end on the student's silhouette, or on the picture in silhouette", () => {
    expect(pictureHints(false, true)).toEqual(["school", "club", "silhouette"]);
    expect(pictureHints(true, true)).toEqual(["school", "club", "picture"]);
    expect(pictureHints(false, false)).toEqual(["school", "club"]);
  });

  it("show the shape in Silhouette and a run of silhouettes", () => {
    expect(showsShape("silhouette")).toBe(true);
    expect(showsShape("silhouette-nohint")).toBe(true);
    expect(showsShape("choice-silhouette")).toBe(true);
    expect(showsShape("endless")).toBe(false);
    expect(showsShape("choice")).toBe(false);
    expect(
      showsShape("timeattack", { answer: 1, guesses: [], shape: true })
    ).toBe(true);
  });
});

describe("daily puzzles", () => {
  it("follow each kind's schedule", () => {
    expect(dailyPicture("halo", 1)).toBe(haloOrder[0]);
    expect(dailyPicture("weapon", 2)).toBe(weaponOrder[1]);
  });

  it("schedule every picture once, on each server, by its lead there", () => {
    for (const [kind, order, server] of [
      ["halo", haloOrder, "global"],
      ["weapon", weaponOrder, "global"],
      ["halo", haloOrderJp, "jp"],
      ["weapon", weaponOrderJp, "jp"],
    ] as const) {
      const leads = pictureAnswers(kind, server).map(({ lead }) => lead);
      expect(new Set(order).size).toBe(order.length);
      expect([...order].sort()).toEqual([...leads].sort());
    }
  });
});

describe("the bag", () => {
  it("deals every picture once before any comes round again", () => {
    const random = seeded(7);
    const rounds: PictureRound[] = [];
    const total = pictureAnswers("weapon").length;
    for (let i = 0; i < total; i += 1) {
      rounds.push({
        answer: pickPicture("weapon", rounds, random),
        guesses: [],
      });
    }
    expect(new Set(rounds.map(({ answer }) => answer)).size).toBe(total);
  });
});

describe("four answers", () => {
  it("are four different students, the answer among them", () => {
    const random = seeded(3);
    for (const kind of PICTURE_KINDS) {
      for (const { lead } of pictureAnswers(kind).slice(0, 30)) {
        const choices = makePictureChoices(kind, lead, random);
        expect(choices).toHaveLength(4);
        expect(choices).toContain(lead);
        const names = choices.map(
          (id) => students.find((student) => student.id === id)?.fullName
        );
        expect(new Set(names).size).toBe(4);
        for (const id of choices) expect(answerOf(kind, id)?.lead).toBe(id);
      }
    }
  });
});

describe("saved rounds", () => {
  it("keep only pictures the game has", () => {
    const kept = knownPictureRounds("halo", [
      { answer: aru.id, guesses: [SKIPPED, 999999] },
      { answer: aruNewYear.id, guesses: [] },
      { answer: 999999, guesses: [] },
    ]);
    expect(kept).toEqual([{ answer: aru.id, guesses: [SKIPPED] }]);
  });
});

describe("the record and share text", () => {
  it("counts finished rounds with the picture", () => {
    const rounds: PictureRound[] = [
      { answer: aru.id, guesses: [aru.id] },
      { answer: aru.id, guesses: [1, 2, 3, 4] },
      { answer: aru.id, guesses: [] },
    ];
    expect(pictureRecordText(rounds, aru.id)).toBe("Seen 2 times · named 1");
    expect(pictureRecordText(rounds, hoshino.id)).toBe("");
  });

  it("names nobody", () => {
    const text = buildPictureShareText(
      "weapon",
      "daily",
      { answer: aru.id, guesses: [SKIPPED, hoshino.id, aru.id], day: 4 },
      "1/1"
    );
    expect(text).toContain("Weapon #4");
    expect(text).toContain("⬛🟥🟩⬜");
    expect(text).not.toContain("Aru");
  });
});

describe("time attack", () => {
  it("deals one-pick rounds tagged with the run and its settings", () => {
    const round = dealPictureRound(
      "halo",
      { answers: "choice", shape: true },
      42,
      []
    );
    expect(round.run).toBe(42);
    expect(round.shape).toBe(true);
    expect(round.choices).toHaveLength(4);
  });

  it("sums runs up, silhouettes kept apart", () => {
    const rounds: PictureRound[] = [
      answerPictureRound({ answer: aru.id, guesses: [], run: 1 }, aru.id),
      answerPictureRound({ answer: aru.id, guesses: [], run: 1 }, null),
      answerPictureRound(
        { answer: aru.id, guesses: [], run: 2, shape: true },
        aru.id
      ),
    ];
    expect(isWon(rounds[0])).toBe(true);
    expect(pictureRunsOf(rounds)).toEqual([
      {
        id: 1,
        score: 1,
        answered: 2,
        answers: "typed",
        clip: 0,
        shapes: false,
      },
      { id: 2, score: 1, answered: 1, answers: "typed", clip: 0, shapes: true },
    ]);
    expect(pictureTimeAttackStats(rounds).best.typed).toBe(1);
    expect(
      pictureTimeAttackShareText("halo", rounds, {
        answers: "typed",
        shape: false,
      })
    ).not.toContain("Aru");
  });
});

describe("ways to play", () => {
  it("are a pill and the options picked above the game", () => {
    expect(styleFor("endless", { shape: false, hints: true })).toBe("endless");
    expect(styleFor("endless", { shape: false, hints: false })).toBe("nohint");
    expect(styleFor("endless", { shape: true, hints: false })).toBe(
      "silhouette-nohint"
    );
    expect(styleFor("choice", { shape: true, hints: true })).toBe(
      "choice-silhouette"
    );
    for (const style of PICTURE_STYLES) {
      expect(styleFor(pillOf(style), optionsOf(style))).toBe(style);
    }
  });

  it("give hints in Daily and Classic unless turned off", () => {
    expect(hasPictureHints("daily")).toBe(true);
    expect(hasPictureHints("silhouette")).toBe(true);
    expect(hasPictureHints("nohint")).toBe(false);
    expect(hasPictureHints("silhouette-nohint")).toBe(false);
    expect(hasPictureHints("choice")).toBe(false);
  });

  it("keep each its own save", () => {
    expect(new Set(PICTURE_SLOTS).size).toBe(16);
    localStorage.clear();
    const rounds = [{ answer: aru.id, guesses: [] }];
    savePictureRounds("halo-silhouette-nohint", rounds);
    expect(localStorage.getItem("guess.halo.silhouette-nohint")).not.toBeNull();
    expect(loadPictureRounds("halo-silhouette-nohint")).toEqual(rounds);
    expect(loadPictureRounds("halo-silhouette")).toEqual([]);
  });
});
