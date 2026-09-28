import { describe, expect, it } from "vitest";

import {
  LOBBY_LINES,
  namesOf,
  pickAllLines,
  pickLines,
  saysName,
} from "./voiceData";

const hoshino = { name: "Hoshino (Swimsuit)", fullName: "Takanashi Hoshino" };

function line(group: string, clip: string, text?: string) {
  return {
    Group: group,
    AudioClip: `jp_x/${clip}.mp3`,
    ...(text === undefined ? {} : { Transcription: text }),
  };
}

const LONG = "I'm here to help you with whatever you need today, Sensei.";

function entry(lobby: unknown[], normal: unknown[] = []) {
  return { Normal: normal, Battle: [], Lobby: lobby, Event: [] };
}

describe("namesOf", () => {
  it("has the given and family names, without the costume", () => {
    expect(namesOf(hoshino)).toEqual(["takanashi", "hoshino"]);
    expect(
      namesOf({ name: "Shiroko*Terror", fullName: "Sunaookami Shiroko" })
    ).toEqual(["sunaookami", "shiroko", "terror"]);
  });
});

describe("saysName", () => {
  it("finds a name as a whole word, in any case", () => {
    expect(saysName("Hoshino's here!", ["hoshino"])).toBe(true);
    expect(saysName("I, TAKANASHI, will...", ["takanashi"])).toBe(true);
    expect(saysName("The Arius squad.", ["aru"])).toBe(false);
  });
});

describe("pickLines", () => {
  it("puts the title call first, with no text", () => {
    const lines = pickLines(
      entry(
        [line("UILobbyIdle1", "idle_1", LONG)],
        [line("CharacterGetIdle1", "get", LONG), line("UITitleIdle1", "title")]
      ),
      hoshino
    );
    expect(lines).toEqual([
      { clip: "jp_x/title.mp3", text: "" },
      { clip: "jp_x/idle_1.mp3", text: LONG },
    ]);
  });

  it("takes idle lines before greetings, and no seasonal ones", () => {
    const lines = pickLines(
      entry([
        line("UILobbyEnter1", "login_1", LONG),
        line("UILobbyXmas", "xmas", LONG),
        line("UILobbyIdle1", "lobby_1", LONG),
        line("UILobbyIdle2", "lobby_2", LONG),
      ]),
      hoshino
    );
    expect(lines.map(({ clip }) => clip)).toEqual([
      "jp_x/lobby_1.mp3",
      "jp_x/lobby_2.mp3",
      "jp_x/login_1.mp3",
    ]);
  });

  it(`keeps ${LOBBY_LINES} lobby lines at most`, () => {
    const lobby = [1, 2, 3, 4, 5].map((n) =>
      line(`UILobbyIdle${n}`, `lobby_${n}`, LONG)
    );
    expect(pickLines(entry(lobby), hoshino)).toHaveLength(LOBBY_LINES);
  });

  it("leaves out lines where the student says their name", () => {
    const lines = pickLines(
      entry([
        line(
          "UILobbyIdle1",
          "lobby_1",
          "Takanashi Hoshino, reporting for duty."
        ),
        line("UILobbyIdle2", "lobby_2", LONG),
      ]),
      hoshino
    );
    expect(lines.map(({ clip }) => clip)).toEqual(["jp_x/lobby_2.mp3"]);
  });

  it("takes the longest part of a line cut in parts, if it fits", () => {
    const lines = pickLines(
      entry([
        line("UILobbyIdle1", "lobby_1_1", "Ugh..."),
        line("UILobbyIdle1", "lobby_1_2", LONG),
        line("UILobbyIdle1", "lobby_1_3", `${LONG} ${LONG} ${LONG}`),
        line("UILobbyIdle2", "lobby_2_1", "Sensei!"),
      ]),
      hoshino
    );
    expect(lines).toEqual([{ clip: "jp_x/lobby_1_2.mp3", text: LONG }]);
  });

  it("stops when SchaleDB's format changes", () => {
    expect(() => pickLines({ Normal: [], Lobby: "none" }, hoshino)).toThrow(
      "voice data has changed"
    );
    expect(() =>
      pickLines(entry([{ Group: "UILobbyIdle1", AudioClip: 5 }]), hoshino)
    ).toThrow("voice data has changed");
  });
});

describe("pickAllLines", () => {
  it("lists students with no lines rather than stopping", () => {
    const { lines, missing } = pickAllLines(
      { 10005: entry([], [line("UITitleIdle1", "title")]) },
      [
        { id: 10005, ...hoshino },
        { id: 99999, name: "Newcomer", fullName: "New Comer" },
      ]
    );
    expect([...lines.keys()]).toEqual([10005]);
    expect(missing).toEqual(["Newcomer"]);
  });

  it("stops when the file isn't a table", () => {
    expect(() => pickAllLines([], [])).toThrow("voice data has changed");
  });
});
