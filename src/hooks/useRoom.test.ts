import React, { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createHarness } from "../test/harness";

import { DEFAULT_ROOM_SETTINGS, RoomView, ServerMessage } from "../types/room";
import { hasRoomToken, roomName } from "../helpers/roomClient";
import { useRoom } from "./useRoom";

/** Stands in for the browser's WebSocket; the test plays the room. */
class FakeSocket {
  static OPEN = 1;
  static all: FakeSocket[] = [];
  readyState = 0;
  sent: string[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(public url: string) {
    FakeSocket.all.push(this);
  }
  send(text: string) {
    this.sent.push(text);
  }
  close() {
    this.readyState = 3;
  }
  open() {
    this.readyState = 1;
    this.onopen?.();
  }
  receive(message: ServerMessage) {
    this.onmessage?.({ data: JSON.stringify(message) });
  }
  drop() {
    this.readyState = 3;
    this.onclose?.();
  }
  hello() {
    return JSON.parse(this.sent[0]);
  }
}

function viewOf(code: string): RoomView {
  return {
    code,
    you: "p1",
    host: "p1",
    settings: DEFAULT_ROOM_SETTINGS,
    players: [],
    phase: "lobby",
    round: -1,
    total: 10,
    startsIn: null,
    endsIn: null,
    maxIn: null,
    settling: false,
    access: "open",
    results: [],
  };
}

let harness: ReturnType<typeof createHarness>;
let room: ReturnType<typeof useRoom>;

function Probe() {
  room = useRoom();
  return null;
}

const last = () => FakeSocket.all[FakeSocket.all.length - 1];
const codeOf = (socket: FakeSocket) =>
  socket.url.split("/").pop()!.split("?")[0];

beforeEach(() => {
  vi.useFakeTimers();
  FakeSocket.all = [];
  vi.stubGlobal("WebSocket", FakeSocket);
  sessionStorage.clear();
  localStorage.clear();
  harness = createHarness();
  harness.render(React.createElement(Probe));
});

afterEach(() => {
  harness.destroy();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  window.history.replaceState(null, "", "/");
});

describe("useRoom", () => {
  it("makes a room, and puts its code in the address", () => {
    act(() => room.create("Aru", null, DEFAULT_ROOM_SETTINGS));
    const socket = last();
    act(() => socket.open());
    expect(socket.hello()).toMatchObject({
      t: "hello",
      name: "Aru",
      create: DEFAULT_ROOM_SETTINGS,
    });

    const code = codeOf(socket);
    act(() => socket.receive({ t: "room", view: viewOf(code) }));
    expect(room.status).toBe("open");
    expect(room.view?.code).toBe(code);
    expect(window.location.search).toBe(`?room=${code}`);
    expect(hasRoomToken(code)).toBe(true);
    expect(roomName(code)).toBe("Aru");
  });

  it("goes back in with the token a closed tab of this browser left", () => {
    act(() => room.join("ABCD", "Mutsuki", null));
    act(() => last().open());
    expect(last().hello()).not.toHaveProperty("back");
    const first = last().hello().token;
    act(() => last().receive({ t: "room", view: viewOf("ABCD") }));

    // The tab closes: its own token goes, the browser's copy stays.
    act(() => room.leave());
    sessionStorage.clear();
    act(() => room.join("ABCD", "Mutsuki", null));
    act(() => last().open());
    expect(last().hello().token).not.toBe(first);
    expect(last().hello().back).toBe(first);
  });

  it("tries another code when one is taken", () => {
    act(() => room.create("Aru", null, DEFAULT_ROOM_SETTINGS));
    const first = last();
    act(() => first.open());
    act(() => first.receive({ t: "error", code: "taken" }));
    act(() => vi.runOnlyPendingTimers());
    expect(FakeSocket.all).toHaveLength(2);
    act(() => last().open());
    expect(last().hello().create).toEqual(DEFAULT_ROOM_SETTINGS);
  });

  it("comes back as the same player after a drop, without making it again", () => {
    act(() => room.create("Aru", null, DEFAULT_ROOM_SETTINGS));
    const socket = last();
    act(() => socket.open());
    act(() => socket.receive({ t: "room", view: viewOf(codeOf(socket)) }));
    const token = socket.hello().token;

    act(() => socket.drop());
    expect(room.status).toBe("connecting");
    act(() => vi.advanceTimersByTime(1000));
    const again = last();
    expect(again).not.toBe(socket);
    act(() => again.open());
    expect(again.hello().token).toBe(token);
    expect(again.hello().create).toBeUndefined();
  });

  it("counts only a connection that may make a room as making one", () => {
    act(() => room.create("Aru", null, DEFAULT_ROOM_SETTINGS));
    expect(last().url).toMatch(/\?make=1$/);
    act(() => room.join("ABCD", "Mutsuki", 12));
    expect(last().url).not.toContain("make");
    act(() => last().open());
    expect(last().hello()).toMatchObject({ icon: 12 });
  });

  it("makes the room again when coming back finds it closed", () => {
    const settings = { ...DEFAULT_ROOM_SETTINGS, rounds: 20 };
    act(() => room.rejoin("ABCD", "Aru", null, settings));
    const first = last();
    expect(first.url).not.toContain("make");
    act(() => first.open());
    expect(first.hello().create).toBeUndefined();
    act(() => first.receive({ t: "error", code: "missing" }));
    act(() => vi.runOnlyPendingTimers());
    const again = last();
    expect(again).not.toBe(first);
    expect(again.url).toMatch(/\?make=1$/);
    act(() => again.open());
    expect(again.hello()).toMatchObject({ create: settings, rejoin: true });
  });

  it("says so when the rooms can't be reached", () => {
    act(() => room.join("ABCD", "Mutsuki", null));
    act(() => last().drop());
    act(() => vi.advanceTimersByTime(1000));
    act(() => last().drop());
    act(() => vi.advanceTimersByTime(2000));
    act(() => last().drop());
    expect(room.status).toBe("failed");
  });

  it("stops at a refusal and shows why", () => {
    act(() => room.join("ABCD", "Mutsuki", null));
    act(() => last().open());
    act(() => last().receive({ t: "error", code: "full" }));
    act(() => last().drop());
    expect(room.status).toBe("idle");
    expect(room.error).toBe("full");
    act(() => vi.runOnlyPendingTimers());
    expect(FakeSocket.all).toHaveLength(1);
  });
});
