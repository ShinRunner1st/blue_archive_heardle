import React from "react";

import {
  backToken,
  forgetRoomToken,
  keepBackToken,
  newRoomCode,
  rememberRoomName,
  rememberRoomPassword,
  roomPassword,
  roomToken,
  roomUrl,
  setRoomInAddress,
} from "../helpers/roomClient";
import {
  AccessChange,
  ClientMessage,
  PROTOCOL,
  RoomError,
  RoomSettings,
  RoomView,
  ServerMessage,
} from "../types/room";

/**
 * - idle: in no room;
 * - connecting: on the way in, or back in after a drop;
 * - open: in the room, with its view;
 * - failed: the rooms couldn't be reached, even after a few tries.
 */
export type RoomStatus = "idle" | "connecting" | "open" | "failed";

export interface RoomConnection {
  status: RoomStatus;
  view: RoomView | null;
  /** When the view came, for the phase's clock (endsIn counts from it). */
  receivedAt: number;
  /** Why the room turned this player away, or closed. */
  error: RoomError | null;
  /**
   * Counts the connections that got in: a new one after a drop may have
   * lost what the last sent just before it, so the page says it again.
   */
  session: number;
  create: (
    name: string,
    icon: number | null,
    settings: RoomSettings,
    access?: AccessChange
  ) => void;
  /** Joins by code, with the room's password if it has one. */
  join: (
    code: string,
    name: string,
    icon: number | null,
    password?: string
  ) => void;
  /**
   * Back into a room this tab was in, after a reload: joined if it's
   * there, made again with these settings if it closed meanwhile.
   */
  rejoin: (
    code: string,
    name: string,
    icon: number | null,
    settings: RoomSettings
  ) => void;
  leave: () => void;
  send: (message: ClientMessage) => void;
}

/** Tries after a drop, each after twice as long: 1, 2, 4, 8 and 16 s. */
const RETRIES = 5;
/** Tries to get in the first time, before saying the rooms can't be reached. */
const FIRST_TRIES = 2;
/** A made-up code in use: another is tried, this many times. */
const CODE_TRIES = 5;
/**
 * The keep-alive, which the room answers without waking up (see
 * rooms-worker/): a connection that says nothing for long can be dropped on
 * the way, by a phone's network or a router.
 */
const PING_MS = 30_000;

interface Intent {
  code: string;
  name: string;
  icon: number | null;
  token: string;
  /** Making the room: sent until the room has answered once. */
  create?: RoomSettings;
  /** Who can join the room being made. */
  access?: AccessChange;
  /**
   * The room's password, as typed to join or set as host: sent with each
   * hello, and kept so a room made again after it closed keeps it too.
   */
  password?: string;
  /**
   * Coming back: the room's settings as last seen, to make it again with
   * if it closed meanwhile, as a new version of the rooms closes lobbies.
   */
  rejoin?: RoomSettings;
  /**
   * The room wasn't there to come back to: this try makes it again. Only
   * then, since a connection that may make a room counts against the few a
   * minute the Worker allows.
   */
  recreate?: boolean;
  codeTries: number;
  /** Got in at least once: a drop after that is worth a few more tries. */
  wasIn: boolean;
}

/**
 * The connection to one multiplayer room, over a WebSocket to the rooms
 * Worker. The room sends its whole view on every change, so this keeps the
 * latest. A drop is retried as the same player (the tab's token), and a
 * page that never gets through says so, for the rooms may be resting: the
 * free plan's requests run out for the day (see the README's Multiplayer).
 */
export function useRoom(): RoomConnection {
  const [status, setStatus] = React.useState<RoomStatus>("idle");
  const [view, setView] = React.useState<RoomView | null>(null);
  const [receivedAt, setReceivedAt] = React.useState(0);
  const [error, setError] = React.useState<RoomError | null>(null);
  const [session, setSession] = React.useState(0);

  const socket = React.useRef<WebSocket | null>(null);
  const intent = React.useRef<Intent | null>(null);
  const retries = React.useRef(0);
  const retryTimer = React.useRef<number>(undefined);

  const close = React.useCallback(() => {
    window.clearTimeout(retryTimer.current);
    const ws = socket.current;
    socket.current = null;
    if (ws) {
      ws.onopen = ws.onmessage = ws.onclose = ws.onerror = null;
      ws.close(1000);
    }
  }, []);

  const connect = React.useCallback(() => {
    const target = intent.current;
    if (!target) return;
    close();
    setStatus("connecting");

    const ws = new WebSocket(
      roomUrl(target.code, Boolean(target.create || target.recreate))
    );
    socket.current = ws;
    let ping: number | undefined;
    // Set once the room turns this page away, so it isn't tried again.
    let refused = false;
    let first = true;

    ws.onopen = () => {
      // A tab of this browser that was in the room and closed: if its
      // player is away, this one takes their place.
      const back = backToken(target.code);
      ws.send(
        JSON.stringify({
          t: "hello",
          v: PROTOCOL,
          token: target.token,
          ...(back && back !== target.token ? { back } : {}),
          name: target.name,
          icon: target.icon,
          ...(target.password ? { password: target.password } : {}),
          ...(target.create
            ? {
                create: target.create,
                ...(target.access ? { access: target.access } : {}),
              }
            : target.recreate && target.rejoin
            ? {
                create: target.rejoin,
                rejoin: true,
                // A lock can't be made again (who was in is gone with the
                // room), so it comes back open; a password comes back.
                ...(target.password
                  ? {
                      access: { access: "password", password: target.password },
                    }
                  : {}),
              }
            : {}),
        } satisfies ClientMessage)
      );
      ping = window.setInterval(() => ws.send("ping"), PING_MS);
    };

    ws.onmessage = (event) => {
      if (event.data === "pong") return;
      let message: ServerMessage;
      try {
        message = JSON.parse(String(event.data)) as ServerMessage;
      } catch {
        return;
      }
      if (message.t === "room") {
        retries.current = 0;
        target.wasIn = true;
        if (first) {
          first = false;
          setSession((n) => n + 1);
          keepBackToken(target.code, target.token);
        }
        // Made: from now on this page comes back to it, not makes it.
        delete target.create;
        delete target.access;
        delete target.recreate;
        if (message.view.access !== "password") delete target.password;
        target.rejoin = message.view.settings;
        rememberRoomName(target.code, target.name);
        rememberRoomPassword(target.code, target.password);
        setRoomInAddress(message.view.code);
        setView(message.view);
        setReceivedAt(Date.now());
        setStatus("open");
        setError(null);
        return;
      }

      refused = true;
      if (message.code === "missing" && target.rejoin && !target.recreate) {
        target.recreate = true;
        window.setTimeout(connect, 0);
        return;
      }
      if (message.code === "taken" && target.create) {
        if (target.codeTries < CODE_TRIES) {
          forgetRoomToken(target.code);
          target.codeTries += 1;
          target.code = newRoomCode();
          target.token = roomToken(target.code);
          window.setTimeout(connect, 0);
          return;
        }
      }
      forgetRoomToken(target.code);
      intent.current = null;
      setRoomInAddress(null);
      setError(message.code);
      setView(null);
      setStatus("idle");
    };

    ws.onclose = () => {
      window.clearInterval(ping);
      if (socket.current !== ws) return;
      socket.current = null;
      if (refused || !intent.current) return;
      if (retries.current >= (target.wasIn ? RETRIES : FIRST_TRIES)) {
        setStatus("failed");
        return;
      }
      setStatus("connecting");
      const delay = 1000 * 2 ** retries.current;
      retries.current += 1;
      retryTimer.current = window.setTimeout(connect, delay);
    };
  }, [close]);

  const start = React.useCallback(
    (next: Omit<Intent, "token" | "codeTries" | "wasIn">) => {
      intent.current = {
        ...next,
        token: roomToken(next.code),
        codeTries: 0,
        wasIn: false,
      };
      retries.current = 0;
      setError(null);
      setView(null);
      connect();
    },
    [connect]
  );

  const create = React.useCallback(
    (
      name: string,
      icon: number | null,
      settings: RoomSettings,
      access?: AccessChange
    ) =>
      start({
        code: newRoomCode(),
        name,
        icon,
        create: settings,
        access,
        password: access?.password,
      }),
    [start]
  );

  const join = React.useCallback(
    (code: string, name: string, icon: number | null, password?: string) =>
      start({ code, name, icon, password }),
    [start]
  );

  const rejoin = React.useCallback(
    (code: string, name: string, icon: number | null, settings: RoomSettings) =>
      start({
        code,
        name,
        icon,
        rejoin: settings,
        password: roomPassword(code),
      }),
    [start]
  );

  const leave = React.useCallback(() => {
    const target = intent.current;
    intent.current = null;
    close();
    if (target) forgetRoomToken(target.code);
    setRoomInAddress(null);
    setView(null);
    setStatus("idle");
  }, [close]);

  const send = React.useCallback((message: ClientMessage) => {
    const ws = socket.current;
    // The host's new password, kept like one typed to join.
    const target = intent.current;
    if (target && message.t === "settings" && message.access?.password) {
      target.password = message.access.password;
      rememberRoomPassword(target.code, target.password);
    }
    if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(message));
  }, []);

  // Leaving the page leaves the room; its address goes with it. Only when
  // in one: a link's code stays for the page that hasn't joined yet.
  React.useEffect(
    () => () => {
      if (!intent.current) return;
      intent.current = null;
      close();
      setRoomInAddress(null);
    },
    [close]
  );

  return {
    status,
    view,
    receivedAt,
    error,
    session,
    create,
    join,
    rejoin,
    leave,
    send,
  };
}
