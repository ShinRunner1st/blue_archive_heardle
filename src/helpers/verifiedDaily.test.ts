import React, { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createHarness } from "../test/harness";

import { songs } from "../constants/songs";
import { dailyOrder } from "../constants/dailyOrder";
import {
  haloOrder,
  haloOrderJp,
  weaponOrder,
  weaponOrderJp,
} from "../constants/guessDailyOrder";
import {
  gameplayOrder,
  gameplayOrderJp,
  loreOrder,
  loreOrderJp,
} from "../constants/studentDailyOrder";
import { voiceOrder, voiceOrderJp } from "../constants/voiceDailyOrder";
import { useGame } from "../hooks/useGame";
import { usePictureGame } from "../hooks/usePictureGame";
import { useStudentGame } from "../hooks/useStudentGame";
import { useVoiceGame } from "../hooks/useVoiceGame";
import { PictureKind } from "../types/picture";
import { Server } from "../types/server";
import { Round } from "../types/stats";
import { StudentGame, StudentRound } from "../types/student";
import { NamedRound, SKIPPED } from "../types/voice";
import { dailySong, dateOfDay, dayNumber } from "./daily";
import { answerOf, dailyPicture, picturePool } from "./pictureRounds";
import { setServer } from "./server";
import { dailyAnswer, poolOf } from "./studentRounds";
import {
  isVerifiedDaily,
  judgeDaily,
  movesOf,
  VERIFIED_DAILIES,
  VerifiedDaily,
  verifiedAnswer,
  verifiedDailyOf,
} from "./verifiedDaily";
import { dailyVoice, voicePool } from "./voiceRounds";

type Game = "ost" | "voice" | PictureKind | StudentGame;

const isStudents = (daily: string) => /^(gameplay|lore)\./.test(daily);

const STUDENT_DAILIES = VERIFIED_DAILIES.filter(isStudents);
const TRIED_DAILIES = VERIFIED_DAILIES.filter((daily) => !isStudents(daily));

function partsOf(daily: VerifiedDaily): { game: Game; server: Server } {
  const [game, server = "global"] = daily.split(".") as [Game, Server?];
  return { game, server };
}

/** Each daily's schedule, the one its answers are read from. */
const SCHEDULES: Record<VerifiedDaily, readonly (string | number)[]> = {
  ost: dailyOrder,
  "voice.global": voiceOrder,
  "voice.jp": voiceOrderJp,
  "halo.global": haloOrder,
  "halo.jp": haloOrderJp,
  "weapon.global": weaponOrder,
  "weapon.jp": weaponOrderJp,
  "gameplay.global": gameplayOrder,
  "gameplay.jp": gameplayOrderJp,
  "lore.global": loreOrder,
  "lore.jp": loreOrderJp,
};

/** Days to check: the first, ordinary ones, and each schedule's wrap. */
function daysFor(daily: VerifiedDaily): number[] {
  const length = SCHEDULES[daily].length;
  return [
    ...Array.from({ length: 40 }, (_, i) => i + 1),
    length - 1,
    length,
    length + 1,
    2 * length,
    2 * length + 1,
    1000,
    5000,
  ];
}

/** Whether a scheduled answer is still in its daily's game. */
function inGame(daily: VerifiedDaily, scheduled: string | number): boolean {
  const { game, server } = partsOf(daily);
  if (game === "ost") return songs.some(({ themeNo }) => themeNo === scheduled);
  if (game === "voice") {
    return voicePool(server).some(({ id }) => id === scheduled);
  }
  if (game === "halo" || game === "weapon") {
    return answerOf(game, scheduled as number, server)?.lead === scheduled;
  }
  return poolOf(game, server).some(({ id }) => id === scheduled);
}

/** The page's own answer: today's server picked, no server passed. */
function pageAnswer(daily: VerifiedDaily, day: number): string | number {
  const { game, server } = partsOf(daily);
  setServer(server);
  switch (game) {
    case "ost":
      return dailySong(day).themeNo;
    case "voice":
      return dailyVoice(day).answer;
    case "halo":
    case "weapon":
      return dailyPicture(game, day);
    default:
      return dailyAnswer(game, day);
  }
}

describe("the verified dailies", () => {
  it("are the eleven Phase 1 dailies", () => {
    expect(VERIFIED_DAILIES).toEqual([
      "ost",
      "voice.global",
      "voice.jp",
      "halo.global",
      "halo.jp",
      "weapon.global",
      "weapon.jp",
      "gameplay.global",
      "gameplay.jp",
      "lore.global",
      "lore.jp",
    ]);
    expect(verifiedDailyOf("ost", "jp")).toBe("ost");
    expect(verifiedDailyOf("lore", "jp")).toBe("lore.jp");
    for (const bad of ["ost.global", "voice", "halo.kr", "", null, 3]) {
      expect(isVerifiedDaily(bad)).toBe(false);
    }
  });
});

describe("a verified daily's answer", () => {
  it.each(VERIFIED_DAILIES)(
    "%s is the page's own, on every day checked",
    (daily) => {
      for (const day of daysFor(daily)) {
        expect([daily, day, verifiedAnswer(daily, day)]).toEqual([
          daily,
          day,
          pageAnswer(daily, day),
        ]);
      }
    }
  );

  it.each(VERIFIED_DAILIES)(
    "%s follows its schedule, round its end and back",
    (daily) => {
      const schedule = SCHEDULES[daily];
      for (const day of daysFor(daily)) {
        const scheduled = schedule[(day - 1) % schedule.length];
        const answer = verifiedAnswer(daily, day);
        // A scheduled answer that has left the game falls back, that day only.
        expect([day, answer === scheduled]).toEqual([
          day,
          inGame(daily, scheduled),
        ]);
        expect(inGame(daily, answer)).toBe(true);
      }
    }
  );

  it("doesn't depend on the server the page has picked", () => {
    for (const daily of VERIFIED_DAILIES) {
      setServer("global");
      const onGlobal = verifiedAnswer(daily, 12);
      setServer("jp");
      expect(verifiedAnswer(daily, 12)).toBe(onGlobal);
    }
  });

  it("differs between Global and JP in every game that has both", () => {
    for (const game of [
      "voice",
      "halo",
      "weapon",
      "gameplay",
      "lore",
    ] as const) {
      const differs = Array.from({ length: 60 }, (_, i) => i + 1).some(
        (day) =>
          verifiedAnswer(verifiedDailyOf(game, "global"), day) !==
          verifiedAnswer(verifiedDailyOf(game, "jp"), day)
      );
      expect([game, differs]).toEqual([game, true]);
    }
  });
});

// The hooks, played on a chosen day: the page's rounds, to judge.

let harness: ReturnType<typeof createHarness>;

beforeEach(() => {
  localStorage.clear();
  harness = createHarness();
  vi.useFakeTimers({ toFake: ["Date"] });
});

afterEach(() => {
  harness.destroy();
  vi.useRealTimers();
});

/** Sets the clock to noon on a puzzle day, the player's own time. */
function playOn(day: number) {
  vi.setSystemTime(dateOfDay(day).getTime() + 12 * 60 * 60_000);
  expect(dayNumber()).toBe(day);
}

/** A daily's hook on its day and server, with its moves and its round. */
interface Played {
  answer: string | number;
  /** Plays a guess (a theme number or student id), SKIPPED or null a skip. */
  play(move: string | number | null): void;
  giveUp(): void;
  round(): Round | NamedRound | StudentRound;
}

function render(daily: VerifiedDaily, day: number): Played {
  const { game, server } = partsOf(daily);
  setServer(server);
  playOn(day);

  if (game === "ost") {
    let state!: ReturnType<typeof useGame>;
    const Probe = () => {
      state = useGame("daily");
      return null;
    };
    harness.render(React.createElement(Probe));
    return {
      answer: state.solution.themeNo,
      play: (move) =>
        act(() =>
          move === null
            ? state.skip()
            : state.guess(songs.find(({ themeNo }) => themeNo === move)!)
        ),
      giveUp: () => {},
      round: () => state.round,
    };
  }

  if (game === "voice" || game === "halo" || game === "weapon") {
    let state!:
      | ReturnType<typeof useVoiceGame>
      | ReturnType<typeof usePictureGame>;
    const VoiceProbe = () => {
      state = useVoiceGame("daily");
      return null;
    };
    const PictureProbe = ({ kind }: { kind: PictureKind }) => {
      state = usePictureGame(kind, "daily");
      return null;
    };
    harness.render(
      game === "voice"
        ? React.createElement(VoiceProbe)
        : React.createElement(PictureProbe, { kind: game })
    );
    return {
      answer: state.round.answer,
      play: (move) =>
        act(() => (move === null ? state.skip() : state.guess(Number(move)))),
      giveUp: () => {},
      round: () => state.round,
    };
  }

  let state!: ReturnType<typeof useStudentGame>;
  const Probe = () => {
    state = useStudentGame(game, "daily");
    return null;
  };
  harness.render(React.createElement(Probe));
  return {
    answer: state.round.answer,
    play: (move) => act(() => state.guess(Number(move))),
    giveUp: () => act(() => state.giveUp()),
    round: () => state.round,
  };
}

/** Wrong answers the daily's search offers: ids, or the OST's theme numbers. */
function wrongs(daily: VerifiedDaily, day: number, count: number) {
  const { game, server } = partsOf(daily);
  const answer = verifiedAnswer(daily, day);
  if (game === "ost") {
    return songs
      .map(({ themeNo }) => themeNo)
      .filter((themeNo) => themeNo !== answer)
      .slice(0, count);
  }
  const members =
    game === "halo" || game === "weapon"
      ? answerOf(game, answer as number, server)?.members ?? []
      : [answer];
  const pool =
    game === "voice"
      ? voicePool(server)
      : game === "halo" || game === "weapon"
      ? picturePool(game, server)
      : poolOf(game, server);
  return pool
    .map(({ id }) => id)
    .filter((id) => !members.includes(id))
    .slice(0, count);
}

/** What the page says of its round, to hold the judge to. */
function pageVerdict(daily: VerifiedDaily, round: Played["round"]) {
  const saved = round();
  if (daily === "ost") {
    const { didGuess, currentTry, guesses } = saved as Round;
    const over = didGuess || currentTry >= guesses.length;
    return {
      outcome: didGuess ? "won" : over ? "lost" : "playing",
      tries: currentTry,
    };
  }
  const { answer, guesses, gaveUp } = saved as StudentRound;
  const won = guesses[guesses.length - 1] === answer;
  const over =
    won || (isStudents(daily) ? gaveUp === true : guesses.length >= 4);
  return {
    outcome: won ? "won" : over ? "lost" : "playing",
    tries: guesses.length,
  };
}

/** Plays moves on the page, then judges the round it saved. */
function playAndJudge(
  daily: VerifiedDaily,
  day: number,
  moves: (string | number | null | "give up")[]
) {
  const page = render(daily, day);
  expect(page.answer).toBe(verifiedAnswer(daily, day));
  for (const move of moves) {
    if (move === "give up") page.giveUp();
    else page.play(move);
  }
  const judged = judgeDaily(daily, day, movesOf(daily, page.round()));
  return { page, judged, verdict: pageVerdict(daily, page.round) };
}

const skip = (daily: VerifiedDaily) => (daily === "ost" ? null : SKIPPED);

const DAYS = [1, 2, 37, 366];

describe("judging a daily as the page plays it", () => {
  it.each(VERIFIED_DAILIES)("%s: a win after a miss and a skip", (daily) => {
    for (const day of DAYS) {
      const [wrong] = wrongs(daily, day, 1);
      const answer = verifiedAnswer(daily, day);
      const moves = isStudents(daily)
        ? [wrong, answer]
        : [wrong, skip(daily), answer];
      const { judged, verdict } = playAndJudge(daily, day, moves);
      expect(judged).toEqual({ valid: true, ...verdict });
      expect(verdict.outcome).toBe("won");
      harness.unmount();
      localStorage.clear();
    }
  });

  it.each(TRIED_DAILIES)(
    "%s: a loss uses every try, and nothing goes after it",
    (daily) => {
      const day = 37;
      const tries = daily === "ost" ? 6 : 4;
      const misses = wrongs(daily, day, tries);
      const { page, judged, verdict } = playAndJudge(daily, day, [
        ...misses.slice(0, tries - 1),
        skip(daily),
      ]);
      expect(verdict).toEqual({ outcome: "lost", tries });
      expect(judged).toEqual({ valid: true, outcome: "lost", tries });

      // The page ignores the answer once the tries are gone; the judge refuses it.
      page.play(verifiedAnswer(daily, day));
      expect(movesOf(daily, page.round()).guesses).toHaveLength(tries);
      const late = [
        ...movesOf(daily, page.round()).guesses,
        verifiedAnswer(daily, day),
      ];
      expect(judgeDaily(daily, day, { guesses: late })).toEqual({
        valid: false,
        reason: "over",
        at: tries,
      });
    }
  );

  it.each(VERIFIED_DAILIES)("%s: a round still playing", (daily) => {
    const day = 2;
    const { judged, verdict } = playAndJudge(daily, day, wrongs(daily, day, 2));
    expect(verdict).toEqual({ outcome: "playing", tries: 2 });
    expect(judged).toEqual({ valid: true, outcome: "playing", tries: 2 });
  });

  it.each(VERIFIED_DAILIES)(
    "%s: the moves the page ignores are refused",
    (daily) => {
      const day = 366;
      const [wrong] = wrongs(daily, day, 1);
      const answer = verifiedAnswer(daily, day);
      if (daily === "ost") {
        // The OST takes the same wrong song twice, as its search offers it
        // again; a song not in the list can't be picked, and is refused.
        const { page, judged } = playAndJudge(daily, day, [
          wrong,
          wrong,
          answer,
        ]);
        expect(movesOf(daily, page.round()).guesses).toEqual([
          wrong,
          wrong,
          answer,
        ]);
        expect(judged).toEqual({ valid: true, outcome: "won", tries: 3 });
        expect(
          judgeDaily(daily, day, { guesses: [wrong, "no-such-theme", answer] })
        ).toEqual({ valid: false, reason: "ignored", at: 1 });
        return;
      }
      const raw = [wrong, wrong, 999_999_999, answer];
      const { page, judged } = playAndJudge(daily, day, raw);
      const saved = movesOf(daily, page.round()).guesses;
      {
        expect(saved).toEqual([wrong, answer]);
        expect(judgeDaily(daily, day, { guesses: raw })).toEqual({
          valid: false,
          reason: "ignored",
          at: 1,
        });
      }
      expect(judged).toMatchObject({ valid: true, outcome: "won" });
    }
  );
});

describe("Picture", () => {
  it("takes any student who shares the picture as the answer, as the page does", () => {
    for (const daily of [
      "halo.global",
      "halo.jp",
      "weapon.global",
      "weapon.jp",
    ] as const) {
      const { game, server } = partsOf(daily);
      const kind = game as PictureKind;
      const day = Array.from({ length: 400 }, (_, i) => i + 1).find(
        (d) =>
          (answerOf(kind, verifiedAnswer(daily, d) as number, server)?.members
            .length ?? 0) > 1
      )!;
      const answer = verifiedAnswer(daily, day) as number;
      const other = answerOf(kind, answer, server)!.members.find(
        (id) => id !== answer
      )!;

      const { page, judged } = playAndJudge(daily, day, [other]);
      expect(movesOf(daily, page.round()).guesses).toEqual([answer]);
      expect(judged).toEqual({ valid: true, outcome: "won", tries: 1 });
      expect(judgeDaily(daily, day, { guesses: [other] })).toEqual(judged);
      harness.unmount();
      localStorage.clear();
    }
  });
});

describe("Students", () => {
  it.each(STUDENT_DAILIES)("%s: giving up is a loss, at any point", (daily) => {
    const day = 37;
    const { judged, verdict } = playAndJudge(daily, day, ["give up"]);
    expect(verdict).toEqual({ outcome: "lost", tries: 0 });
    expect(judged).toEqual({ valid: true, outcome: "lost", tries: 0 });
    harness.unmount();
    localStorage.clear();

    const misses = wrongs(daily, day, 5);
    const later = playAndJudge(daily, day, [...misses, "give up"]);
    expect(later.verdict).toEqual({ outcome: "lost", tries: 5 });
    expect(later.judged).toEqual({ valid: true, outcome: "lost", tries: 5 });
  });

  it.each(STUDENT_DAILIES)("%s: no limit on guesses", (daily) => {
    const day = 2;
    const misses = wrongs(daily, day, 60);
    const { judged, verdict } = playAndJudge(daily, day, [
      ...misses,
      verifiedAnswer(daily, day),
    ]);
    expect(verdict).toEqual({ outcome: "won", tries: 61 });
    expect(judged).toEqual({ valid: true, outcome: "won", tries: 61 });
  });

  it.each(STUDENT_DAILIES)(
    "%s: a give-up after the find, or a skip, is refused",
    (daily) => {
      const day = 2;
      const answer = verifiedAnswer(daily, day);
      const { page } = playAndJudge(daily, day, [answer, "give up"]);
      expect((page.round() as StudentRound).gaveUp).toBeUndefined();
      expect(
        judgeDaily(daily, day, { guesses: [answer], gaveUp: true })
      ).toEqual({ valid: false, reason: "over", at: 1 });
      expect(judgeDaily(daily, day, { guesses: [SKIPPED, answer] })).toEqual({
        valid: false,
        reason: "shape",
        at: 0,
      });
    }
  );
});

describe("the judge on its own", () => {
  const day = 37;

  it("refuses a day that isn't a puzzle number", () => {
    for (const bad of [0, -1, 1.5, Number.NaN, Infinity]) {
      expect(judgeDaily("ost", bad, { guesses: [] })).toEqual({
        valid: false,
        reason: "day",
      });
    }
  });

  it("refuses moves of the wrong kind or too many of them", () => {
    const answer = verifiedAnswer("voice.global", day) as number;
    expect(
      judgeDaily("ost", day, { guesses: [Number(dailySong(day).themeNo)] })
    ).toEqual({
      valid: false,
      reason: "shape",
      at: 0,
    });
    expect(
      judgeDaily("voice.global", day, { guesses: [String(answer)] })
    ).toEqual({
      valid: false,
      reason: "shape",
      at: 0,
    });
    expect(judgeDaily("voice.global", day, { guesses: [-4] })).toEqual({
      valid: false,
      reason: "shape",
      at: 0,
    });
    expect(
      judgeDaily("voice.global", day, { guesses: "nope" as never })
    ).toEqual({ valid: false, reason: "shape" });
    expect(
      judgeDaily("gameplay.global", day, {
        guesses: Array.from({ length: 10_000 }, () => 1),
      })
    ).toEqual({ valid: false, reason: "shape" });
  });

  it("allows a give-up only in Students, and only as true", () => {
    expect(judgeDaily("voice.jp", day, { guesses: [], gaveUp: true })).toEqual({
      valid: false,
      reason: "shape",
    });
    expect(judgeDaily("lore.jp", day, { guesses: [], gaveUp: "yes" })).toEqual({
      valid: false,
      reason: "shape",
    });
    expect(judgeDaily("lore.jp", day, { guesses: [], gaveUp: false })).toEqual({
      valid: true,
      outcome: "playing",
      tries: 0,
    });
  });

  it("counts skips as tries, and a find on the last one as a win", () => {
    const answer = dailySong(day).themeNo;
    expect(
      judgeDaily("ost", day, {
        guesses: [null, null, null, null, null, answer],
      })
    ).toEqual({ valid: true, outcome: "won", tries: 6 });
    expect(
      judgeDaily("ost", day, { guesses: [null, null, null, null, null, null] })
    ).toEqual({ valid: true, outcome: "lost", tries: 6 });
    const voice = verifiedAnswer("voice.jp", day) as number;
    expect(
      judgeDaily("voice.jp", day, {
        guesses: [SKIPPED, SKIPPED, SKIPPED, voice],
      })
    ).toEqual({ valid: true, outcome: "won", tries: 4 });
    expect(judgeDaily("voice.jp", day, { guesses: [voice, voice] })).toEqual({
      valid: false,
      reason: "over",
      at: 1,
    });
  });

  it("judges by the day: yesterday's answer is wrong today", () => {
    const yesterday = verifiedAnswer("gameplay.global", day - 1);
    const judged = judgeDaily("gameplay.global", day, {
      guesses: [yesterday],
    });
    expect(judged).toEqual(
      yesterday === verifiedAnswer("gameplay.global", day)
        ? { valid: true, outcome: "won", tries: 1 }
        : { valid: true, outcome: "playing", tries: 1 }
    );
  });
});
