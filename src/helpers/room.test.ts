import { describe, expect, it } from "vitest";

import { audioClips } from "../constants/audioClips";
import { voiceLines } from "../constants/voiceLines";
import {
  ClientMessage,
  DEFAULT_ROOM_SETTINGS,
  FIRST_LEAD_MS,
  GRACE_MS,
  IDLE_MS,
  LEAD_MS,
  CHANGE_GAP_MS,
  LOAD_MS,
  MAX_PLAYERS,
  OVER_MS,
  PROTOCOL,
  REVEAL_MAX_MS,
  REVEAL_MS,
  RoomSettings,
  SEND_GAP_MS,
  SETTLE_MS,
  VOTE_MS,
} from "../types/room";
import { songFile, voiceFile } from "./audioFiles";
import { answerOf, pictureAnswers } from "./pictureRounds";
import {
  cleanName,
  cleanSettings,
  countMessage,
  dealRounds,
  roomSongs,
  EMPTY_MS,
  Flood,
  FLOOD_LIMIT,
  FLOOD_MS,
  isRight,
  nameKey,
  parseMessage,
  PlayerRecord,
  Room,
  samePassword,
  TIDY_MS,
} from "./room";
import { hasTitleCall, voicePool } from "./voiceRounds";
import badges from "../content/badges.json";

/** A seeded random, so a game deals the same rounds every run. */
function seeded(seed = 1): () => number {
  let s = seed;
  return () => {
    s = (Math.imul(s, 1103515245) + 12345) >>> 0;
    return s / 2 ** 32;
  };
}

function hello(
  token: string,
  name: string,
  extra: Partial<Extract<ClientMessage, { t: "hello" }>> = {}
): Extract<ClientMessage, { t: "hello" }> {
  return { t: "hello", v: PROTOCOL, token, name, icon: null, ...extra };
}

/** A room made by Aru, with the others joined. */
function room(settings: Partial<RoomSettings> = {}, others = ["Mutsuki"]) {
  const game = new Room("ABCD", null, null, [], seeded());
  const made = game.hello(
    hello("token-aru", "Aru", {
      create: { ...DEFAULT_ROOM_SETTINGS, ...settings },
    }),
    0,
    true
  );
  if (!("player" in made)) throw new Error(made.error);
  const players = [made.player];
  others.forEach((name, i) => {
    const joined = game.hello(hello(`token-${name}`, name), i + 1, false);
    if (!("player" in joined)) throw new Error(joined.error);
    players.push(joined.player);
  });
  return { game, players };
}

function readyAll(
  game: Room,
  players: PlayerRecord[],
  round: number,
  now: number
) {
  for (const player of players) {
    game.message(player, { t: "ready", round }, now);
  }
}

/** Starts the game at `now` and plays the first round's count-in. */
function started(settings: Partial<RoomSettings> = {}, others = ["Mutsuki"]) {
  const made = room(settings, others);
  made.game.message(made.players[0], { t: "start" }, 100);
  readyAll(made.game, made.players, 0, 200);
  return { ...made, startsAt: 200 + FIRST_LEAD_MS };
}

const answerOfRound = (game: Room) => game.game!.deal[game.live!.round].answer;

/** The host asks to end the game, and everyone else agrees. */
function endGame(game: Room, players: PlayerRecord[], now: number) {
  game.message(players[0], { t: "end" }, now);
  for (const player of players.slice(1)) {
    game.message(player, { t: "vote", yes: true }, now);
  }
}

describe("dealRounds", () => {
  it("deals different whole songs, each starting with room to play", () => {
    const settings = { ...DEFAULT_ROOM_SETTINGS, rounds: 30 };
    const deal = dealRounds(settings, seeded());
    expect(new Set(deal.map((r) => r.answer)).size).toBe(30);
    for (const round of deal) {
      const { duration, v } = audioClips[round.answer];
      expect(round.media.file).toBe(songFile(round.answer, v));
      expect(round.media.start).toBeGreaterThanOrEqual(0);
      expect(round.media.start!).toBeLessThanOrEqual(
        Math.max(0, duration - settings.guessSeconds)
      );
      expect(round.choices).toBeUndefined();
    }
  });

  it("deals only the albums picked, and a shorter game if they're few", () => {
    const [one, three] = [badges[0], badges[2]].map(
      ({ songs }) => new Set(songs.split(" "))
    );
    const deal = dealRounds(
      { ...DEFAULT_ROOM_SETTINGS, albums: [1, 3], rounds: 30 },
      seeded()
    );
    expect(deal).toHaveLength(30);
    expect(deal.every((r) => one.has(r.answer) || three.has(r.answer))).toBe(
      true
    );
    const small = Math.min(
      ...badges.map(({ songs }) => songs.split(" ").length)
    );
    const album = badges.find(
      ({ songs }) => songs.split(" ").length === small
    )!;
    const short = dealRounds(
      { ...DEFAULT_ROOM_SETTINGS, albums: [album.number], rounds: 30 },
      seeded()
    );
    expect(short.length).toBe(Math.min(30, roomSongs([album.number]).length));
  });

  it("deals title calls only, when asked", () => {
    const deal = dealRounds(
      { ...DEFAULT_ROOM_SETTINGS, game: "voice", lines: "titles", rounds: 30 },
      seeded()
    );
    for (const round of deal) {
      const id = Number(round.answer);
      expect(hasTitleCall(id)).toBe(true);
      expect(round.media.file).toBe(
        voiceFile(id, 0, voiceLines[id]?.[1] ?? "")
      );
    }
  });

  it("starts each song at the top, or anywhere", () => {
    const top = dealRounds(
      { ...DEFAULT_ROOM_SETTINGS, start: "start" },
      seeded()
    );
    expect(top.every((r) => r.media.start === 0)).toBe(true);
    const anywhere = dealRounds(DEFAULT_ROOM_SETTINGS, seeded());
    expect(new Set(anywhere.map((r) => r.media.start)).size).toBeGreaterThan(1);
  });

  it("deals voices from the room's server, with four answers each", () => {
    const deal = dealRounds(
      {
        ...DEFAULT_ROOM_SETTINGS,
        game: "voice",
        answers: "choice",
        server: "jp",
      },
      seeded()
    );
    const pool = new Set(voicePool("jp").map((s) => String(s.id)));
    for (const round of deal) {
      expect(pool.has(round.answer)).toBe(true);
      expect(round.media.file).toMatch(/^voices\/\w+\.ogg$/);
      expect(round.choices).toHaveLength(4);
      expect(round.choices).toContain(round.answer);
    }
  });

  it("deals pictures by their cell, never the student", () => {
    const settings: RoomSettings = {
      ...DEFAULT_ROOM_SETTINGS,
      game: "picture",
      picture: "weapon",
      answers: "choice",
    };
    const deal = dealRounds(settings, seeded());
    const cells = new Map(
      pictureAnswers("weapon", "global").map((a) => [String(a.lead), a.picture])
    );
    for (const round of deal) {
      expect(round.media).toEqual({ cell: cells.get(round.answer) });
      expect(round.choices).toContain(round.answer);
    }
    const shapes = dealRounds({ ...settings, silhouette: true }, seeded());
    expect(shapes[0].media.cell).toBe(
      answerOf("weapon", Number(shapes[0].answer), "global")!.shape
    );
  });

  it("takes any student a picture belongs to as right", () => {
    const shared = pictureAnswers("halo", "global").find(
      (a) => a.members.length > 1
    )!;
    const settings = { ...DEFAULT_ROOM_SETTINGS, game: "picture" as const };
    const answer = String(shared.lead);
    expect(isRight(settings, answer, String(shared.members[1]))).toBe(true);
    expect(isRight(settings, answer, null)).toBe(false);
    expect(
      isRight({ ...settings, game: "voice" }, answer, String(shared.members[1]))
    ).toBe(false);
  });
});

describe("checking what pages send", () => {
  it("keeps settings in their ranges", () => {
    expect(cleanSettings(DEFAULT_ROOM_SETTINGS)).toEqual(DEFAULT_ROOM_SETTINGS);
    expect(cleanSettings({ ...DEFAULT_ROOM_SETTINGS, rounds: 31 })).toBeNull();
    expect(cleanSettings({ ...DEFAULT_ROOM_SETTINGS, rounds: 7.5 })).toBeNull();
    expect(
      cleanSettings({ ...DEFAULT_ROOM_SETTINGS, guessSeconds: 4 })
    ).toBeNull();
    expect(
      cleanSettings({ ...DEFAULT_ROOM_SETTINGS, maxPlayers: 9 })
    ).toBeNull();
    expect(
      cleanSettings({ ...DEFAULT_ROOM_SETTINGS, game: "students" })
    ).toBeNull();
    expect(
      cleanSettings({ ...DEFAULT_ROOM_SETTINGS, start: "end" })
    ).toBeNull();
    expect(
      cleanSettings({ ...DEFAULT_ROOM_SETTINGS, albums: [3, 1, 3] })
    ).toEqual({ ...DEFAULT_ROOM_SETTINGS, albums: [1, 3] });
    expect(
      cleanSettings({ ...DEFAULT_ROOM_SETTINGS, albums: [99] })
    ).toBeNull();
    expect(cleanSettings({ ...DEFAULT_ROOM_SETTINGS, albums: "1" })).toBeNull();
    expect(
      cleanSettings({ ...DEFAULT_ROOM_SETTINGS, lines: "lobby" })
    ).toBeNull();
    // Kept before the albums and lines: they take their defaults.
    const { albums, lines, ...older } = DEFAULT_ROOM_SETTINGS;
    expect(albums && lines && cleanSettings(older)).toEqual(
      DEFAULT_ROOM_SETTINGS
    );
    // Gone: it played much like a random start.
    expect(
      cleanSettings({ ...DEFAULT_ROOM_SETTINGS, start: "clip" })
    ).toBeNull();
  });

  it("cleans names and drops what isn't a message", () => {
    expect(cleanName("  Aru\n  Rikuhachima ")).toBe("Aru Rikuhachima");
    expect(cleanName("")).toBe("Sensei");
    expect(parseMessage("nonsense")).toBeNull();
    expect(parseMessage(JSON.stringify({ t: "guess", round: 0 }))).toBeNull();
    expect(parseMessage("x".repeat(2000))).toBeNull();
    expect(parseMessage(JSON.stringify({ t: "tick" }))).toEqual({ t: "tick" });
    const parsed = parseMessage(
      JSON.stringify({ ...hello("abcdefgh", "Aru"), icon: 99999999 })
    );
    expect(parsed).toMatchObject({ t: "hello", icon: null });
    expect(parseMessage(JSON.stringify({ t: "stay" }))).toEqual({ t: "stay" });
    expect(
      parseMessage(
        JSON.stringify({ ...hello("abcdefgh", "Aru"), back: "ijklmnop" })
      )
    ).toMatchObject({ back: "ijklmnop" });
    expect(
      parseMessage(JSON.stringify({ ...hello("abcdefgh", "Aru"), back: "<>" }))
    ).not.toHaveProperty("back");
  });
});

describe("the lobby", () => {
  it("closes when nothing happens in it for IDLE_MS", () => {
    const { game, players } = room();
    // Mutsuki joined at 1: the clock runs from then.
    expect(game.viewFor(players[0], 1000).endsIn).toBe(IDLE_MS - 999);
    game.message(players[1], { t: "tick" }, IDLE_MS);
    expect(game.closing).toBeNull();
    // Someone says they're still there, and it starts again.
    game.message(players[1], { t: "stay" }, IDLE_MS - 10);
    game.message(players[0], { t: "tick" }, IDLE_MS + 1);
    expect(game.closing).toBeNull();
    game.message(players[0], { t: "tick" }, 2 * IDLE_MS - 10);
    expect(game.closing).toBe("idle");
  });

  it("writes nothing, however much happens in it", () => {
    const { game, players } = room({}, ["Mutsuki", "Kayoko"]);
    game.message(
      players[0],
      { t: "settings", settings: { ...DEFAULT_ROOM_SETTINGS, rounds: 20 } },
      5
    );
    game.leave(players[2], 6);
    expect(game.save || game.wipe || game.alarmAt !== null).toBe(false);
    expect(game.live!.settings.rounds).toBe(20);
  });

  it("takes settings only from the host, never below the players in it", () => {
    const { game, players } = room({}, ["Mutsuki", "Kayoko"]);
    const settings = { ...DEFAULT_ROOM_SETTINGS, maxPlayers: 2 };
    game.message(players[1], { t: "settings", settings }, 5);
    expect(game.live!.settings.maxPlayers).toBe(8);
    game.message(players[0], { t: "settings", settings }, 5);
    expect(game.live!.settings.maxPlayers).toBe(3);
  });

  it("needs two players to start", () => {
    const { game, players } = room({}, []);
    game.message(players[0], { t: "start" }, 5);
    expect(game.live!.phase).toBe("lobby");
  });

  it("says why a page can't get in", () => {
    const { game } = room({ maxPlayers: 2 });
    expect(game.hello(hello("token-x", "Haruka"), 5, false)).toEqual({
      error: "full",
    });
    expect(
      game.hello(
        hello("token-y", "Haruka", { create: DEFAULT_ROOM_SETTINGS }),
        5,
        true
      )
    ).toEqual({ error: "taken" });
    const empty = new Room("WXYZ", null, null, []);
    expect(empty.hello(hello("token-x", "Haruka"), 5, false)).toEqual({
      error: "missing",
    });
    // Making a room needs a connection the Worker counted as one.
    expect(
      empty.hello(
        hello("token-x", "Haruka", { create: DEFAULT_ROOM_SETTINGS }),
        5,
        false
      )
    ).toEqual({ error: "missing" });
    expect(empty.hello(hello("token-x", "Haruka", { v: 1 }), 5, false)).toEqual(
      { error: "version" }
    );
  });

  it("is made again by a page coming back to it after it closed", () => {
    const empty = new Room("WXYZ", null, null, []);
    const back = empty.hello(
      hello("token-x", "Haruka", {
        create: DEFAULT_ROOM_SETTINGS,
        rejoin: true,
      }),
      5,
      true
    );
    expect("player" in back).toBe(true);
    expect(empty.live!.phase).toBe("lobby");
  });

  it("passes the host to whoever came next", () => {
    const { game, players } = room({}, ["Mutsuki", "Kayoko"]);
    game.leave(players[0], 10);
    expect(game.live!.host).toBe(players[1].id);
  });
});

describe("a game", () => {
  it("starts with a write and a tidying alarm, and hides every answer", () => {
    const { game, players } = room({ answers: "choice" });
    game.message(players[0], { t: "start" }, 100);
    expect(game.live!.phase).toBe("loading");
    expect(game.save).toBe(true);
    expect(game.alarmAt).toBe(100 + TIDY_MS);

    const view = game.viewFor(players[1], 100);
    expect(view.current?.file).toBe(game.game!.deal[0].media.file);
    expect(view.current?.choices).toBeUndefined();
    const text = JSON.stringify(view);
    for (const round of game.game!.deal) {
      expect(text).not.toContain(`"${round.answer}"`);
    }
  });

  it("counts in, once everyone has the clip, and shows the four then", () => {
    const { game, players } = room({ answers: "choice" });
    game.message(players[0], { t: "start" }, 100);
    game.message(players[0], { t: "ready", round: 0 }, 150);
    expect(game.live!.phase).toBe("loading");
    game.message(players[1], { t: "ready", round: 0 }, 200);
    const view = game.viewFor(players[0], 200);
    expect(view.phase).toBe("playing");
    expect(view.startsIn).toBe(FIRST_LEAD_MS);
    expect(view.endsIn).toBe(FIRST_LEAD_MS + 20_000);
    expect(view.current?.choices).toHaveLength(4);
    expect(view.next?.file).toBe(game.game!.deal[1].media.file);
  });

  it("plays without a slow page once the first load's wait is up", () => {
    const { game, players } = room();
    game.message(players[0], { t: "start" }, 100);
    game.message(players[0], { t: "ready", round: 0 }, 150);
    game.message(players[0], { t: "tick" }, 100 + LOAD_MS);
    expect(game.live!.phase).toBe("playing");
  });

  it("counts the latest change, timed when it reached the room", () => {
    const { game, players, startsAt } = started();
    const [aru] = players;
    // A at 3.2 s, then C at 7.8 s: C at 7.8 s is the answer.
    game.message(aru, { t: "guess", round: 0, pick: "1" }, startsAt + 3200);
    game.message(
      aru,
      { t: "guess", round: 0, pick: answerOfRound(game) },
      startsAt + 7800
    );
    expect(aru.guess).toEqual({
      round: 0,
      pick: answerOfRound(game),
      ms: 7800,
    });
    game.message(aru, { t: "tick" }, game.live!.endsAt! + GRACE_MS);
    expect(aru.time).toBe(7800);
  });

  it("takes changes as often as CHANGE_GAP_MS allows, no more", () => {
    const { game, players, startsAt } = started();
    const [aru] = players;
    // A page changed to flood the room: one every 100 ms.
    for (let i = 0; i < 40; i++) {
      game.message(
        aru,
        { t: "guess", round: 0, pick: String(i) },
        startsAt + 1000 + i * 100
      );
    }
    // Taken at 1000, 1300, ... 4900: every third.
    expect(aru.guess).toEqual({ round: 0, pick: "39", ms: 4900 });
    expect(CHANGE_GAP_MS).toBeLessThan(SEND_GAP_MS);
    // An honest page's, SEND_GAP_MS apart, are all taken.
    const { game: other, players: two, startsAt: at } = started();
    ["1", "2", "3", "4"].forEach((pick, i) =>
      other.message(
        two[0],
        { t: "guess", round: 0, pick },
        at + 1000 + i * SEND_GAP_MS
      )
    );
    expect(two[0].guess?.ms).toBe(1000 + 3 * SEND_GAP_MS);
  });

  it("keeps an answer's time when the same one comes again", () => {
    const { game, players, startsAt } = started();
    const [aru] = players;
    game.message(aru, { t: "guess", round: 0, pick: "7" }, startsAt + 1000);
    game.message(aru, { t: "guess", round: 0, pick: "7" }, startsAt + 4000);
    expect(aru.guess).toEqual({ round: 0, pick: "7", ms: 1000 });
  });

  it("shows everyone when each latest answer went, live, never what", () => {
    const { game, players, startsAt } = started();
    game.message(
      players[1],
      { t: "guess", round: 0, pick: "7" },
      startsAt + 1200
    );
    expect(game.viewFor(players[0], startsAt + 1300).players[1].sent).toBe(
      1200
    );
    game.message(
      players[1],
      { t: "guess", round: 0, pick: "8" },
      startsAt + 3400
    );
    const view = game.viewFor(players[0], startsAt + 3500);
    expect(view.players.map((p) => p.sent)).toEqual([undefined, 3400]);
    expect(view.players[1].last).toBeUndefined();
    expect(JSON.stringify(view.players)).not.toMatch(/"[78]"/);
    // At the reveal, what they said, with that time.
    game.message(players[0], { t: "tick" }, game.live!.endsAt! + GRACE_MS);
    const reveal = game.viewFor(players[0], game.live!.endsAt! + 10);
    expect(reveal.players[1]).toMatchObject({ last: { pick: "8", ms: 3400 } });
    expect(reveal.players[1].sent).toBeUndefined();
  });

  it("gives a few seconds to change once everyone has answered", () => {
    const { game, players, startsAt } = started();
    game.message(
      players[0],
      { t: "guess", round: 0, pick: "1" },
      startsAt + 1000
    );
    expect(game.live!.settling).toBe(false);
    game.message(
      players[1],
      { t: "guess", round: 0, pick: null },
      startsAt + 2000
    );
    expect(game.live!.settling).toBe(true);
    expect(game.live!.endsAt).toBe(startsAt + 2000 + SETTLE_MS);
    // A change of mind in them still counts.
    game.message(
      players[1],
      { t: "guess", round: 0, pick: "2" },
      startsAt + 4000
    );
    expect(players[1].guess?.pick).toBe("2");
  });

  it("reveals once every page's clock is up, or GRACE_MS after", () => {
    const { game, players, startsAt } = started();
    const endsAt = game.live!.endsAt!;
    game.message(players[0], { t: "tick" }, endsAt - 10);
    expect(players[0].ticked).toBe(-1);
    game.message(players[0], { t: "tick" }, endsAt + 50);
    expect(game.live!.phase).toBe("playing");
    // Mutsuki's answer, sent as her time ran out, still counts.
    game.message(
      players[1],
      { t: "guess", round: 0, pick: answerOfRound(game) },
      endsAt + 100
    );
    game.message(players[1], { t: "tick" }, endsAt + 120);
    expect(game.live!.phase).toBe("reveal");
    expect(players[1].score).toBe(1);
    expect(players[1].time).toBe(endsAt + 100 - startsAt);
    expect(game.save).toBe(true);
  });

  it("doesn't wait for a page that never says its time is up", () => {
    const { game, players } = started();
    const endsAt = game.live!.endsAt!;
    game.message(players[0], { t: "tick" }, endsAt + 50);
    game.message(players[0], { t: "tick" }, endsAt + GRACE_MS);
    expect(game.live!.phase).toBe("reveal");
    // Too late to answer.
    game.message(
      players[1],
      { t: "guess", round: 0, pick: "1" },
      endsAt + GRACE_MS + 10
    );
    expect(players[1].guess).toBeNull();
  });

  it("moves on after the reveal once everyone has the next clip", () => {
    const { game, players } = started();
    const endsAt = game.live!.endsAt!;
    readyAll(game, players, 1, endsAt - 5000);
    game.message(players[0], { t: "tick" }, endsAt + GRACE_MS);
    const revealAt = endsAt + GRACE_MS;
    game.message(players[0], { t: "tick" }, revealAt + REVEAL_MS - 1);
    expect(game.live!.phase).toBe("reveal");
    game.message(players[0], { t: "tick" }, revealAt + REVEAL_MS);
    expect(game.live).toMatchObject({ phase: "playing", round: 1 });
    expect(game.live!.startsAt).toBe(revealAt + REVEAL_MS + LEAD_MS);
  });

  it("moves on without a slow page at the reveal's longest", () => {
    const { game, players } = started();
    const endsAt = game.live!.endsAt!;
    game.message(players[0], { t: "ready", round: 1 }, endsAt - 5000);
    game.message(players[0], { t: "tick" }, endsAt + GRACE_MS);
    const revealAt = endsAt + GRACE_MS;
    game.message(players[0], { t: "tick" }, revealAt + REVEAL_MS);
    expect(game.live!.phase).toBe("reveal");
    game.message(players[0], { t: "tick" }, revealAt + REVEAL_MAX_MS);
    expect(game.live!.phase).toBe("playing");
  });

  it("ends in the standings, the faster ahead on a tie", () => {
    const { game, players } = started({ rounds: 5 });
    let now = 0;
    for (let round = 0; round < 5; round++) {
      const startsAt = game.live!.startsAt!;
      game.message(
        players[0],
        { t: "guess", round, pick: answerOfRound(game) },
        startsAt + 3000
      );
      game.message(
        players[1],
        { t: "guess", round, pick: answerOfRound(game) },
        startsAt + 1000
      );
      readyAll(game, players, round + 1, startsAt + 1500);
      now = game.live!.endsAt! + GRACE_MS;
      game.message(players[0], { t: "tick" }, now);
      expect(game.live!.phase).toBe("reveal");
      game.message(players[0], { t: "tick" }, now + REVEAL_MS);
    }
    expect(game.live!.phase).toBe("over");
    expect(players.map((p) => p.score)).toEqual([5, 5]);
    expect(players[1].time).toBeLessThan(players[0].time);
    expect(game.viewFor(players[0], now).results).toHaveLength(5);
  });

  it("lets a player join halfway, and one who dropped out back by their token", () => {
    const { game, players, startsAt } = started({ maxPlayers: 4 });
    game.message(
      players[1],
      { t: "guess", round: 0, pick: answerOfRound(game) },
      startsAt + 1000
    );
    game.message(players[0], { t: "tick" }, game.live!.endsAt! + GRACE_MS);
    expect(game.live!.phase).toBe("reveal");
    const saved = game.saved()!;
    game.leave(players[1], saved.live.endsAt! + 10);

    const late = game.hello(hello("token-haruka", "Haruka"), 30_000, false);
    expect("player" in late && late.player.score).toBe(0);
    // Someone else typing her name gets a place of their own, not hers.
    const sniper = game.hello(hello("token-x", "Mutsuki"), 30_500, false);
    expect("player" in sniper && sniper.player).toMatchObject({
      name: "Mutsuki 2",
      score: 0,
    });
    // Mutsuki's tab was closed: a new tab, but the browser kept her token.
    const back = game.hello(
      hello("token-new", "Mutsuki", { back: "token-Mutsuki" }),
      31_000,
      false
    );
    expect("player" in back && back.player).toMatchObject({
      name: "Mutsuki",
      score: 1,
    });
    expect(game.hello(hello("token-z", "Kayoko"), 32_000, false)).toEqual({
      error: "full",
    });
  });

  it("carries on from storage after a restart, the round loading again", () => {
    const { game, players, startsAt } = started();
    game.message(
      players[1],
      { t: "guess", round: 0, pick: answerOfRound(game) },
      startsAt + 1000
    );
    game.message(players[0], { t: "tick" }, game.live!.endsAt! + GRACE_MS);
    const saved = JSON.parse(JSON.stringify(game.saved()));

    const restarted = Room.resume("ABCD", saved, 90_000);
    expect(restarted.live).toMatchObject({ phase: "loading", round: 1 });
    const back = restarted.hello(
      hello("token-Mutsuki", "Mutsuki"),
      90_100,
      false
    );
    expect("player" in back && back.player.score).toBe(1);
    expect(restarted.live!.host).toBe(players[0].id);
  });

  it("waits a moment for a reload when everyone leaves, then closes", () => {
    const { game, players } = started();
    game.leave(players[0], 10_000);
    game.leave(players[1], 10_001);
    expect(game.alarmAt).toBe(10_001 + EMPTY_MS);
    const later = new Room("ABCD", game.live, game.game, []);
    expect(later.alarm(10_001 + EMPTY_MS)).toBe("close");
    const kept = new Room("ABCD", game.live, game.game, [players[0]]);
    expect(kept.alarm(50_000)).toBeUndefined();
    expect(kept.alarmAt).toBe(50_000 + TIDY_MS);
  });

  it("goes back to the lobby once everyone has, emptying storage", () => {
    const { game, players } = started();
    endGame(game, players, 6000);
    expect(game.live!.phase).toBe("over");
    // Mutsuki goes first, on her own; Aru is still host on the results.
    game.message(players[1], { t: "again" }, 7000);
    expect(game.live!.phase).toBe("over");
    expect(game.viewFor(players[0], 7000).players[1].returned).toBe(true);
    expect(game.live!.host).toBe(players[0].id);
    game.message(players[0], { t: "again" }, 7000);
    expect(game.live!.phase).toBe("lobby");
    expect(game.wipe).toBe(true);
    expect(game.game).toBeNull();
  });

  it("goes back once the last one still on the results leaves", () => {
    const { game, players } = started({}, ["Mutsuki", "Kayoko"]);
    endGame(game, players, 6000);
    game.message(players[0], { t: "again" }, 6500);
    game.message(players[1], { t: "again" }, 6600);
    game.leave(players[2], 7000);
    expect(game.live!.phase).toBe("lobby");
  });

  it("goes back to the lobby by itself after the standings", () => {
    const { game, players } = started();
    endGame(game, players, 6000);
    expect(game.viewFor(players[1], 6000).endsIn).toBe(OVER_MS);
    game.message(players[1], { t: "tick" }, 6000 + OVER_MS - 1);
    expect(game.live!.phase).toBe("over");
    game.message(players[1], { t: "tick" }, 6000 + OVER_MS);
    expect(game.live!.phase).toBe("lobby");
    expect(game.wipe).toBe(true);
    // The lobby's idle clock starts again from there.
    expect(game.viewFor(players[1], 6000 + OVER_MS).endsIn).toBe(IDLE_MS);
  });

  it("counts in before the first round only", () => {
    const { game, players } = started();
    expect(game.live!.startsAt).toBe(200 + FIRST_LEAD_MS);
    const endsAt = game.live!.endsAt!;
    readyAll(game, players, 1, endsAt - 5000);
    game.message(players[0], { t: "tick" }, endsAt + GRACE_MS);
    const next = endsAt + GRACE_MS + REVEAL_MS;
    game.message(players[0], { t: "tick" }, next);
    expect(game.live!.startsAt! - next).toBe(LEAD_MS);
    expect(LEAD_MS).toBeLessThan(FIRST_LEAD_MS);
  });
});

describe("ending a game early", () => {
  it("takes the host's ask and more than half of the players here", () => {
    const { game, players } = started({}, ["Mutsuki", "Kayoko", "Haruka"]);
    const [aru, mutsuki, kayoko, haruka] = players;
    // Only the host can ask.
    game.message(mutsuki, { t: "end" }, 6000);
    expect(game.live!.vote).toBeNull();
    game.message(aru, { t: "end" }, 6000);
    expect(game.viewFor(mutsuki, 6000).vote).toEqual({
      yes: 1,
      no: 0,
      needed: 3,
      endsIn: VOTE_MS,
      mine: null,
    });
    game.message(mutsuki, { t: "vote", yes: true }, 6500);
    // A second vote from her changes nothing.
    game.message(mutsuki, { t: "vote", yes: true }, 6600);
    expect(game.live!.phase).toBe("playing");
    expect(game.viewFor(mutsuki, 6700).vote?.mine).toBe(true);
    game.message(kayoko, { t: "vote", yes: false }, 6800);
    expect(game.live!.phase).toBe("playing");
    game.message(haruka, { t: "vote", yes: true }, 7000);
    expect(game.live!.phase).toBe("over");
    expect(game.viewFor(aru, 7000).vote).toBeUndefined();
  });

  it("drops the ask once it can't pass, or its time is up", () => {
    const { game, players } = started({}, ["Mutsuki", "Kayoko"]);
    const [aru, mutsuki, kayoko] = players;
    game.message(aru, { t: "end" }, 6000);
    game.message(mutsuki, { t: "vote", yes: false }, 6100);
    game.message(kayoko, { t: "vote", yes: false }, 6200);
    expect(game.live!.vote).toBeNull();
    expect(game.live!.phase).toBe("playing");

    game.message(aru, { t: "end" }, 7000);
    game.message(mutsuki, { t: "tick" }, 7000 + VOTE_MS);
    expect(game.live!.vote).toBeNull();
    // Too late to agree.
    game.message(mutsuki, { t: "vote", yes: true }, 7000 + VOTE_MS + 1);
    game.message(kayoko, { t: "vote", yes: true }, 7000 + VOTE_MS + 2);
    expect(game.live!.phase).not.toBe("over");
  });

  it("needs both of two, and only the host once alone", () => {
    const { game, players } = started();
    game.message(players[0], { t: "end" }, 6000);
    expect(game.live!.phase).toBe("playing");
    game.leave(players[1], 6500);
    expect(game.live!.phase).toBe("over");
  });

  it("goes with the host who asked", () => {
    const { game, players } = started({}, ["Mutsuki", "Kayoko"]);
    const [aru, mutsuki, kayoko] = players;
    game.message(aru, { t: "end" }, 6000);
    game.leave(aru, 6100);
    expect(game.live!.vote).toBeNull();
    game.message(mutsuki, { t: "vote", yes: true }, 6200);
    game.message(kayoko, { t: "vote", yes: true }, 6300);
    expect(game.live!.phase).not.toBe("over");
    // Mutsuki is host now, and can ask herself.
    expect(game.live!.host).toBe(mutsuki.id);
    endGame(game, [mutsuki, kayoko], 6400);
    expect(game.live!.phase).toBe("over");
  });

  it("passes when someone leaves, their vote leaving with them", () => {
    const { game, players } = started({}, ["Mutsuki", "Kayoko", "Haruka"]);
    const [aru, mutsuki, kayoko, haruka] = players;
    game.message(aru, { t: "end" }, 6000);
    game.message(mutsuki, { t: "vote", yes: true }, 6100);
    game.message(kayoko, { t: "vote", yes: false }, 6200);
    expect(game.viewFor(aru, 6200).vote).toMatchObject({ yes: 2, needed: 3 });
    // Kayoko goes: three here, two needed, and two said yes.
    game.leave(kayoko, 6300);
    expect(game.live!.phase).toBe("over");
    expect(haruka.returned).toBe(false);
  });

  it("is gone after a restart, and only asked in a game", () => {
    const { game, players } = started();
    game.message(players[0], { t: "end" }, 6000);
    const restarted = Room.resume(
      "ABCD",
      JSON.parse(JSON.stringify(game.saved())),
      9000
    );
    expect(restarted.live!.vote).toBeNull();
    const lobby = room();
    lobby.game.message(lobby.players[0], { t: "end" }, 10);
    lobby.game.message(lobby.players[1], { t: "vote", yes: true }, 11);
    expect(lobby.game.live).toMatchObject({ phase: "lobby", vote: null });
  });
});

describe("the flood limit", () => {
  it("counts each connection on its own, closing only the one flooding", () => {
    let flooding: Flood | undefined;
    let honest: Flood | undefined;
    let closed = -1;
    for (let i = 0; i < 100; i++) {
      const now = i * 50;
      const counted = countMessage(flooding, now);
      if (counted.over && closed < 0) closed = i;
      flooding = counted;
      // Another page in the room sends one every 400 ms.
      if (i % 8 === 0) {
        const other = countMessage(honest, now);
        expect(other.over).toBe(false);
        honest = other;
      }
    }
    expect(closed).toBe(FLOOD_LIMIT);
  });

  it("starts again FLOOD_MS after a count began", () => {
    let flood: Flood | undefined;
    for (let i = 0; i < FLOOD_LIMIT; i++) flood = countMessage(flood, i);
    expect(countMessage(flood, 100).over).toBe(true);
    expect(countMessage(flood, FLOOD_MS)).toEqual({
      since: FLOOD_MS,
      count: 1,
      over: false,
    });
  });

  it("leaves room for a page changing its answer as fast as it may", () => {
    // Answers SEND_GAP_MS apart, plus a round's ready and ticks, twice in
    // 10 s of short rounds: well inside the limit.
    const perTen = FLOOD_MS / SEND_GAP_MS + 2 * 4;
    expect(perTen).toBeLessThan(FLOOD_LIMIT);
  });
});

describe("the room decides, never the page", () => {
  it("takes no answer before the song starts, for another round, or after the time", () => {
    const { game, players, startsAt } = started();
    const [aru, mutsuki] = players;
    // In the count-in: nothing has played yet.
    game.message(aru, { t: "guess", round: 0, pick: "1" }, startsAt - 1);
    expect(aru.guess).toBeNull();
    // Last round's, or the next one's.
    game.message(aru, { t: "guess", round: 1, pick: "1" }, startsAt + 500);
    game.message(aru, { t: "guess", round: -1, pick: "1" }, startsAt + 600);
    expect(aru.guess).toBeNull();
    const endsAt = game.live!.endsAt!;
    // Past the time and its grace.
    game.message(
      mutsuki,
      { t: "guess", round: 0, pick: "1" },
      endsAt + GRACE_MS + 1
    );
    expect(mutsuki.guess).toBeNull();
  });

  it("ignores answers once the round is revealed", () => {
    const { game, players, startsAt } = started();
    const [aru, mutsuki] = players;
    game.message(aru, { t: "guess", round: 0, pick: "1" }, startsAt + 1000);
    const endsAt = game.live!.endsAt!;
    game.message(aru, { t: "tick" }, endsAt + 10);
    game.message(mutsuki, { t: "tick" }, endsAt + 20);
    expect(game.live!.phase).toBe("reveal");
    game.message(
      aru,
      { t: "guess", round: 0, pick: answerOfRound(game) },
      endsAt + 30
    );
    expect(aru.guess?.pick).toBe("1");
    expect(aru.score).toBe(0);
  });

  it("doesn't take a page's word that the time is up before it is", () => {
    const { game, players } = started();
    const endsAt = game.live!.endsAt!;
    for (const player of players) {
      game.message(player, { t: "tick" }, endsAt - 1);
    }
    expect(game.live!.phase).toBe("playing");
    expect(players.map((p) => p.ticked)).toEqual([-1, -1]);
    // Nor for the reveal's, the standings' or the lobby's times.
    for (const player of players) {
      game.message(player, { t: "tick" }, endsAt + 5);
    }
    expect(game.live!.phase).toBe("reveal");
    game.message(players[0], { t: "tick" }, endsAt + 10);
    game.message(players[0], { t: "tick" }, endsAt + 20);
    expect(game.live!.phase).toBe("reveal");
  });

  it("gives the rest a few seconds when the one they waited on leaves", () => {
    const { game, players, startsAt } = started({}, ["Mutsuki", "Kayoko"]);
    const [aru, mutsuki, kayoko] = players;
    game.message(aru, { t: "guess", round: 0, pick: "1" }, startsAt + 1000);
    game.message(mutsuki, { t: "guess", round: 0, pick: "2" }, startsAt + 2000);
    expect(game.live!.settling).toBe(false);
    game.leave(kayoko, startsAt + 3000);
    expect(game.live!.settling).toBe(true);
    expect(game.live!.endsAt).toBe(startsAt + 3000 + SETTLE_MS);
    // Someone joining now plays the round, and the time doesn't grow back.
    const late = game.hello(
      hello("token-haruka", "Haruka"),
      startsAt + 3500,
      false
    );
    expect("player" in late).toBe(true);
    expect(game.live!.endsAt).toBe(startsAt + 3000 + SETTLE_MS);
  });

  it("keeps an answer through a reconnect, and the same one sent again", () => {
    const { game, players, startsAt } = started();
    const [aru] = players;
    game.message(aru, { t: "guess", round: 0, pick: "5" }, startsAt + 1000);
    // The same tab, back on a new connection.
    const back = game.hello(hello("token-aru", "Aru"), startsAt + 2000, false);
    expect("player" in back && back.player.guess).toMatchObject({
      pick: "5",
      ms: 1000,
    });
    // Its page sends the answer it had again: the time stays.
    game.message(aru, { t: "guess", round: 0, pick: "5" }, startsAt + 2100);
    expect(aru.guess?.ms).toBe(1000);
  });

  it("keeps the password through a restart", () => {
    const game = new Room("ABCD", null, null, [], seeded());
    const made = game.hello(
      hello("token-aru", "Aru", {
        create: DEFAULT_ROOM_SETTINGS,
        access: { access: "password", password: "Hina" },
      }),
      0,
      true
    );
    const mutsuki = game.hello(
      hello("token-m", "Mutsuki", { password: "hina" }),
      1,
      false
    );
    if (!("player" in made) || !("player" in mutsuki)) throw new Error();
    game.message(made.player, { t: "start" }, 100);
    const restarted = Room.resume(
      "ABCD",
      JSON.parse(JSON.stringify(game.saved())),
      9000
    );
    expect(restarted.hello(hello("token-x", "Kayoko"), 9100, false)).toEqual({
      error: "password",
    });
    // Those in the game come back by their token, without it.
    expect(
      "player" in restarted.hello(hello("token-m", "Mutsuki"), 9200, false)
    ).toBe(true);
  });
});

describe("the host's kick, and who can join", () => {
  it("takes a player out, and their browser can't come back", () => {
    const { game, players } = room({}, ["Mutsuki", "Kayoko"]);
    const [aru, mutsuki, kayoko] = players;
    // Only the host, and never themselves.
    game.message(kayoko, { t: "kick", id: mutsuki.id }, 5);
    game.message(aru, { t: "kick", id: aru.id }, 5);
    expect(game.players).toHaveLength(3);

    game.message(aru, { t: "kick", id: mutsuki.id }, 6);
    expect(game.players.map((p) => p.name)).toEqual(["Aru", "Kayoko"]);
    expect(game.kicks).toEqual(["token-Mutsuki"]);
    expect(game.hello(hello("token-Mutsuki", "Mutsuki"), 7, false)).toEqual({
      error: "kicked",
    });
    // Another tab in her browser sends the token it kept.
    expect(
      game.hello(
        hello("token-other-tab", "Mutsuki", { back: "token-Mutsuki" }),
        8,
        false
      )
    ).toEqual({ error: "kicked" });
    expect(
      "player" in game.hello(hello("token-haruka", "Haruka"), 9, false)
    ).toBe(true);
    expect(game.save).toBe(false);
  });

  it("takes a player out of a game, with their score, even after a restart", () => {
    const { game, players, startsAt } = started();
    const [aru, mutsuki] = players;
    game.message(
      mutsuki,
      { t: "guess", round: 0, pick: answerOfRound(game) },
      startsAt + 1000
    );
    game.message(aru, { t: "tick" }, game.live!.endsAt! + GRACE_MS);
    expect(game.game!.results[0].right).toEqual([mutsuki.id]);
    game.save = false;

    game.message(aru, { t: "kick", id: mutsuki.id }, 40_000);
    expect(game.game!.roster.map((p) => p.name)).toEqual(["Aru"]);
    expect(game.game!.results[0].right).toEqual([]);
    expect(game.save).toBe(true);
    const restarted = Room.resume(
      "ABCD",
      JSON.parse(JSON.stringify(game.saved())),
      90_000
    );
    expect(
      restarted.hello(hello("token-Mutsuki", "Mutsuki"), 90_100, false)
    ).toEqual({ error: "kicked" });
  });

  it("lets nobody new in once locked, but everyone in it back", () => {
    const { game, players } = room({}, ["Mutsuki"]);
    const [aru, mutsuki] = players;
    const lock = (on: boolean): ClientMessage => ({
      t: "settings",
      settings: game.live!.settings,
      access: { access: on ? "locked" : "open" },
    });
    game.message(mutsuki, lock(true), 5);
    expect(game.viewFor(aru, 5).access).toBe("open");
    game.message(aru, lock(true), 5);
    expect(game.viewFor(mutsuki, 5).access).toBe("locked");
    expect(game.hello(hello("token-haruka", "Haruka"), 6, false)).toEqual({
      error: "locked",
    });

    // Mutsuki's reload, then a new tab of hers, still get in.
    game.leave(mutsuki, 7);
    expect(
      "player" in game.hello(hello("token-Mutsuki", "Mutsuki"), 8, false)
    ).toBe(true);
    game.leave(game.players[1], 9);
    expect(
      "player" in
        game.hello(
          hello("token-new-tab", "Mutsuki", { back: "token-Mutsuki" }),
          10,
          false
        )
    ).toBe(true);

    game.message(aru, lock(false), 11);
    expect(
      "player" in game.hello(hello("token-haruka", "Haruka"), 12, false)
    ).toBe(true);
  });

  it("lets in only those with the password, never sending it on", () => {
    const game = new Room("ABCD", null, null, [], seeded());
    const made = game.hello(
      hello("token-aru", "Aru", {
        create: DEFAULT_ROOM_SETTINGS,
        access: { access: "password", password: "Shiroko 2" },
      }),
      0,
      true
    );
    if (!("player" in made)) throw new Error(made.error);
    expect(game.viewFor(made.player, 0).access).toBe("password");
    expect(JSON.stringify(game.viewFor(made.player, 0))).not.toContain(
      "Shiroko"
    );
    expect(game.hello(hello("token-a", "Haruka"), 1, false)).toEqual({
      error: "password",
    });
    expect(
      game.hello(hello("token-b", "Haruka", { password: "wrong" }), 2, false)
    ).toEqual({ error: "password" });
    // Read out loud: case and spaces don't matter.
    const haruka = game.hello(
      hello("token-c", "Haruka", { password: "shiroko2" }),
      3,
      false
    );
    expect("player" in haruka).toBe(true);
    // A lobby keeps nobody who left: her reload is a new arrival, and her
    // page sends the password again.
    if ("player" in haruka) game.leave(haruka.player, 4);
    expect(
      "player" in
        game.hello(
          hello("token-c", "Haruka", { password: "Shiroko 2" }),
          5,
          false
        )
    ).toBe(true);

    // A new password; saving other settings keeps it.
    const settings = DEFAULT_ROOM_SETTINGS;
    game.message(
      made.player,
      {
        t: "settings",
        settings,
        access: { access: "password", password: "x" },
      },
      6
    );
    game.message(
      made.player,
      {
        t: "settings",
        settings: { ...settings, rounds: 5 },
        access: { access: "password" },
      },
      7
    );
    expect(
      game.hello(
        hello("token-d", "Kayoko", { password: "Shiroko 2" }),
        8,
        false
      )
    ).toEqual({ error: "password" });
    expect(
      "player" in
        game.hello(hello("token-e", "Kayoko", { password: "X" }), 9, false)
    ).toBe(true);
    expect(samePassword("", "")).toBe(false);
  });

  it("makes a room open or with a password, never locked", () => {
    const made = (access: "open" | "password" | "locked") => {
      const game = new Room("ABCD", null, null, [], seeded());
      game.hello(
        hello("token-aru", "Aru", {
          create: DEFAULT_ROOM_SETTINGS,
          access: {
            access,
            ...(access === "password" ? { password: "p" } : {}),
          },
        }),
        0,
        true
      );
      return game.live!.access;
    };
    expect([made("open"), made("password"), made("locked")]).toEqual([
      "open",
      "password",
      "open",
    ]);
    // A password with nothing typed isn't one.
    expect(
      parseMessage(
        JSON.stringify({
          t: "settings",
          settings: DEFAULT_ROOM_SETTINGS,
          access: { access: "password", password: "\u200b " },
        })
      )
    ).toEqual({
      t: "settings",
      settings: DEFAULT_ROOM_SETTINGS,
      access: { access: "password" },
    });
  });
});

describe("names", () => {
  it("drops invisible characters and accents stacked high", () => {
    expect(cleanName("A\u200bru\u202e")).toBe("Aru");
    // A letter with no accented form of its own, so every mark stays one.
    expect(cleanName("Zq\u0301\u0302\u0303\u0304")).toBe("Zq\u0301\u0302");
    expect(cleanName("\u3164\u200b")).toBe("Sensei");
  });

  it("numbers a name that reads as one already in the room", () => {
    const { game } = room({}, []);
    const names = ["\u0410ru", "ARU", "\uff21\uff52\uff55", "Aru 2"].map(
      (name, i) => {
        const joined = game.hello(hello(`token-${i}xxxxx`, name), i + 5, false);
        return "player" in joined ? joined.player.name : joined.error;
      }
    );
    expect(names).toEqual([
      "\u0410ru 2",
      "ARU 3",
      "\uff21\uff52\uff55 4",
      "Aru 2 2",
    ]);
    expect(nameKey("\u0410ru")).toBe(nameKey("aru"));
  });
});

describe("pages that send anything at all", () => {
  it("never break the room or show an answer early", () => {
    const random = seeded(7);
    const pick = <T>(list: T[]): T => list[Math.floor(random() * list.length)];
    const values: unknown[] = [
      undefined,
      null,
      true,
      false,
      0,
      -1,
      1,
      2.5,
      1e9,
      "",
      "x",
      "1",
      "<script>alert(1)</script>",
      "a".repeat(60),
      [],
      {},
      { t: "hello" },
    ];
    const types = [
      "hello",
      "settings",
      "start",
      "ready",
      "guess",
      "tick",
      "end",
      "again",
      "stay",
      "kick",
      "vote",
      "nope",
      undefined,
    ];
    const keys = [
      "v",
      "token",
      "name",
      "icon",
      "create",
      "rejoin",
      "back",
      "settings",
      "round",
      "pick",
      "id",
      "yes",
      "password",
      "access",
    ];
    const { game } = started({ rounds: 5, answers: "choice" }, [
      "Mutsuki",
      "Kayoko",
    ]);
    let now = game.live!.startsAt!;

    for (let i = 0; i < 4000; i++) {
      now += Math.floor(random() * 900);
      const raw: Record<string, unknown> = { t: pick(types) };
      for (const key of keys) if (random() < 0.3) raw[key] = pick(values);
      // Enough well-made ones to move the game along.
      const live = game.live!;
      if (raw.t === "guess" && random() < 0.7) {
        raw.round = live.round;
        raw.pick = pick([
          ...(game.game?.deal[live.round]?.choices ?? []),
          "1",
          null,
        ]);
      }
      if (raw.t === "ready" && random() < 0.7) raw.round = live.round + 1;
      if (raw.t === "kick" && random() < 0.5) raw.id = pick(game.everyone).id;
      if (raw.t === "hello" && random() < 0.5) {
        Object.assign(raw, {
          v: PROTOCOL,
          token: `token-${Math.floor(random() * 12)}-xxxx`,
          name: pick([
            "Aru",
            "\u0410ru",
            "A\u200bru",
            "<b>x</b>",
            "x".repeat(40),
          ]),
        });
      }
      const message = parseMessage(
        random() < 0.05 ? "{not json" : JSON.stringify(raw)
      );
      if (random() < 0.01 && game.players.length > 1) {
        game.leave(pick(game.players), now);
      }
      if (!message) continue;
      if (message.t === "hello") {
        game.hello(message, now, random() < 0.5);
      } else if (game.players.length > 0) {
        game.message(pick(game.players), message, now);
      }

      expect(new Set(game.players.map((p) => p.token)).size).toBe(
        game.players.length
      );
      expect(game.everyone.length).toBeLessThanOrEqual(MAX_PLAYERS);
      for (const player of game.players) {
        const view = game.viewFor(player, now);
        expect(() => JSON.stringify(view)).not.toThrow();
        if (view.phase !== "reveal") {
          expect(view.players.every((p) => p.last === undefined)).toBe(true);
        }
        if (view.phase !== "lobby") {
          expect(
            view.players.every((p) => p.score <= view.results.length)
          ).toBe(true);
        }
        expect(view.players.every((p) => p.name.length > 0)).toBe(true);
      }
    }
    // It got somewhere: through rounds, or back to a lobby.
    expect(game.live!.phase !== "playing" || game.live!.round > 0).toBe(true);
  });
});
