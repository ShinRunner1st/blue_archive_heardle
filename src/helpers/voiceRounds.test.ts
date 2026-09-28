import { describe, expect, it } from "vitest";

import { students } from "../constants/students";
import { SKIPPED, VoiceRound } from "../types/voice";
import {
  buildVoiceShareText,
  dailyVoice,
  dayLine,
  hintsShown,
  isOver,
  isWon,
  knownVoiceRounds,
  lineCount,
  makeVoiceChoices,
  pickVoice,
  triesOf,
  VOICE_TRIES,
  voicePool,
  voiceTally,
} from "./voiceRounds";

const byName = (name: string) => {
  const found = students.find((student) => student.name === name);
  if (!found) throw new Error(`no ${name}`);
  return found;
};

const hoshino = byName("Hoshino");
const aru = byName("Aru");

function round(overrides: Partial<VoiceRound> = {}): VoiceRound {
  return { answer: hoshino.id, line: 0, guesses: [], ...overrides };
}

/** A small seeded random, so the bag tests don't depend on luck. */
function seeded(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return state / 2147483648;
  };
}

describe("the voice pool", () => {
  it("is everyone with lines, nearly the whole table", () => {
    expect(voicePool.length).toBeGreaterThan(students.length - 5);
    for (const { id } of voicePool) expect(lineCount(id)).toBeGreaterThan(0);
  });
});

describe("rounds", () => {
  it("have four tries, or one with four answers or in a run", () => {
    expect(triesOf(round())).toBe(VOICE_TRIES);
    expect(triesOf(round({ choices: [1, 2, 3, hoshino.id] }))).toBe(1);
    expect(triesOf(round({ run: 5 }))).toBe(1);
  });

  it("end on the answer, or when the tries run out", () => {
    expect(isOver(round({ guesses: [aru.id] }))).toBe(false);
    expect(isWon(round({ guesses: [aru.id, hoshino.id] }))).toBe(true);
    expect(isOver(round({ guesses: [1, 2, SKIPPED, 3] }))).toBe(true);
    expect(isWon(round({ guesses: [1, 2, SKIPPED, 3] }))).toBe(false);
  });

  it("open a hint with each miss, all at the end, none without hints", () => {
    expect(hintsShown(round(), true)).toBe(0);
    expect(hintsShown(round({ guesses: [aru.id] }), true)).toBe(1);
    expect(hintsShown(round({ guesses: [aru.id, SKIPPED, 3] }), true)).toBe(3);
    expect(hintsShown(round({ guesses: [hoshino.id] }), true)).toBe(3);
    expect(hintsShown(round({ guesses: [aru.id] }), false)).toBe(0);
  });
});

describe("dailyVoice", () => {
  it("is the same for everyone, a student with lines, and a line they have", () => {
    for (let day = 1; day <= 400; day += 7) {
      const { answer, line } = dailyVoice(day);
      expect(dailyVoice(day)).toEqual({ answer, line });
      expect(line).toBeLessThan(lineCount(answer));
    }
  });

  it("deals every student before any comes round again", () => {
    const answers = voicePool.map((_, index) => dailyVoice(index + 1).answer);
    expect(new Set(answers).size).toBe(voicePool.length);
  });

  it("spreads the days over a student's lines", () => {
    const lines = new Set(
      Array.from({ length: 50 }, (_, day) => dayLine(day + 1, 5))
    );
    expect(lines.size).toBe(5);
    expect(dayLine(3, 0)).toBe(0);
  });
});

describe("pickVoice", () => {
  it("deals every student once before any comes round again", () => {
    const random = seeded(7);
    const rounds: VoiceRound[] = [];
    for (let i = 0; i < voicePool.length; i += 1) {
      rounds.push({ ...pickVoice(rounds, random), guesses: [] });
    }
    expect(new Set(rounds.map(({ answer }) => answer)).size).toBe(
      voicePool.length
    );
    for (const { answer, line } of rounds) {
      expect(line).toBeLessThan(lineCount(answer));
    }

    // A new bag doesn't start with the last one again.
    const last = rounds[rounds.length - 1].answer;
    for (let i = 0; i < 20; i += 1) {
      expect(pickVoice(rounds, random).answer).not.toBe(last);
    }
  });
});

describe("makeVoiceChoices", () => {
  it("offers four different students, the answer among them", () => {
    const random = seeded(3);
    for (const answer of [hoshino, aru, byName("Shiroko")]) {
      const choices = makeVoiceChoices(answer, random);
      expect(choices).toHaveLength(4);
      expect(choices).toContain(answer.id);

      const picked = choices.map((id) => students.find((s) => s.id === id)!);
      // No one twice, and no other costume of the answer.
      expect(new Set(picked.map(({ fullName }) => fullName)).size).toBe(4);
    }
  });

  it("offers two from the answer's school where there are", () => {
    const choices = makeVoiceChoices(hoshino, seeded(11));
    const schools = choices
      .filter((id) => id !== hoshino.id)
      .map((id) => students.find((s) => s.id === id)!.school);
    expect(schools.filter((school) => school === hoshino.school)).toHaveLength(
      2
    );
  });
});

describe("knownVoiceRounds", () => {
  it("drops unknown students, fits the line, and keeps skips", () => {
    const count = lineCount(hoshino.id);
    const kept = knownVoiceRounds([
      round({ answer: 1 }),
      round({ line: count + 1, guesses: [SKIPPED, 2, aru.id] }),
    ]);
    expect(kept).toEqual([round({ line: 1, guesses: [SKIPPED, aru.id] })]);
  });

  it("leaves a round that needs nothing as it is", () => {
    const whole = round({ choices: [aru.id, hoshino.id] });
    expect(knownVoiceRounds([whole])[0]).toBe(whole);
    expect(knownVoiceRounds([round({ choices: [1, hoshino.id] })])[0]).toEqual(
      round()
    );
  });
});

describe("voiceTally", () => {
  it("counts losses first, then wins by try", () => {
    const rounds = [
      round({ guesses: [hoshino.id] }),
      round({ guesses: [SKIPPED, aru.id, hoshino.id] }),
      round({ guesses: [1, 2, 3, 4] }),
      round({ guesses: [aru.id] }),
    ];
    expect(voiceTally(rounds, VOICE_TRIES)).toEqual([1, 1, 0, 1, 0]);
  });
});

describe("buildVoiceShareText", () => {
  it("names nobody, with a square per try", () => {
    const text = buildVoiceShareText(
      "daily",
      round({ day: 4, guesses: [aru.id, SKIPPED, hoshino.id] }),
      "1/1"
    );
    expect(text).toBe(
      [
        "Blue Archive Heardle · Voice #4",
        "🔊🟥⬛🟩⬜",
        "https://baheardle.com/",
      ].join("\n")
    );
    expect(text).not.toContain("Hoshino");
  });

  it("gives the score in the bag modes", () => {
    const text = buildVoiceShareText(
      "choice",
      round({ choices: [1, 2, 3, hoshino.id], guesses: [hoshino.id] }),
      "3/4"
    );
    expect(text).toContain("Voice (4-Choice)");
    expect(text).toContain("🔊🟩\n");
    expect(text).toContain("Score: 3/4");
  });
});
